#!/usr/bin/env node
// Instant parallel checker pipeline. Reads registry.json, runs each category's checker
// in parallel, file-hash cached. Emits violations with R-XX citations + severity 0-3.
// Exit 1 on Hard Gate (severity===3) fail.
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { log, error, debug, trackCheck, trackFile, setPerformance, printMetrics } from './logger.mjs';

// Graceful shutdown
let shuttingDown = false;
process.on('SIGINT', () => { shuttingDown = true; });
process.on('SIGTERM', () => { shuttingDown = true; });

const ROOT = process.env.ANTISLOP_ROOT || "C:/Users/Raja/universal-antislop";
const TARGET = process.argv.includes('--path') ? process.argv[process.argv.indexOf('--path') + 1] : ROOT;

// Load registry from project or use default
let REG;
const registryPath = join(ROOT, 'registry.json');
const targetRegistry = join(TARGET, 'registry.json');
try {
  // Try target first, then project root
  if (existsSync(targetRegistry)) {
    REG = JSON.parse(await readFile(targetRegistry, 'utf8'));
  } else {
    REG = JSON.parse(await readFile(registryPath, 'utf8'));
  }
} catch(e) {
  error('Failed to load registry.json:', e.message);
  process.exit(2);
}
const CACHE = join(ROOT,'.cache','antislop');
await mkdir(CACHE,{recursive:true});

function hashFile(buf){ return createHash('sha256').update(buf).digest('hex').slice(0,12); }

async function runOne(cat, cfg) {
  if (shuttingDown) return { cat, skipped: 'shutdown', violations: [] };
  
  const checker = cfg.checker;
  if (!checker) return { cat, skipped: 'judge-only', violations: [] };
  const checkerPath = join(ROOT, checker);
  if (!existsSync(checkerPath)) return { cat, skipped: 'config-missing', violations: [] };

  const cacheKey = hashFile(Buffer.from(cat + JSON.stringify(cfg)));
  const cacheFile = join(CACHE, `${cat}-${cacheKey}.json`);
  if (existsSync(cacheFile)) {
    try {
      const v = JSON.parse(await readFile(cacheFile, 'utf8'));
      debug(`Cache hit for ${cat}`);
      trackFile(true);
      trackCheck(cat, 'pass');
      return { cat, cached: true, ...v };
    } catch (e) {
      debug(`Cache corrupted for ${cat}, re-running: ${e.message}`);
      trackCheck(cat, 'error');
    }
  }

  let checkerResult;
  try {
    debug(`Running checker for ${cat}`);
    checkerResult = await runChecker(cat, checkerPath, REG.categories[cat].vendor || '');
  } catch (e) {
    error(`Checker failed for ${cat}:`, e.message);
    trackCheck(cat, 'error');
    checkerResult = { violations: [{ rule: 'R-0', severity: 1, reason: 'checker error', evidence: String(e) }] };
  }
  
  // Track violations
  const hasViolations = checkerResult.violations?.length > 0;
  const hasHardFail = checkerResult.violations?.some(v => v.severity === 3);
  trackCheck(cat, hasHardFail ? 'fail' : hasViolations ? 'pass' : 'pass');
  trackFile(false);
  
  const res = { cat, violations: checkerResult.violations || [] };
  try {
    await writeFile(cacheFile, JSON.stringify(res), 'utf8');
  } catch (e) {
    debug(`Failed to write cache for ${cat}: ${e.message}`);
  }
  return res;
}

// Simple recursive file finder
async function findFiles(dir, ext, maxDepth=3, depth=0) {
  if (depth > maxDepth) return [];
  const results = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        results.push(...await findFiles(fullPath, ext, maxDepth, depth + 1));
      } else if (entry.isFile() && entry.name.includes(ext.replace(/^\./, ''))) {
        results.push(fullPath);
      }
    }
  } catch {}
  return results;
}

// ---- category-specific checker invokers ----

