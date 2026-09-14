#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const EXTENSION_MAP = {
  '.js': 'javascript',
  '.jsx': 'react',
  '.ts': 'typescript',
  '.tsx': 'react-typescript',
  '.py': 'python',
  '.rb': 'ruby',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.kt': 'kotlin',
  '.swift': 'swift',
  '.c': 'c',
  '.cpp': 'cpp',
  '.cs': 'csharp',
  '.php': 'php',
  '.html': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.md': 'markdown',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.sh': 'shell',
  '.bash': 'shell',
  '.ps1': 'powershell',
  '.sql': 'sql',
  '.graphql': 'graphql',
  '.proto': 'protobuf',
  '.tf': 'terraform',
  '.dockerfile': 'docker',
  '.docker-compose': 'docker',
  '.env': 'dotenv',
  '.gitignore': 'git',
  '.eslintrc': 'linting',
  '.prettierrc': 'formatting',
  '.editorconfig': 'editor'
};

const FRAMEWORK_DETECTORS = {
  'react': {
    files: ['package.json'],
    content: ['react', 'react-dom'],
    extensions: ['.jsx', '.tsx']
  },
  'vue': {
    files: ['package.json'],
    content: ['vue'],
    extensions: ['.vue']
  },
  'angular': {
    files: ['package.json', 'angular.json'],
    content: ['@angular/core'],
    extensions: ['.component.ts']
  },
  'svelte': {
    files: ['package.json'],
    content: ['svelte'],
    extensions: ['.svelte']
  },
  'next': {
    files: ['next.config.js', 'next.config.mjs', 'next.config.ts'],
    content: ['next'],
    extensions: []
  },
  'nuxt': {
    files: ['nuxt.config.js', 'nuxt.config.ts'],
    content: ['nuxt'],
    extensions: []
  },
  'express': {
    files: ['package.json'],
    content: ['express'],
    extensions: []
  },
  'fastify': {
    files: ['package.json'],
    content: ['fastify'],
    extensions: []
  },
  'django': {
    files: ['manage.py', 'settings.py'],
    content: ['django'],
    extensions: []
  },
  'flask': {
    files: ['app.py', 'requirements.txt'],
    content: ['flask'],
    extensions: []
  },
  'rails': {
    files: ['Gemfile', 'Rakefile'],
    content: ['rails'],
    extensions: ['.erb']
  },
  'laravel': {
    files: ['artisan', 'composer.json'],
    content: ['laravel'],
    extensions: ['.blade.php']
  },
  'spring': {
    files: ['pom.xml', 'build.gradle'],
    content: ['spring-boot'],
    extensions: []
  },
  'terraform': {
    files: ['main.tf', 'variables.tf', 'outputs.tf'],
    content: ['terraform'],
    extensions: ['.tf']
  },
  'docker': {
    files: ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml'],
    content: ['docker'],
    extensions: []
  },
  'kubernetes': {
    files: ['deployment.yaml', 'service.yaml', 'ingress.yaml'],
    content: ['apiVersion', 'kind'],
    extensions: []
  }
};

const PROJECT_TYPES = {
  'library': {
    indicators: ['package.json', 'setup.py', 'Cargo.toml', 'go.mod'],
    categories: ['general-code', 'docs', 'tests', 'git']
  },
  'api': {
    indicators: ['routes', 'controllers', 'api', 'openapi', 'swagger'],
    categories: ['general-code', 'api', 'docs', 'tests', 'git']
  },
  'cli': {
    indicators: ['bin', 'cli', 'commander', 'yargs'],
    categories: ['general-code', 'docs', 'tests', 'config']
  },
  'webapp': {
    indicators: ['public', 'src', 'components', 'pages'],
    categories: ['general-code', 'ui', 'docs', 'tests', 'git']
  },
  'mobile': {
    indicators: ['android', 'ios', 'App.js', 'App.tsx'],
    categories: ['general-code', 'ui', 'layoutmobile', 'tests']
  },
  'data': {
    indicators: ['notebooks', 'data', 'analysis', 'ml', 'ai'],
    categories: ['general-code', 'docs', 'tests', 'thinking']
  },
  'infra': {
    indicators: ['terraform', 'ansible', 'kubernetes', 'docker'],
    categories: ['config', 'docs', 'git']
  },
  'docs': {
    indicators: ['docs', 'wiki', 'guides', 'tutorials'],
    categories: ['docs', 'copywriting']
  }
};

