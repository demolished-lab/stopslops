import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const ROOT = "C:/Users/Raja/universal-antislop";
const exec = promisify(execFile);

describe('judge.mjs', () => {
  it('detects hedging density in thinking category', async () => {
    const testFile = join(ROOT, 'tests', 'thinking-edge-case.md');
    try {
      const { stdout } = await exec('node', ['./scripts/judge.mjs', '--category', 'thinking', '--file', testFile], { cwd: ROOT, timeout: 15000 });
      const result = JSON.parse(stdout);
      expect(result.category).toBe('thinking');
      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.findings.some(f => f.rule === 'R-47a')).toBe(true);
    } catch (err) {
      // Judge exits 1 on hard gate - still valid JSON in stdout
      const result = JSON.parse(err.stdout);
      expect(result.category).toBe('thinking');
      expect(result.findings.length).toBeGreaterThan(0);
    }
  });

  it('detects secrets in config category', async () => {
    const testFile = join(ROOT, 'tests', 'thinking-edge-case-2-secrets.md');
    try {
      const { stdout } = await exec('node', ['./scripts/judge.mjs', '--category', 'config', '--file', testFile], { cwd: ROOT, timeout: 15000 });
      expect.fail('should have thrown');
    } catch (err) {
      const result = JSON.parse(err.stdout);
      expect(result.category).toBe('config');
      expect(result.findings.some(f => f.rule === 'R-46' && f.severity === 3)).toBe(true);
    }
  });

  it('passes clean input', async () => {
    const testFile = join(ROOT, 'tests', 'clean.txt');
    const { stdout } = await exec('node', ['./scripts/judge.mjs', '--category', 'thinking', '--file', testFile], { cwd: ROOT, timeout: 15000 });
    const result = JSON.parse(stdout);
    expect(result.findings.length).toBe(0);
    expect(result.verdict).toContain('clean');
  });

  it('exits 1 on hard gate violation', async () => {
    const testFile = join(ROOT, 'tests', 'thinking-edge-case-2-secrets.md');
    try {
      await exec('node', ['./scripts/judge.mjs', '--category', 'config', '--file', testFile], { cwd: ROOT, timeout: 15000 });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err.code).toBe(1);
    }
  });

  it('outputs valid JSON', async () => {
    const testFile = join(ROOT, 'tests', 'thinking-edge-case.md');
    try {
      const { stdout } = await exec('node', ['./scripts/judge.mjs', '--category', 'thinking', '--file', testFile], { cwd: ROOT, timeout: 15000 });
      expect(() => JSON.parse(stdout)).not.toThrow();
    } catch (err) {
      // Hard gate violation exits 1, but stdout is still valid JSON
      expect(() => JSON.parse(err.stdout)).not.toThrow();
    }
  });
});