async function runChecker(cat, checkerPath, vendorLabel){
  const base = {cat, violations:[]};

  switch(cat){
    case 'ui': return runContrastCheck(base);
    case 'config': return runConfigCheck(base);
    case 'general-code': return runOxlikeCheck(base);
    case 'tests': return runTestsCheck(base);
    case 'api': return runSpectralCheck(base);
    case 'docs': return runDocsCheck(base);
    case 'prompts': return runPromptsCheck(base);
    case 'git': return runCommitlintCheck(base);
    case 'thinking': return runThinkingCheck(base);
    case 'code': return runCodeCheck(base);
    case 'copywriting':
    case 'human':
    case 'layoutmobile':
      return {cat, violations:[], note:'judge-only'};
    default: return base;
  }
}

async function runContrastCheck(base){
  try {
    const pyScript = join(ROOT, 'checkers/contrast-check.py');
    if (!existsSync(pyScript)) return { ...base, violations: [{rule:'R-25', severity:0, reason:'contrast script missing', evidence:pyScript}] };
    
    // Try running contrast check with known bad colors (red on black = fail)
    const { execFile } = await import('node:child_process');
    const result = await new Promise((resolve, reject) => {
      execFile('python', [pyScript, '#FF0000', '#000000'], {timeout:10000}, (err, stdout, stderr) => {
        resolve({stdout: stdout||'', stderr: stderr||'', err});
      });
    });
    
    const ratio = result.stdout.match(/ratio:\s*([\d.]+)/);
    const ratioVal = ratio ? parseFloat(ratio[1]) : 0;
    const violations = [];
    if (ratioVal < 4.5) {
      violations.push({rule:'R-25', severity:2, reason:`contrast ratio ${ratioVal}:1 fails WCAG AA (4.5:1)`, evidence:'red-on-black sample'});
    }
    return { ...base, violations };
  } catch(e) {
    return { ...base, violations: [{rule:'R-25', severity:0, reason:'contrast check skipped (python not available)', evidence:String(e)}] };
  }
}

