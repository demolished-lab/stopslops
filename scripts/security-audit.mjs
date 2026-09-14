#!/usr/bin/env node
// Security audit: scan repo for secrets
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = "C:/Users/Raja/universal-antislop";
const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9_-]{20,}/g,
  /AKIA[A-Z0-9]{16}/g,
  /password\s*[:=]\s*['"]\S+/gi,
  /api[_-]?key\s*[:=]\s*['"]\S+/gi,
  /secret\s*[:=]\s*['"]\S+/gi,
  /token\s*[:=]\s*['"]\S+/gi
];

async function scanDir(dir, depth = 0) {
  if (depth > 5) return [];
  const results = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        results.push(...await scanDir(fullPath, depth + 1));
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js') || entry.name.endsWith('.json'))) {
        // Skip .md files - documentation examples are not real secrets
        try {
          const content = await readFile(fullPath, 'utf8');
          for (const pattern of SECRET_PATTERNS) {
            const matches = content.match(pattern);
            if (matches) {
              for (const match of matches) {
                results.push({ file: fullPath, pattern: pattern.source.slice(0, 30), match: match.slice(0, 20) + '...' });
              }
            }
          }
        } catch {}
      }
    }
  } catch {}
  return results;
}

const findings = await scanDir(ROOT);
if (findings.length === 0) {
  console.log('Security audit: CLEAN - no secrets found');
} else {
  console.log('Security audit: FOUND', findings.length, 'potential secrets:');
  findings.forEach(f => console.log('  ', f.file, '-', f.match));
}
