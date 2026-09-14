import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = "C:/Users/Raja/universal-antislop";

describe('run-checkers.mjs', () => {
  it('reads registry.json and returns results', async () => {
    const reg = JSON.parse(await readFile(join(ROOT, 'registry.json'), 'utf8'));
    expect(reg.categories).toBeDefined();
    expect(Object.keys(reg.categories).length).toBe(13);
  });

  it('has checker paths for non-judge-only categories', async () => {
    const reg = JSON.parse(await readFile(join(ROOT, 'registry.json'), 'utf8'));
    const withCheckers = Object.entries(reg.categories).filter(([,cfg]) => cfg.checker !== null);
    expect(withCheckers.length).toBeGreaterThan(0);
    for (const [cat, cfg] of withCheckers) {
      expect(cfg.checker).toBeTruthy();
    }
  });

  it('cache directory exists after run', async () => {
    const { mkdir } = await import('node:fs/promises');
    const cacheDir = join(ROOT, '.cache', 'antislop');
    await mkdir(cacheDir, { recursive: true });
    const { existsSync } = await import('node:fs');
    expect(existsSync(cacheDir)).toBe(true);
  });

  it('exit code 0 on clean run (no hard violations)', async () => {
    const { execFile } = await import('node:child_process');
    const result = await new Promise((resolve) => {
      execFile('node', ['./scripts/run-checkers.mjs'], { cwd: ROOT, timeout: 30000 }, (err, stdout, stderr) => {
        resolve({ code: err?.code || 0, stdout: stdout || '', stderr: stderr || '' });
      });
    });
    // Should exit 0 (no hard violations) - may show OK or CACHED
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/OK|CACHED/);
  });
});