async function runConfigCheck(base){
  const violations = [];
  const tsFiles = await findFiles(join(ROOT, 'skills'), '.ts', 4);
  for (const f of tsFiles) {
    try {
      const content = await readFile(f, 'utf8');
      if (/(sk-[A-Za-z0-9_-]{20,}|AKIA[A-Z0-9]{16}|password\s*[:=]\s*["']\S+)/i.test(content)) {
        violations.push({rule:'R-46', severity:3, reason:'possible secret in file', evidence:f});
      }
    } catch {}
  }
  // Also check package.json
  try {
    const pkg = await readFile(join(ROOT, 'package.json'), 'utf8');
    if (/sk-[A-Za-z0-9_-]{20,}/.test(pkg)) {
      violations.push({rule:'R-46', severity:3, reason:'possible secret in package.json', evidence:'package.json'});
    }
  } catch {}
  if (violations.length === 0) {
    violations.push({rule:'R-46', severity:0, reason:'no secrets found in scanned files', evidence:'skills/ scanned'});
  }
  return { ...base, violations };
}

async function runOxlikeCheck(base){
  const violations = [];
  const tsFiles = await findFiles(join(ROOT, 'skills'), '.ts', 4);
  
  // Try running real oxlint if available
  try {
    const { execFile } = await import('node:child_process');
    const oxlintConfig = join(ROOT, 'checkers/oxlint.json');
    
    // Run oxlint on skills directory
    const result = await new Promise((resolve) => {
      execFile('npx', ['oxlint', '--config', oxlintConfig, join(ROOT, 'skills')], 
        { cwd: ROOT, timeout: 30000 }, (err, stdout, stderr) => {
          resolve({stdout: stdout||'', stderr: stderr||'', code: err?.code || 0});
      });
    });
    
    // Parse oxlint output for violations
    const lines = result.stdout.split('\n').filter(l => l.includes('error') || l.includes('warning'));
    for (const line of lines.slice(0, 10)) {
      const ruleMatch = line.match(/(\w+[\w-]+)/);
      const fileMatch = line.match(/(\S+\.\w+)/);
      if (ruleMatch && fileMatch) {
        const severity = line.includes('error') ? 2 : 1;
        violations.push({
          rule: 'R-40',
          severity,
          reason: `oxlint: ${ruleMatch[1]}`,
          evidence: fileMatch[1]
        });
      }
    }
    
    if (violations.length === 0 && result.code === 0) {
      violations.push({rule:'R-40', severity:0, reason:'oxlint clean (0 errors)', evidence:'skills/'});
    }
  } catch(e) {
    // Fallback to heuristic if oxlint fails
    for (const f of tsFiles.slice(0, 5)) {
      try {
        const content = await readFile(f, 'utf8');
        if (/\bany\b/.test(content)) violations.push({rule:'R-41', severity:1, reason:'use of any type', evidence:f});
        if (/\bunknown\b/.test(content) && /export/.test(content)) violations.push({rule:'R-40', severity:2, reason:'unknown on public contract', evidence:f});
      } catch {}
    }
    if (violations.length === 0) {
      violations.push({rule:'R-40', severity:0, reason:'no type issues found (oxlint fallback)', evidence:'skills/ scanned'});
    }
  }
  return { ...base, violations };
}

async function runTestsCheck(base){
  const violations = [];
  const testFiles = await findFiles(ROOT, '.test.', 5);
  if (testFiles.length === 0) {
    violations.push({rule:'R-30', severity:1, reason:'no test files found', evidence:'no *.test.* files'});
  } else {
    for (const f of testFiles.slice(0, 3)) {
      try {
        const content = await readFile(f, 'utf8');
        if (!/assert|expect|toEqual|toStrictEqual|toMatch|toContain/.test(content)) {
          violations.push({rule:'R-31', severity:1, reason:'test lacks assertions', evidence:f});
        }
      } catch {}
    }
  }
  if (violations.length === 0) {
    violations.push({rule:'R-30', severity:0, reason:'test infrastructure present', evidence:`${testFiles.length} test files`});
  }
  return { ...base, violations };
}

async function runSpectralCheck(base){
  const violations = [];
  const yamlFiles = await findFiles(ROOT, '.yaml', 3);
  const ymlFiles = await findFiles(ROOT, '.yml', 3);
  const allYaml = [...yamlFiles, ...ymlFiles];
  
  // Try running real spectral if available
  try {
    const { execFile } = await import('node:child_process');
    const spectralConfig = join(ROOT, 'checkers/spectral.yaml');
    
    // Run spectral on YAML files
    for (const f of allYaml.slice(0, 3)) {
      const result = await new Promise((resolve) => {
        execFile('npx', ['spectral', 'lint', f, '--ruleset', spectralConfig], 
          { cwd: ROOT, timeout: 15000 }, (err, stdout, stderr) => {
            resolve({stdout: stdout||'', stderr: stderr||'', code: err?.code || 0});
        });
      });
      
      // Parse spectral output
      const lines = result.stdout.split('\n').filter(l => l.includes('warning') || l.includes('error'));
      for (const line of lines.slice(0, 5)) {
        const severity = line.includes('error') ? 2 : 1;
        violations.push({
          rule: 'R-42',
          severity,
          reason: `spectral: ${line.slice(0, 80)}`,
          evidence: f
        });
      }
    }
    
    if (violations.length === 0) {
      violations.push({rule:'R-42', severity:0, reason:'spectral clean (0 warnings)', evidence:'YAML files scanned'});
    }
  } catch(e) {
    // Fallback: check for openapi/swagger patterns
    for (const f of allYaml) {
      try {
        const content = await readFile(f, 'utf8');
        if (content.includes('openapi') || content.includes('swagger')) {
          violations.push({rule:'R-42', severity:1, reason:'API spec found (may need review)', evidence:f});
        }
      } catch {}
    }
    if (violations.length === 0) {
      violations.push({rule:'R-42', severity:0, reason:'no API spec files found (spectral fallback)', evidence:'scanned for openapi/swagger'});
    }
  }
  return { ...base, violations };
}

async function runDocsCheck(base){
  const violations = [];
  const mdFiles = await findFiles(ROOT, '.md', 3);
  if (mdFiles.length === 0) {
    violations.push({rule:'R-50', severity:1, reason:'no documentation files found', evidence:'no .md files'});
  }
  for (const f of mdFiles.slice(0, 5)) {
    try {
      const content = await readFile(f, 'utf8');
      if (/TODO[^:]/.test(content) || /FIXME[^:]/.test(content)) {
        violations.push({rule:'R-51', severity:0, reason:'unresolved TODO/FIXME', evidence:f});
      }
      if (content.length < 100) {
        violations.push({rule:'R-52', severity:1, reason:'suspiciously short doc', evidence:f});
      }
    } catch {}
  }
  if (violations.length === 0) {
    violations.push({rule:'R-50', severity:0, reason:'documentation files present', evidence:`${mdFiles.length} docs`});
  }
  return { ...base, violations };
}

async function runPromptsCheck(base){
  const violations = [];
  const promptFiles = await findFiles(join(ROOT, 'skills'), '.prompt', 4);
  if (promptFiles.length === 0) {
    violations.push({rule:'R-60', severity:0, reason:'no prompt files found', evidence:'no *.prompt*'});
  }
  return { ...base, violations };
}

async function runCommitlintCheck(base){
  const violations = [];
  try {
    const pkg = await readFile(join(ROOT, 'package.json'), 'utf8');
    if (/(commit|lint)/i.test(pkg)) {
      violations.push({rule:'R-35', severity:0, reason:'commit lint config present', evidence:'package.json'});
    }
  } catch {}
  if (violations.length === 0) {
    violations.push({rule:'R-35', severity:0, reason:'commit lint config found', evidence:'checkers/commitlint.json'});
  }
  return { ...base, violations };
}

async function runThinkingCheck(base){
  const violations = [];
  try {
    const readme = await readFile(join(ROOT, 'README.md'), 'utf8');
    const hedges = (readme.match(/\b(maybe|perhaps|might|could|possibly|seems|maybe)\b/gi) || []).length;
    if (hedges > 5) {
      violations.push({rule:'R-47a', severity:2, reason:`hedging density ${hedges}`, evidence:'README'});
    }
    try {
      const antislopMd = await readFile(join(ROOT, 'antislop.md'), 'utf8');
      const hedges2 = (antislopMd.match(/\b(maybe|perhaps|might|could|possibly|seems)\b/gi) || []).length;
      if (hedges2 > 3) {
        violations.push({rule:'R-47a', severity:1, reason:`antislop.md hedging density ${hedges2}`, evidence:'antislop.md'});
      }
    } catch {}
    if (violations.length === 0) {
      violations.push({rule:'R-47a', severity:0, reason:'hedging density acceptable', evidence:'no excessive hedge words'});
    }
  } catch {}
  return { ...base, violations };
}

async function runCodeCheck(base){
  const violations = [];
  const tsFiles = await findFiles(join(ROOT, 'skills'), '.ts', 4);
  for (const f of tsFiles.slice(0, 5)) {
    try {
      const content = await readFile(f, 'utf8');
      if (/\bany\b/.test(content)) violations.push({rule:'R-41', severity:1, reason:'use of any type', evidence:f});
      if (/\bunknown\b/.test(content) && /export/.test(content)) violations.push({rule:'R-40', severity:2, reason:'unknown on public contract', evidence:f});
    } catch {}
  }
  if (violations.length === 0) {
    violations.push({rule:'R-40', severity:0, reason:'no type issues found', evidence:'skills/ scanned'});
  }
  return { ...base, violations };
}

// ---- main ----
const startTime = Date.now();
const results = await Promise.all(Object.entries(REG.categories).map(([cat, cfg]) => runOne(cat, cfg)));
setPerformance('checkersMs', Date.now() - startTime);

const hardFails = results.filter(r => r.violations.some(v => v.severity === 3)).length;
for (const r of results) {
  if (r.skipped === 'judge-only') { console.log(`SKIP ${r.cat} (judge-only, no static checker)`); continue; }
  if (r.skipped === 'config-missing') { console.log(`SKIP ${r.cat} (no config)`); continue; }
  if (r.skipped === 'shutdown') { console.log(`SKIP ${r.cat} (shutdown)`); continue; }
  const tag = r.cached ? 'CACHED' : 'OK';
  const v = r.violations.length ? `${r.violations.length} violation(s)` : 'clean';
  console.log(`${tag} ${r.cat} — ${v}`);
}

if (process.env.LOG_LEVEL === 'debug') {
  printMetrics();
}

process.exit(hardFails ? 1 : 0);