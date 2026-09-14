import type { Context } from '@deepseek-ai/cordis';
import { antislopLintTool, antislopJudgeTool, antislopAuditTool } from './tools.js';

export const name = 'universal-antislop';
export const inject = ['tools'];

export function apply(ctx: Context){
  const tools: any = (ctx as any).tools;
  tools.register(antislopLintTool);
  tools.register(antislopJudgeTool);
  tools.register(antislopAuditTool);
}
