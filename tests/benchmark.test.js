import { describe, it, expect } from 'vitest';
import { performance } from 'perf_hooks';
import { mkdtemp, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { execSync } from 'child_process';

describe('performance', () => {
  it('judge runs under 2 seconds', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'antislop-bench-'));
    const testFile = join(tempDir, 'test.js');
    await writeFile(testFile, `
      function processUser(user) {
        const validated = validate(user);
        const transformed = transform(validated);
        return save(transformed);
      }
    `);

    try {
      const start = performance.now();
      execSync(
        `node ./scripts/judge.mjs --category general-code --file "${testFile}" --path "${tempDir}"`,
        { cwd: process.cwd(), encoding: 'utf8' }
      );
      const duration = performance.now() - start;
      console.log(`Judge duration: ${Math.round(duration)}ms`);
      expect(duration).toBeLessThan(2000);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('checkers run under 5 seconds', async () => {
    const start = performance.now();
    execSync('node ./scripts/run-checkers.mjs', {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const duration = performance.now() - start;
    console.log(`Checkers duration: ${Math.round(duration)}ms`);
    expect(duration).toBeLessThan(5000);
  });

  it('full pipeline runs under 10 seconds', async () => {
    const start = performance.now();
    execSync('node ./scripts/run-checkers.mjs', {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const duration = performance.now() - start;
    console.log(`Full pipeline duration: ${Math.round(duration)}ms`);
    expect(duration).toBeLessThan(10000);
  });
});
