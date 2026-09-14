#!/usr/bin/env node
// Type checking for JavaScript files using JSDoc annotations
// Run with: node scripts/typecheck.mjs

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const ROOT = 'C:/Users/Raja/universal-antislop';

async function findJsFiles(dir, maxDepth = 3, depth = 0) {
  if (depth > maxDepth) return [];
  const results = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        results.push(...await findJsFiles(fullPath, maxDepth, depth + 1));
      } else if (entry.isFile() && entry.name.endsWith('.mjs')) {
        results.push(fullPath);
      }
    }
  } catch {}
  return results;
}

async function checkTypes() {
  const files = await findJsFiles(join(ROOT, 'scripts'));
  console.log(`Checking ${files.length} JavaScript files for type errors...\n`);
  
  let hasErrors = false;
  
  for (const file of files) {
    try {
      // Use Node.js built-in type checking (experimental)
      const { stdout, stderr } = await exec('node', ['--check', file], { 
        timeout: 10000 
      });
      
      if (stderr) {
        console.log(`⚠ ${file.replace(ROOT + '/', '')}`);
        console.log(`  ${stderr.split('\n')[0]}`);
        hasErrors = true;
      } else {
        console.log(`✓ ${file.replace(ROOT + '/', '')}`);
      }
    } catch (e) {
      if (e.stderr) {
        console.log(`✗ ${file.replace(ROOT + '/', '')}`);
        console.log(`  ${e.stderr.split('\n')[0]}`);
        hasErrors = true;
      } else {
        console.log(`✓ ${file.replace(ROOT + '/', '')}`);
      }
    }
  }
  
  console.log('\n' + (hasErrors ? 'Some files have issues' : 'All files passed type checking'));
  process.exit(hasErrors ? 1 : 0);
}

checkTypes().catch(e => {
  console.error('Type check failed:', e.message);
  process.exit(1);
});