export class ProjectScanner {
  constructor(root = '.') {
    this.root = root;
    this.files = [];
    this.languages = new Set();
    this.frameworks = new Set();
    this.projectType = 'unknown';
    this.configFiles = [];
    this.testFiles = [];
    this.docFiles = [];
  }

  async scan() {
    await this.scanDirectory(this.root);
    this.detectLanguages();
    await this.detectFrameworks();
    this.detectProjectType();
    return this.getResults();
  }

  async scanDirectory(dir, depth = 0) {
    if (depth > 5) return;
    
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'build') {
          continue;
        }
        
        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath, depth + 1);
        } else {
          this.files.push(fullPath);
          this.categorizeFile(fullPath);
        }
      }
    } catch (error) {
      // Skip inaccessible directories
    }
  }

  categorizeFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const name = path.basename(filePath).toLowerCase();
    
    if (name.includes('test') || name.includes('spec') || name.includes('.test.') || name.includes('.spec.')) {
      this.testFiles.push(filePath);
    }
    
    if (ext === '.md' || name.includes('readme') || name.includes('docs')) {
      this.docFiles.push(filePath);
    }
    
    if (name === 'package.json' || name === 'tsconfig.json' || name === '.eslintrc' || name === '.prettierrc' || name === 'Cargo.toml' || name === 'go.mod' || name === 'requirements.txt' || name === 'Gemfile') {
      this.configFiles.push(filePath);
    }
  }

  detectLanguages() {
    for (const file of this.files) {
      const ext = path.extname(file).toLowerCase();
      if (EXTENSION_MAP[ext]) {
        this.languages.add(EXTENSION_MAP[ext]);
      }
    }
  }

  async detectFrameworks() {
    for (const [framework, detectors] of Object.entries(FRAMEWORK_DETECTORS)) {
      for (const file of detectors.files) {
        const filePath = path.join(this.root, file);
        if (fs.existsSync(filePath)) {
          const content = await fs.promises.readFile(filePath, 'utf-8');
          for (const keyword of detectors.content) {
            if (content.includes(keyword)) {
              this.frameworks.add(framework);
              break;
            }
          }
        }
      }
    }
  }

  detectProjectType() {
    const indicators = {
      'library': ['package.json', 'setup.py', 'Cargo.toml', 'go.mod'],
      'api': ['routes', 'controllers', 'api', 'openapi', 'swagger'],
      'cli': ['bin', 'cli', 'commander', 'yargs'],
      'webapp': ['public', 'src', 'components', 'pages'],
      'mobile': ['android', 'ios', 'App.js', 'App.tsx'],
      'data': ['notebooks', 'data', 'analysis', 'ml', 'ai'],
      'infra': ['terraform', 'ansible', 'kubernetes', 'docker'],
      'docs': ['docs', 'wiki', 'guides', 'tutorials']
    };

    for (const [type, typeIndicators] of Object.entries(indicators)) {
      for (const indicator of typeIndicators) {
        const hasIndicator = this.files.some(file => 
          file.toLowerCase().includes(indicator.toLowerCase())
        );
        if (hasIndicator) {
          this.projectType = type;
          return;
        }
      }
    }
  }

  getResults() {
    return {
      root: this.root,
      totalFiles: this.files.length,
      languages: Array.from(this.languages),
      frameworks: Array.from(this.frameworks),
      projectType: this.projectType,
      configFiles: this.configFiles,
      testFiles: this.testFiles,
      docFiles: this.docFiles,
      hasTests: this.testFiles.length > 0,
      hasDocs: this.docFiles.length > 0,
      hasConfig: this.configFiles.length > 0
    };
  }
}

export class CategorySelector {
  constructor(scanResults) {
    this.scanResults = scanResults;
    this.selectedCategories = new Set();
    this.reasons = new Map();
  }

  select() {
    this.addBaseCategories();
    this.addLanguageCategories();
    this.addFrameworkCategories();
    this.addProjectTypeCategories();
    this.addContextualCategories();
    
    return {
      categories: Array.from(this.selectedCategories),
      reasons: Object.fromEntries(this.reasons)
    };
  }

