#!/usr/bin/env node
// Real AST parsing with Babel
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';
import { readFileSync, writeFileSync } from 'node:fs';
import { extname } from 'node:path';

// Parse code to AST
function parseCode(code, filename) {
  const plugins = [];

  // Add TypeScript plugin if needed
  if (filename.endsWith('.ts') || filename.endsWith('.tsx')) {
    plugins.push('typescript');
  }

  // Add JSX plugin if needed
  if (filename.endsWith('.jsx') || filename.endsWith('.tsx')) {
    plugins.push('jsx');
  }

  return parse(code, {
    sourceType: 'module',
    plugins,
    errorRecovery: true
  });
}

// Transform rules
const TRANSFORM_RULES = {
  'replace-any': {
    description: 'Replace `any` type with `unknown`',
    visitor: {
      TSAnyKeyword(path) {
        path.replaceWith(t.tsUnknownKeyword());
      }
    }
  },
  'fix-empty-catch': {
    description: 'Add error handling to empty catch blocks',
    visitor: {
      CatchClause(path) {
        if (path.node.body.body.length === 0) {
          path.node.body.body.push(
            t.expressionStatement(
              t.callExpression(
                t.memberExpression(t.identifier('console'), t.identifier('error')),
                [t.identifier('error')]
              )
            )
          );
        }
      }
    }
  },
  'add-strict-equality': {
    description: 'Replace == with === and != with !==',
    visitor: {
      BinaryExpression(path) {
        if (path.node.operator === '==' || path.node.operator === '!=') {
          path.node.operator = path.node.operator === '==' ? '===' : '!==';
        }
      }
    }
  },
  'replace-var-with-const': {
    description: 'Replace var with const where possible',
    visitor: {
      VariableDeclaration(path) {
        if (path.node.kind === 'var') {
          // Check if variable is reassigned
          const binding = path.scope.getBinding(path.node.declarations[0].id.name);
          if (binding && !binding.referenced) {
            path.node.kind = 'const';
          } else if (binding && binding.constantViolations.length === 0) {
            path.node.kind = 'const';
          }
        }
      }
    }
  },
  'add-missing-key': {
    description: 'Add key prop to mapped elements',
    visitor: {
      JSXElement(path) {
        // Check if parent is a map callback
        const parent = path.findParent(p => p.isCallExpression());
        if (parent && parent.node.callee.property?.name === 'map') {
          const hasKey = path.node.openingElement.attributes.some(
            attr => attr.name?.name === 'key'
          );
          if (!hasKey) {
            path.node.openingElement.attributes.push(
              t.jsxAttribute(
                t.jsxIdentifier('key'),
                t.jsxExpressionContainer(t.identifier('index'))
              )
            );
          }
        }
      }
    }
  },
  'fix-implicit-return': {
    description: 'Add explicit return to arrow functions',
    visitor: {
      ArrowFunctionExpression(path) {
        if (path.node.body.type !== 'BlockStatement') {
          path.node.body = t.blockStatement([
            t.returnStatement(path.node.body)
          ]);
        }
      }
    }
  },
  'add-null-check': {
    description: 'Add null checks before property access',
    visitor: {
      MemberExpression(path) {
        if (path.node.object.type === 'Identifier') {
          const binding = path.scope.getBinding(path.node.object.name);
          if (binding && binding.path.node.init?.type === 'CallExpression') {
            // Add optional chaining for function results
            path.node.optional = true;
          }
        }
      }
    }
  },
  'fix-unused-vars': {
    description: 'Remove unused variables',
    visitor: {
      VariableDeclaration(path) {
        const declarator = path.node.declarations[0];
        if (declarator.id.type === 'Identifier') {
          const binding = path.scope.getBinding(declarator.id.name);
          if (binding && !binding.referenced) {
            path.remove();
          }
        }
      }
    }
  }
};

