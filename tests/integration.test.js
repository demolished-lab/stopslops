import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { mkdtemp, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

describe('integration', () => {
  it('runs on a minimal JavaScript file', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'antislop-test-'));
    const testFile = join(tempDir, 'test.js');
    await writeFile(testFile, 'function add(a, b) { return a + b; }');

    try {
      const result = execSync(
        `node ./scripts/judge.mjs --category general-code --file "${testFile}" --path "${tempDir}"`,
        { cwd: process.cwd(), encoding: 'utf8' }
      );
      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty('category');
      expect(parsed).toHaveProperty('verdict');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('runs on a markdown file', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'antislop-test-'));
    const testFile = join(tempDir, 'test.md');
    await writeFile(testFile, '# Hello World\n\nThis is a test document.');

    try {
      const result = execSync(
        `node ./scripts/judge.mjs --category docs --file "${testFile}" --path "${tempDir}"`,
        { cwd: process.cwd(), encoding: 'utf8' }
      );
      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty('category');
      expect(parsed).toHaveProperty('verdict');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('runs checkers on a real project directory', () => {
    const result = execSync('node ./scripts/run-checkers.mjs', {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain('ui');
    expect(result).toContain('general-code');
  });
});
