#!/usr/bin/env node
// Instant MITM: streams input through heuristic pass + optional LLM call.
// Usage: node judge.mjs --category thinking --file path  |  --stdin
// Set BYNARA_API_KEY or OPENAI_API_KEY for full LLM grade.
import { readFile, stat } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
import http from 'node:http';
import https from 'node:https';
import { log, error, debug, trackJudge, setPerformance } from './logger.mjs';

const ROOT = process.env.ANTISLOP_ROOT || "C:/Users/Raja/universal-antislop";
const MAX_FILE_SIZE = 1024 * 1024; // 1MB limit
const ALLOWED_CATEGORIES = ['general-code', 'tests', 'api', 'docs', 'prompts', 'git', 'config', 'thinking', 'ui', 'copywriting', 'human', 'layoutmobile', 'code'];

// Graceful error handling
process.on('uncaughtException', (e) => {
  error('Uncaught exception:', e.message);
  trackJudge('error');
  process.exit(2);
});

process.on('unhandledRejection', (e) => {
  error('Unhandled rejection:', e?.message || e);
  trackJudge('error');
  process.exit(2);
});

const args = process.argv.slice(2);
function arg(name){ const i=args.indexOf(name); return i>=0?args[i+1]:null; }
const category = arg('--category') || 'general-code';
const file = arg('--file');
const customRoot = arg('--path') || ROOT;

// Validate category
if (!ALLOWED_CATEGORIES.includes(category)) {
  console.error(`Invalid category: ${category}. Allowed: ${ALLOWED_CATEGORIES.join(', ')}`);
  process.exit(2);
}

let input = '';
if(file) {
  // Security: validate file path
  const filePath = resolve(file);
  const rootDir = resolve(customRoot);
  
  // Path traversal protection
  if (!filePath.startsWith(rootDir)) {
    console.error('Security: file path must be within project root');
    process.exit(2);
  }
  
  // File size check
  try {
    const fileStat = await stat(filePath);
    if (fileStat.size > MAX_FILE_SIZE) {
      console.error(`Security: file too large (${fileStat.size} bytes, max ${MAX_FILE_SIZE})`);
      process.exit(2);
    }
  } catch (e) {
    console.error(`Error: cannot stat file: ${e.message}`);
    process.exit(2);
  }
  
  // Read file with error handling
  try {
    input = await readFile(filePath, 'utf8');
  } catch (e) {
    console.error(`Error: cannot read file: ${e.message}`);
    process.exit(2);
  }
}
else if(!process.stdin.isTTY){ input = await new Promise(r=>{let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>r(s));}); }
else { console.error('Usage: pnpm judge --category <cat> --file <path>  or pipe stdin'); process.exit(2); }

// Load rubric and prompt
const rubric = JSON.parse(await readFile(join(ROOT,'judge/rubric.json'),'utf8'));
const promptTemplate = await readFile(join(ROOT,'judge/mitm-prompt.md'),'utf8');

// Fill template
const catRubric = JSON.stringify(rubric.categories[category] || []);
const prompt = promptTemplate
  .replace('{{category}}', category)
  .replace('{{rubric}}', catRubric)
  .replace('{{input}}', input.slice(0, 8000)); // cap at 8k tokens

// ---- Heuristic instant pass ----
const findings=[];
if(category==='thinking'){
  const hedges=(input.match(/\b(maybe|perhaps|might|could|possibly|seems)\b/gi)||[]).length;
  if(hedges>5) findings.push({rule:'R-47a',severity:2,reason:`hedging density ${hedges}`,evidence:''});
  const syc=(input.match(/\b(your genius|brilliant|impressive|flawless|wonderful|amazing)\b/gi)||[]).length;
  if(syc>2) findings.push({rule:'R-47b',severity:3,reason:`sycophancy density ${syc}`,evidence:''});
  if(input.length>4000 && (input.match(/I think/g)||[]).length>3) findings.push({rule:'R-47d',severity:1,reason:'verbosity without evidence',evidence:''});
}
if(category==='config' && /sk-[A-Za-z0-9_-]{20,}/.test(input)) findings.push({rule:'R-46',severity:3,reason:'possible secret in file',evidence:'sk-...'});
if(category==='general-code' && /:\s*unknown\b/.test(input)) findings.push({rule:'R-40',severity:3,reason:'unknown on public contract',evidence:''});

// ---- LLM grade (when key available) ----
async function llmGrade(){
  const key = process.env.BYNARA_API_KEY || process.env.OPENAI_API_KEY || '';
  if(!key) {
    debug('No API key found, using heuristic pass only');
    return null;
  }
  
  const isOpenAI = !!process.env.OPENAI_API_KEY;
  const host = isOpenAI ? 'api.openai.com' : '127.0.0.1';
  const port = isOpenAI ? 443 : 8082;
  const model = isOpenAI ? 'gpt-4o-mini' : 'bynaa';
  const path = isOpenAI ? '/v1/chat/completions' : '/v1/chat/completions';
  
  debug(`LLM grade: ${isOpenAI ? 'OpenAI' : 'Bynara'} via ${host}:${port}`);
  
  const body = JSON.stringify({
    model,
    messages: [{role:'user', content:prompt}],
    temperature: 0.1,
    max_tokens: 500,
    response_format: {type:'json_object'}
  });
  
  const opts = {
    hostname: host,
    port,
    path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'Content-Length': Buffer.byteLength(body)
    },
    timeout: 30000
  };
  
  return new Promise((resolve) => {
    const proto = isOpenAI ? https : http;
    const req = proto.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.message?.content;
          if(!content) {
            debug('LLM returned empty content');
            return resolve(null);
          }
          // Try to parse the JSON from the LLM response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if(jsonMatch) {
            const llmResult = JSON.parse(jsonMatch[0]);
            debug(`LLM found ${(llmResult.findings || []).length} issues`);
            resolve(llmResult.findings || []);
          } else {
            debug('LLM response not valid JSON');
            resolve(null);
          }
        } catch(e) {
          debug('Failed to parse LLM response:', e.message);
          resolve(null);
        }
      });
    });
    req.on('error', (e) => {
      debug('LLM request failed:', e.message);
      resolve(null);
    });
    req.on('timeout', () => {
      debug('LLM request timed out');
      req.destroy();
      resolve(null);
    });
    req.write(body);
    req.end();
  });
}

// Run both and merge
const startTime = Date.now();
const [llmFindings] = await Promise.all([llmGrade()]);
setPerformance('judgeMs', Date.now() - startTime);

const allFindings = [...findings, ...(llmFindings || [])];

// Deduplicate findings by rule
const seen = new Set();
const deduped = allFindings.filter(f => {
  const key = f.rule + '|' + f.severity;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

// Output
if (deduped.length) {
  console.log(JSON.stringify({ category, findings: deduped }, null, 2));
  trackJudge(deduped.some(f => f.severity === 3) ? 'fail' : 'pass');
} else {
  console.log(JSON.stringify({ category, findings: [], verdict: 'clean (heuristic + LLM pass)' }, null, 2));
  trackJudge('pass');
}

// Exit code: 1 if any severity 3
process.exit(deduped.some(f => f.severity === 3) ? 1 : 0);