// Apply transforms to AST
function applyTransforms(ast, rules) {
  const appliedRules = [];

  traverse(ast, {
    enter(path) {
      for (const ruleName of rules) {
        const rule = TRANSFORM_RULES[ruleName];
        if (rule && rule.visitor) {
          for (const [nodeType, handler] of Object.entries(rule.visitor)) {
            if (path.isNodeType(nodeType)) {
              handler(path);
              if (!appliedRules.includes(ruleName)) {
                appliedRules.push(ruleName);
              }
            }
          }
        }
      }
    }
  });

  return appliedRules;
}

// Generate code from AST
function generateCode(ast) {
  return generate(ast, {
    comments: true,
    jsescOption: {
      minimal: true
    }
  }).code;
}

// Fix file using Babel AST
export function fixFileBabel(filePath, rules = []) {
  try {
    const code = readFileSync(filePath, 'utf-8');
    const ast = parseCode(code, filePath);

    const appliedRules = applyTransforms(ast, rules);

    if (appliedRules.length > 0) {
      const fixedCode = generateCode(ast);
      writeFileSync(filePath, fixedCode, 'utf-8');
    }

    return {
      file: filePath,
      fixed: appliedRules.length > 0,
      rules: appliedRules
    };
  } catch (error) {
    return {
      file: filePath,
      fixed: false,
      error: error.message
    };
  }
}

// Analyze file without fixing
export function analyzeFile(filePath) {
  try {
    const code = readFileSync(filePath, 'utf-8');
    const ast = parseCode(code, filePath);

    const issues = [];

    traverse(ast, {
      TSAnyKeyword(path) {
        issues.push({
          type: 'any-type',
          line: path.node.loc?.start.line,
          column: path.node.loc?.start.column
        });
      },
      CatchClause(path) {
        if (path.node.body.body.length === 0) {
          issues.push({
            type: 'empty-catch',
            line: path.node.loc?.start.line,
            column: path.node.loc?.start.column
          });
        }
      },
      BinaryExpression(path) {
        if (path.node.operator === '==' || path.node.operator === '!=') {
          issues.push({
            type: 'loose-equality',
            line: path.node.loc?.start.line,
            column: path.node.loc?.start.column
          });
        }
      },
      VariableDeclaration(path) {
        if (path.node.kind === 'var') {
          issues.push({
            type: 'var-declaration',
            line: path.node.loc?.start.line,
            column: path.node.loc?.start.column
          });
        }
      }
    });

    return {
      file: filePath,
      issues,
      clean: issues.length === 0
    };
  } catch (error) {
    return {
      file: filePath,
      issues: [],
      error: error.message
    };
  }
}

// Get available rules
export function getAvailableRules() {
  return Object.entries(TRANSFORM_RULES).map(([name, rule]) => ({
    name,
    description: rule.description
  }));
}

// CLI
if (process.argv[1] === import.meta.url) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'rules':
      console.log('Available Babel transform rules:');
      for (const rule of getAvailableRules()) {
        console.log(`  ${rule.name}: ${rule.description}`);
      }
      break;

    case 'analyze':
      const analyzeFile = args[1];
      if (!analyzeFile) {
        console.error('Usage: babel-fixer.mjs analyze <file>');
        process.exit(1);
      }
      const analysis = analyzeFileBabel(analyzeFile);
      console.log('Analysis:', JSON.stringify(analysis, null, 2));
      break;

    case 'fix':
      const fixFilePath = args[1];
      const fixRules = args.slice(2);
      if (!fixFilePath) {
        console.error('Usage: babel-fixer.mjs fix <file> [rules...]');
        process.exit(1);
      }
      const result = fixFileBabel(fixFilePath, fixRules);
      console.log('Result:', JSON.stringify(result, null, 2));
      break;

    default:
      console.log('Babel AST Fixer');
      console.log('');
      console.log('Commands:');
      console.log('  rules              List available rules');
      console.log('  analyze <file>     Analyze file for issues');
      console.log('  fix <file> [rules] Fix file with specified rules');
  }
}
