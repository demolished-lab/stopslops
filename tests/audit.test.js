import { describe, it, expect } from 'vitest';
import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const ROOT = "C:/Users/Raja/universal-antislop";
const exec = promisify(execFile);

describe('audit.mjs', () => {
  it('creates anti-slop directory and audit file', async () => {
    const antiSlopDir = join(ROOT, 'anti-slop');
    await mkdir(antiSlopDir, { recursive: true });
    
    const { stdout } = await exec('node', ['./scripts/audit.mjs'], { cwd: ROOT, timeout: 15000 });
    expect(stdout).toContain('wrote');
    
    // Check that audit file was created
    const today = new Date().toISOString().slice(0, 10);
    const auditFile = join(antiSlopDir, `audit-${today}.md`);
    expect(existsSync(auditFile)).toBe(true);
    
    // Check file content
    const content = await readFile(auditFile, 'utf8');
    expect(content).toContain('Anti-slop audit');
    expect(content).toContain('R-XX');
  });

  it('audit file contains expected format', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const auditFile = join(ROOT, 'anti-slop', `audit-${today}.md`);
    if (existsSync(auditFile)) {
      const content = await readFile(auditFile, 'utf8');
      expect(content).toContain('Anti-slop audit');
      expect(content).toContain('R-XX');
    }
  });
});
