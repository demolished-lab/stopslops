import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = "C:/Users/Raja/universal-antislop";

describe('smoke tests', () => {
  it('registry.json has all categories', async () => {
    const reg = JSON.parse(await readFile(join(ROOT, 'registry.json'), 'utf8'));
    expect(reg.categories).toBeDefined();
    expect(Object.keys(reg.categories).length).toBe(13);
  });

  it('antislop.md exists and has quality guidelines', async () => {
    const content = await readFile(join(ROOT, 'antislop.md'), 'utf8');
    expect(content).toContain('Quality');
    expect(content).toContain('flexible');
    expect(content.length).toBeGreaterThan(100);
  });

  it('judge rubric has all categories', async () => {
    const rubric = JSON.parse(await readFile(join(ROOT, 'judge/rubric.json'), 'utf8'));
    expect(rubric.categories).toBeDefined();
    expect(Object.keys(rubric.categories).length).toBeGreaterThan(5);
  });
});
