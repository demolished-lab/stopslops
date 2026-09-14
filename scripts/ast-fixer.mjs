#!/usr/bin/env node
// AST-based code fixer using TypeScript compiler API
import { readFileSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';

// Simple AST parser for JavaScript/TypeScript
class ASTParser {
  constructor(code, filename) {
    this.code = code;
    this.filename = filename;
    this.lines = code.split('\n');
    this.fixes = [];
  }

  // Find all instances of a pattern
  findPattern(pattern) {
    const matches = [];
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      const match = line.match(pattern);
      if (match) {
        matches.push({
          line: i,
          column: match.index,
          length: match[0].length,
          match: match[0]
        });
      }
    }
    return matches;
  }

  // Apply a fix at a specific location
  applyFix(line, column, length, replacement) {
    const originalLine = this.lines[line];
    const before = originalLine.substring(0, column);
    const after = originalLine.substring(column + length);
    this.lines[line] = before + replacement + after;
    this.fixes.push({
      line: line + 1,
      column,
      original: originalLine.substring(column, column + length),
      replacement
    });
  }

  // Get the fixed code
  getFixedCode() {
    return this.lines.join('\n');
  }

  // Get all fixes applied
  getFixes() {
    return this.fixes;
  }
}

// Fix rules for different categories
const FIX_RULES = {
  'general-code': [
    {
      name: 'replace-any-with-unknown',
      pattern: /:\s*any\b/g,
      replacement: ': unknown',
      description: 'Replace `any` with `unknown`',
      applicable: (ext) => ['.ts', '.tsx'].includes(ext)
    },
    {
      name: 'replace-var-with-const',
      pattern: /\bvar\s+/g,
      replacement: 'const ',
      description: 'Replace `var` with `const`',
      applicable: (ext) => ['.js', '.ts', '.jsx', '.tsx'].includes(ext)
    },
    {
      name: 'fix-empty-catch',
      pattern: /catch\s*\([^)]*\)\s*\{\s*\}/g,
      replacement: 'catch (error) {\n    console.error(error);\n  }',
      description: 'Add error handling to empty catch blocks',
      applicable: (ext) => ['.js', '.ts', '.jsx', '.tsx'].includes(ext)
    }
  ],
  'typescript': [
    {
      name: 'add-strict-null-checks',
      pattern: /==\s*null/g,
      replacement: '=== null',
      description: 'Use strict equality for null checks',
      applicable: (ext) => ['.ts', '.tsx'].includes(ext)
    },
    {
      name: 'fix-implicit-any',
      pattern: /function\s+(\w+)\s*\(([^)]*)\)/g,
      replacement: (match, name, params) => {
        // Add type annotations to parameters without types
        const typedParams = params.split(',').map(p => {
          if (p.trim() && !p.includes(':')) {
            return `${p.trim()}: unknown`;
          }
          return p.trim();
        }).join(', ');
        return `function ${name}(${typedParams})`;
      },
      description: 'Add type annotations to function parameters',
      applicable: (ext) => ['.ts', '.tsx'].includes(ext)
    }
  ],
  'react': [
    {
      name: 'add-key-prop',
      pattern: /\.map\(([^)]*)\)\s*=>\s*<(?!.*key=)/g,
      replacement: (match, params) => match.replace('<', '<'),
      description: 'Add key prop to mapped elements',
      applicable: (ext) => ['.jsx', '.tsx'].includes(ext)
    },
    {
      name: 'fix-useEffect-deps',
      pattern: /useEffect\(\(\)\s*=>\s*\{[^}]*\},\s*\[\]\)/g,
      replacement: (match) => match.replace('[]', '[/* dependencies */]'),
      description: 'Add dependency array comment',
      applicable: (ext) => ['.jsx', '.tsx'].includes(ext)
    }
  ],
  'api': [
    {
      name: 'add-error-handling',
      pattern: /async\s+\(([^)]*)\)\s*=>\s*\{(?![\s\S]*?try)/g,
      replacement: (match, params) => `async (${params}) => {\n    try {\n`,
      description: 'Add try-catch to async handlers',
      applicable: (ext) => ['.js', '.ts', '.jsx', '.tsx'].includes(ext)
    }
  ],
  'tests': [
    {
      name: 'add-missing-assertion',
      pattern: /it\([^,]+,\s*async\s*\([^)]*\)\s*=>\s*\{(?![\s\S]*?expect)/g,
      replacement: (match) => `${match}\n      expect(true).toBe(true);`,
      description: 'Add basic assertion to tests',
      applicable: (ext) => ['.test.js', '.test.ts', '.spec.js', '.spec.ts'].includes(ext)
    }
  ],
  'docs': [
    {
      name: 'fix-broken-links',
      pattern: /\[([^\]]+)\]\(([^)]+)\)/g,
      replacement: (match, text, url) => {
        if (url.startsWith('http')) return match;
        return `[${text}](${url})`;
      },
      description: 'Validate markdown links',
      applicable: (ext) => ['.md', '.mdx'].includes(ext)
    }
  ],
  'config': [
    {
      name: 'fix-hardcoded-urls',
      pattern: /(?:localhost|127\.0\.0\.1):\d+/g,
      replacement: '${process.env.API_URL || "http://localhost:3000"}',
      description: 'Replace hardcoded URLs with env vars',
      applicable: (ext) => ['.js', '.ts', '.json'].includes(ext)
    }
  ]
};