  addBaseCategories() {
    this.addCategory('general-code', 'Base category for all projects');
    this.addCategory('git', 'Git best practices');
  }

  addLanguageCategories() {
    const { languages } = this.scanResults;
    
    if (languages.includes('typescript') || languages.includes('javascript')) {
      this.addCategory('config', 'JavaScript/TypeScript configuration');
    }
    
    if (languages.includes('python')) {
      this.addCategory('config', 'Python configuration');
    }
    
    if (languages.includes('markdown')) {
      this.addCategory('docs', 'Documentation present');
    }
  }

  addFrameworkCategories() {
    const { frameworks } = this.scanResults;
    const frameworkSet = new Set(frameworks);
    
    if (frameworkSet.has('react') || frameworkSet.has('vue') || frameworkSet.has('angular') || frameworkSet.has('svelte')) {
      this.addCategory('ui', 'Frontend framework detected');
      this.addCategory('layoutmobile', 'Mobile responsiveness needed');
    }
    
    if (frameworkSet.has('express') || frameworkSet.has('fastify') || frameworkSet.has('django') || frameworkSet.has('flask')) {
      this.addCategory('api', 'Backend framework detected');
    }
    
    if (frameworkSet.has('next') || frameworkSet.has('nuxt')) {
      this.addCategory('ui', 'Full-stack framework');
      this.addCategory('api', 'API routes detected');
    }
    
    if (frameworkSet.has('terraform') || frameworkSet.has('docker') || frameworkSet.has('kubernetes')) {
      this.addCategory('config', 'Infrastructure as Code');
    }
  }

  addProjectTypeCategories() {
    const { projectType, hasTests, hasDocs } = this.scanResults;
    
    if (projectType === 'webapp' || projectType === 'mobile') {
      this.addCategory('ui', 'User interface project');
      this.addCategory('layoutmobile', 'Mobile responsiveness');
    }
    
    if (projectType === 'api' || projectType === 'library') {
      this.addCategory('api', 'API design important');
    }
    
    if (projectType === 'data') {
      this.addCategory('thinking', 'Data analysis project');
    }
    
    if (projectType === 'docs') {
      this.addCategory('copywriting', 'Documentation focused');
    }
    
    if (hasTests) {
      this.addCategory('tests', 'Tests present');
    }
    
    if (hasDocs) {
      this.addCategory('docs', 'Documentation present');
    }
  }

  addContextualCategories() {
    const { testFiles, docFiles, configFiles } = this.scanResults;
    
    if (testFiles.length > 0) {
      this.addCategory('tests', 'Test files detected');
    }
    
    if (docFiles.length > 0) {
      this.addCategory('docs', 'Documentation files detected');
    }
    
    if (configFiles.length > 0) {
      this.addCategory('config', 'Configuration files detected');
    }
  }

  addCategory(category, reason) {
    this.selectedCategories.add(category);
    this.reasons.set(category, reason);
  }
}

export class AutoRunner {
  constructor(root = '.') {
    this.root = root;
    this.scanner = new ProjectScanner(root);
    this.results = null;
  }

  async run() {
    console.log('🔍 Scanning project...');
    this.results = await this.scanner.scan();
    
    console.log(`📁 Found ${this.results.totalFiles} files`);
    console.log(`🌐 Languages: ${this.results.languages.join(', ') || 'none detected'}`);
    console.log(`⚛️ Frameworks: ${this.results.frameworks.join(', ') || 'none detected'}`);
    console.log(`📦 Project type: ${this.results.projectType}`);
    console.log(`🧪 Tests: ${this.results.hasTests ? 'yes' : 'no'}`);
    console.log(`📚 Docs: ${this.results.hasDocs ? 'yes' : 'no'}`);
    
    const selector = new CategorySelector(this.results);
    const { categories, reasons } = selector.select();
    
    console.log('');
    console.log('🎯 Selected categories:');
    for (const category of categories) {
      console.log(`  • ${category}: ${reasons[category]}`);
    }
    
    return {
      scan: this.results,
      categories,
      reasons
    };
  }
}

if (process.argv[1] === import.meta.url) {
  const scanner = new ProjectScanner(process.argv[2] || '.');
  const runner = new AutoRunner(process.argv[2] || '.');
  runner.run().then(results => {
    console.log('');
    console.log('✅ Scan complete');
  });
}
