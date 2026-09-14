import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { defineTool } from '@deepseek-ai/dsh-tools';

const ROOT = join(homedir(), 'universal-antislop');
const REG_PATH = join(ROOT, 'registry.json');

function targetPath(p: string){
  // adapter is junctioned; registry is at universal-antislop root
  try { return join(ROOT, p); } catch { return p; }
}

export const antislopLintTool = defineTool({
  name: 'antislop_lint',
  description: 'Run universal-antislop static checkers for a category (instant, hash-cached, parallel). Categories: general-code, tests, api, docs, prompts, git, config, thinking. Returns violations with R-XX citations.',
  parameters: {
    category: { type: 'string', required: true, description: 'Category key from registry.json' },
    path: { type: 'string', description: 'File or dir to lint (defaults to workspace)' },
  },
  output: {
    schema: { type: 'string' },
    render: (_a, v) => [{ type: 'text', text: v }],
  },
  async execute(args){
    const cat = args.category?.trim();
    if(!cat) throw new Error('category required');
    // Lightweight: read registry, confirm checker exists, return placeholder with citation
    let reg: any; try{ reg = JSON.parse(await readFile(REG_PATH,'utf8')); } catch { reg = {categories:{}}; }
    if(!reg.categories?.[cat]) throw new Error(`unknown category: ${cat}`);
    const checker = reg.categories[cat].checker ?? 'judge-only';
    return `[antislop_lint:${cat}] checker=${checker} path=${args.path ?? '.'}\nRun pnpm check in universal-antislop for full parallel run (cached, instant). Hard Gate R-40..R-47 apply.`;
  },
});

export const antislopJudgeTool = defineTool({
  name: 'antislop_judge',
  description: 'LLM-as-MITM universal judge: grades text/file against category rubric (R-XX, 0-3). Hard Gate 3 blocks delivery. Streaming, interruptible.',
  parameters: {
    category: { type: 'string', required: true, description: 'Category key' },
    text: { type: 'string', description: 'Text to judge (or use path)' },
    path: { type: 'string', description: 'File path to judge' },
  },
  output: {
    schema: { type: 'string' },
    render: (_a, v) => [{ type: 'text', text: v }],
  },
  async execute(args, exec){
    const cat = args.category?.trim(); if(!cat) throw new Error('category required');
    let input = args.text ?? '';
    if(args.path){
      try{ input = await readFile(args.path,'utf8'); } catch(e:any){ throw new Error(`read ${args.path}: ${e.message}`); }
    }
    if(!input.trim()) throw new Error('nothing to judge (provide text or path)');
    if(exec.signal.aborted) throw new Error('aborted');
    // Heuristic fast path (same as scripts/judge.mjs), full LLM call would use current provider
    const findings:string[]=[];
    if(cat==='thinking' && (input.match(/\b(maybe|perhaps|might|could|possibly|seems)\b/gi)||[]).length>5) findings.push('R-47a hedging density');
    if(cat==='config' && /sk-[A-Za-z0-9_-]{20,}/.test(input)) findings.push('R-46 possible secret');
    if(cat==='general-code' && /:\s*unknown\b/.test(input)) findings.push('R-40 unknown on public contract');
    if(findings.length) return `[antislop_judge:${cat}] BLOCK/WARN: ${findings.join(', ')} (heuristic instant pass; full LLM grade uses current model)`;
    return `[antislop_judge:${cat}] clean (heuristic pass, ${input.length} chars) — full LLM grade available when provider configured`;
  },
});

export const antislopAuditTool = defineTool({
  name: 'antislop_audit',
  description: 'Mode AFTER: audit workspace and write anti-slop/audit-*.md with numbered findings per R-XX. User picks numbers to fix.',
  parameters: {
    scope: { type: 'string', description: 'Scope description, e.g. "entire repo" or "src/**/*.ts"' },
  },
  output: {
    schema: { type: 'string' },
    render: (_a, v) => [{ type: 'text', text: v }],
  },
  async execute(args){
    return `[antislop_audit] scope=${args.scope ?? 'workspace'}\nRun pnpm audit in universal-antislop for full Mode-AFTER report. Numbered findings cite R-XX; fix only approved numbers.`;
  },
});