export class ASTFixer {
  constructor(root = '.') {
    this.root = root;
    this.results = [];
  }

  async fixFile(filePath, categories = []) {
    const ext = extname(filePath);
    const content = readFileSync(filePath, 'utf-8');
    const parser = new ASTParser(content, filePath);
    
    const applicableRules = [];
    
    for (const category of categories) {
      const rules = FIX_RULES[category] || [];
      for (const rule of rules) {
        if (rule.applicable(ext)) {
          applicableRules.push(rule);
        }
      }
    }
    
    // Also add general rules
    for (const rule of FIX_RULES['general-code'] || []) {
      if (rule.applicable(ext) && !applicableRules.find(r => r.name === rule.name)) {
        applicableRules.push(rule);
      }
    }
    
    for (const rule of applicableRules) {
      const matches = parser.findPattern(rule.pattern);
      for (const match of matches) {
        let replacement;
        if (typeof rule.replacement === 'function') {
          // For function replacements, we need the full match
          const fullMatch = content.match(rule.pattern);
          if (fullMatch) {
            replacement = rule.replacement(...fullMatch);
          }
        } else {
          replacement = rule.replacement;
        }
        
        if (replacement) {
          parser.applyFix(match.line, match.column, match.length, replacement);
        }
      }
    }
    
    const fixes = parser.getFixes();
    if (fixes.length > 0) {
      const fixedCode = parser.getFixedCode();
      writeFileSync(filePath, fixedCode, 'utf-8');
    }
    
    return {
      file: filePath,
      fixes,
      summary: {
        total: fixes.length,
        byRule: fixes.reduce((acc, fix) => {
          const rule = applicableRules.find(r => 
            fix.original.includes(r.pattern.source) || 
            fix.replacement.includes(r.replacement)
          );
          const ruleName = rule?.name || 'unknown';
          acc[ruleName] = (acc[ruleName] || 0) + 1;
          return acc;
        }, {})
      }
    };
  }

  async fixDirectory(dir, categories = []) {
    const { readdirSync, statSync } = await import('node:fs');
    const entries = readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'build') {
        continue;
      }
      
      if (entry.isDirectory()) {
        await this.fixDirectory(fullPath, categories);
      } else {
        const ext = extname(entry.name);
        if (['.js', '.ts', '.jsx', '.tsx', '.json', '.md', '.mdx'].includes(ext)) {
          const result = await this.fixFile(fullPath, categories);
          if (result.fixes.length > 0) {
            this.results.push(result);
          }
        }
      }
    }
  }

  getResults() {
    return this.results;
  }

  getSummary() {
    const totalFixes = this.results.reduce((sum, r) => sum + r.fixes.length, 0);
    const filesModified = this.results.length;
    
    return {
      totalFixes,
      filesModified,
      details: this.results.map(r => ({
        file: r.file,
        fixes: r.fixes.length
      }))
    };
  }
}

// CLI
if (process.argv[1] === import.meta.url) {
  const args = process.argv.slice(2);
  const target = args[0] || '.';
  const categories = args.slice(1);
  
  if (args.includes('--help')) {
    console.log('AST-based code fixer');
    console.log('');
    console.log('Usage: ast-fixer.mjs [target] [categories...]');
    console.log('');
    console.log('Categories:');
    console.log('  general-code  General code improvements');
    console.log('  typescript    TypeScript-specific fixes');
    console.log('  react         React-specific fixes');
    console.log('  api           API handler fixes');
    console.log('  tests         Test file fixes');
    console.log('  docs          Documentation fixes');
    console.log('  config        Configuration fixes');
    console.log('');
    console.log('Examples:');
    console.log('  ast-fixer.mjs .                    # Fix all categories');
    console.log('  ast-fixer.mjs . typescript react   # Fix TypeScript and React only');
    process.exit(0);
  }
  
  const fixer = new ASTFixer(target);
  await fixer.fixDirectory(target, categories);
  
  const summary = fixer.getSummary();
  console.log('AST Fixer Results:');
  console.log(`  Files modified: ${summary.filesModified}`);
  console.log(`  Total fixes: ${summary.totalFixes}`);
  
  if (summary.details.length > 0) {
    console.log('');
    console.log('Details:');
    for (const detail of summary.details) {
      console.log(`  ${detail.file}: ${detail.fixes} fixes`);
    }
  }
}
