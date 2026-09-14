#!/usr/bin/env node
// Full security audit: npm audit + dependency check + secrets scan
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const exec = promisify(execFile);
const ROOT = 'C:/Users/Raja/universal-antislop';

async function findFiles(dir, ext, maxDepth = 3, depth = 0) {
  if (depth > maxDepth) return [];
  const results = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        results.push(...await findFiles(fullPath, ext, maxDepth, depth + 1));
      } else if (entry.isFile() && entry.name.endsWith(ext)) {
        results.push(fullPath);
      }
    }
  } catch {}
  return results;
}

async function runAudit() {
  console.log('=== Security Audit ===\n');
  
  // 1. npm audit
  console.log('1. npm audit');
  try {
    const { stdout } = await exec('npm', ['audit', '--json'], { cwd: ROOT, timeout: 30000 });
    const audit = JSON.parse(stdout);
    const vulnCount = audit.metadata?.vulnerabilities?.total || 0;
    console.log(`   ${vulnCount === 0 ? '✓' : '✗'} ${vulnCount} vulnerabilities found`);
    
    if (vulnCount > 0) {
      const { low, moderate, high, critical } = audit.metadata.vulnerabilities;
      if (critical > 0) console.log(`   ✗ ${critical} critical vulnerabilities`);
      if (high > 0) console.log(`   ✗ ${high} high vulnerabilities`);
      if (moderate > 0) console.log(`   ⚠ ${moderate} moderate vulnerabilities`);
      if (low > 0) console.log(`   ⚠ ${low} low vulnerabilities`);
    }
  } catch (e) {
    console.log('   ⚠ npm audit failed (may have vulnerabilities)');
  }
  
  // 2. Secrets scan
  console.log('\n2. Secrets scan');
  const secretsPatterns = [
    /sk-[A-Za-z0-9_-]{20,}/,
    /AKIA[A-Z0-9]{16}/,
    /password\s*[:=]\s*["']\S+/i,
    /token\s*[:=]\s*["']\S+/i,
    /secret\s*[:=]\s*["']\S+/i,
    /api[_-]?key\s*[:=]\s*["']\S+/i,
  ];
  
  const jsFiles = await findFiles(ROOT, '.mjs');
  const tsFiles = await findFiles(ROOT, '.ts');
  const allFiles = [...jsFiles, ...tsFiles];
  
  let secretsFound = 0;
  for (const file of allFiles) {
    try {
      const content = await readFile(file, 'utf8');
      for (const pattern of secretsPatterns) {
        if (pattern.test(content)) {
          secretsFound++;
          console.log(`   ✗ Possible secret in ${file.replace(ROOT + '/', '')}`);
        }
      }
    } catch {}
  }
  
  if (secretsFound === 0) {
    console.log('   ✓ No secrets found in source files');
  }
  
  // 3. Dependency check
  console.log('\n3. Dependency check');
  try {
    const { stdout } = await exec('npm', ['ls', '--json'], { cwd: ROOT, timeout: 30000 });
    const deps = JSON.parse(stdout);
    const depCount = Object.keys(deps.dependencies || {}).length;
    const devDepCount = Object.keys(deps.devDependencies || {}).length;
    console.log(`   ✓ ${depCount} dependencies, ${devDepCount} devDependencies`);
  } catch (e) {
    console.log('   ⚠ Could not list dependencies');
  }
  
  // 4. License check
  console.log('\n4. License check');
  try {
    const pkg = await readFile(join(ROOT, 'package.json'), 'utf8');
    const pkgJson = JSON.parse(pkg);
    console.log(`   ✓ License: ${pkgJson.license || 'not specified'}`);
  } catch {
    console.log('   ⚠ Could not read package.json');
  }
  
  console.log('\n=== Audit Complete ===');
}

runAudit().catch(e => {
  console.error('Audit failed:', e.message);
  process.exit(1);
});
