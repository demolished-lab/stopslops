#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { ProjectScanner, CategorySelector } from './scanner.mjs';

const FIXES = {
  'general-code': {
    'any-type': {
      pattern: /:\s*any\b/g,
      replacement: (match, file) => {
        const ext = path.extname(file);
        if (ext === '.ts' || ext === '.tsx') return ': unknown';
        return match;
      },
      description: 'Replace `any` with `unknown` or proper type'
    },
    'empty-catch': {
      pattern: /catch\s*\([^)]*\)\s*\{\s*\}/g,
      replacement: 'catch (error) {\n    console.error(error);\n    throw error;\n  }',
      description: 'Add error handling to empty catch blocks'
    },
    'console-log': {
      pattern: /console\.log\(/g,
      replacement: (match) => match.replace('console.log', 'console.error'),
      description: 'Replace console.log with console.error for production'
    },
    'var-declaration': {
      pattern: /\bvar\b/g,
      replacement: 'const',
      description: 'Replace `var` with `const` or `let`'
    }
  },
  'api': {
    'missing-error-handling': {
      pattern: /async\s+\([^)]*\)\s*=>\s*\{(?![\s\S]*?try)/g,
      replacement: (match) => `async ($1) => {\n    try {\n      ${match.replace(/async\s+\([^)]*\)\s*=>\s*\{/, '')}`,
      description: 'Add try-catch to async handlers'
    },
    'missing-validation': {
      pattern: /req\.body/g,
      replacement: 'validateInput(req.body)',
      description: 'Add input validation'
    }
  },
  'tests': {
    'missing-assertion': {
      pattern: /it\([^)]+\,\s*async\s+\([^)]*\)\s*=>\s*\{(?![\s\S]*?expect)/g,
      replacement: (match) => `${match}\n      expect(result).toBeDefined();`,
      description: 'Add assertion to test'
    },
    'missing-describe': {
      pattern: /^(?!.*describe\().*it\(/gm,
      replacement: (match) => `describe('Suite', () => {\n  ${match}\n});`,
      description: 'Wrap test in describe block'
    }
  },
  'docs': {
    'missing-examples': {
      pattern: /##\s+[^\n]+(?![\s\S]*?```)/g,
      replacement: (match) => `${match}\n\n\`\`\`typescript\n// Example usage\n\`\`\``,
      description: 'Add code example section'
    }
  },
  'config': {
    'hardcoded-values': {
      pattern: /(?:localhost|127\.0\.0\.1):\d+/g,
      replacement: '${process.env.API_URL || "http://localhost:3000"}',
      description: 'Replace hardcoded URLs with environment variables'
    }
  },
  'thinking': {
    'missing-reasoning': {
      pattern: /\/\/\s*TODO/g,
      replacement: '// Reasoning: TODO',
      description: 'Add reasoning to TODO comments'
    }
  },
  'ui': {
    'missing-accessibility': {
      pattern: /<img\s+[^>]*(?!.*alt=)[^>]*>/g,
      replacement: (match) => match.replace('>', ' alt="Description">'),
      description: 'Add alt attribute to images'
    }
  },
  'copywriting': {
    'passive-voice': {
      pattern: /\b(is|are|was|were|be|been|being)\s+\w+ed\b/g,
      replacement: (match) => match, // Flag only, don't auto-fix
      description: 'Active voice recommended'
    }
  },
  'human': {
    'missing-aria': {
      pattern: /<button[^>]*(?!.*aria-)[^>]*>/g,
      replacement: (match) => match.replace('>', ' aria-label="Action">'),
      description: 'Add ARIA labels to buttons'
    }
  },
  'layoutmobile': {
    'fixed-width': {
      pattern: /width:\s*\d+px/g,
      replacement: 'width: 100%',
      description: 'Use responsive widths'
    }
  },
  'code': {
    'todo-comments': {
      pattern: /\/\/\s*TODO/g,
      replacement: '// FIXME:',
      description: 'Use FIXME for actionable items'
    }
  }
};

export class AutoFixer {
  constructor(root = '.') {
    this.root = root;
    this.scanner = new ProjectScanner(root);
    this.results = null;
    this.fixes = [];
    this.dryRun = false;
  }

  async run(options = {}) {
    this.dryRun = options.dryRun || false;
    
    console.log('🔍 Scanning project...');
    this.results = await this.scanner.scan();
    
    const selector = new CategorySelector(this.results);
    const { categories, reasons } = selector.select();
    
    console.log(`🎯 Auto-selected ${categories.length} categories`);
    console.log('');
    
    for (const category of categories) {
      await this.applyFixes(category);
    }
    
    this.printSummary();
    
    return {
      fixes: this.fixes,
      dryRun: this.dryRun
    };
  }

  async applyFixes(category) {
    const fixes = FIXES[category];
    if (!fixes) return;
    
    console.log(`🔧 Checking ${category}...`);
    
    const files = await this.getFilesForCategory(category);
    
    for (const file of files) {
      try {
        const content = await fs.promises.readFile(file, 'utf-8');
        let modified = content;
        const fileFixes = [];
        
        for (const [name, fix] of Object.entries(fixes)) {
          if (fix.pattern.test(content)) {
            const matches = content.match(fix.pattern);
            if (matches) {
              fileFixes.push({
                name,
                description: fix.description,
                count: matches.length
              });
              
              if (!this.dryRun) {
                if (typeof fix.replacement === 'function') {
                  modified = modified.replace(fix.pattern, (...args) => fix.replacement(args[0], file));
                } else {
                  modified = modified.replace(fix.pattern, fix.replacement);
                }
              }
            }
          }
        }
        
        if (fileFixes.length > 0 && !this.dryRun && modified !== content) {
          await fs.promises.writeFile(file, modified, 'utf-8');
        }
        
        if (fileFixes.length > 0) {
          this.fixes.push({
            file,
            category,
            fixes: fileFixes
          });
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }
  }

  async getFilesForCategory(category) {
    const files = [];
    const extensions = this.getExtensionsForCategory(category);
    
    const scanFiles = async (dir, depth = 0) => {
      if (depth > 5) return;
      
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'build') {
            continue;
          }
          
          if (entry.isDirectory()) {
            await scanFiles(fullPath, depth + 1);
          } else {
            const ext = path.extname(entry.name).toLowerCase();
            if (extensions.includes(ext) || this.isSpecialFile(entry.name)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Skip inaccessible directories
      }
    };
    
    await scanFiles(this.root);
    return files;
  }

  getExtensionsForCategory(category) {
    const map = {
      'general-code': ['.js', '.ts', '.jsx', '.tsx', '.py', '.rb', '.go', '.rs', '.java', '.kt', '.swift'],
      'api': ['.js', '.ts', '.jsx', '.tsx', '.py', '.rb'],
      'tests': ['.test.js', '.test.ts', '.spec.js', '.spec.ts', '.test.py', '_test.go'],
      'docs': ['.md', '.mdx', '.txt', '.rst'],
      'config': ['.json', '.yaml', '.yml', '.toml', '.env', '.config.js', '.config.ts'],
      'thinking': ['.md', '.txt'],
      'ui': ['.jsx', '.tsx', '.vue', '.svelte', '.html', '.css', '.scss'],
      'copywriting': ['.md', '.mdx', '.txt', '.html'],
      'human': ['.jsx', '.tsx', '.vue', '.svelte', '.html'],
      'layoutmobile': ['.css', '.scss', '.jsx', '.tsx', '.vue', '.svelte'],
      'code': ['.js', '.ts', '.jsx', '.tsx', '.py', '.rb', '.go', '.rs', '.java'],
      'git': ['.gitignore', '.gitattributes']
    };
    
    return map[category] || [];
  }

  isSpecialFile(name) {
    const special = ['package.json', 'tsconfig.json', '.eslintrc', '.prettierrc', 'Cargo.toml', 'go.mod', 'requirements.txt', 'Gemfile'];
    return special.includes(name);
  }

  printSummary() {
    console.log('');
    console.log('📊 Summary:');
    console.log(`  Files scanned: ${this.results.totalFiles}`);
    console.log(`  Files fixed: ${this.fixes.length}`);
    console.log(`  Total fixes: ${this.fixes.reduce((sum, f) => sum + f.fixes.length, 0)}`);
    
    if (this.dryRun) {
      console.log('');
      console.log('⚠️  Dry run mode - no files were modified');
    }
    
    if (this.fixes.length > 0) {
      console.log('');
      console.log('📝 Fixed files:');
      for (const fix of this.fixes) {
        console.log(`  ${fix.file}:`);
        for (const f of fix.fixes) {
          console.log(`    • ${f.description} (${f.count}x)`);
        }
      }
    }
  }
}

if (process.argv[1] === import.meta.url) {
  const dryRun = process.argv.includes('--dry-run');
  const fixer = new AutoFixer(process.argv[2] || '.');
  fixer.run({ dryRun });
}
