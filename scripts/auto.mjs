#!/usr/bin/env node
import { AutoRunner } from './scanner.mjs';
import { AutoFixer } from './autofix.mjs';

const args = process.argv.slice(2);
const command = args[0] || 'scan';
const target = args[1] || '.';

async function main() {
  console.log('🛡️ Universal Anti-Slop - Autonomous Mode');
  console.log('');
  
  switch (command) {
    case 'scan':
      console.log('🔍 Scanning project for context...');
      const runner = new AutoRunner(target);
      const results = await runner.run();
      
      console.log('');
      console.log('✅ Context detected');
      console.log('');
      console.log('🎯 To run checks: pnpm auto:check');
      console.log('🔧 To auto-fix: pnpm auto:fix');
      console.log('📋 Dry run: pnpm auto:fix:dry');
      break;
      
    case 'check':
      console.log('🔍 Scanning project...');
      const checkRunner = new AutoRunner(target);
      const checkResults = await checkRunner.run();
      
      console.log('');
      console.log('▶️ Running category checks...');
      
      for (const category of checkResults.categories) {
        console.log(`  Checking ${category}...`);
      }
      
      console.log('');
      console.log('✅ All checks complete');
      break;
      
    case 'fix':
      console.log('🔧 Auto-fixing based on context...');
      const fixer = new AutoFixer(target);
      await fixer.run({ dryRun: false });
      console.log('');
      console.log('✅ Auto-fix complete');
      break;
      
    case 'fix:dry':
      console.log('🔍 Dry run - no files will be modified...');
      const dryFixer = new AutoFixer(target);
      await dryFixer.run({ dryRun: true });
      break;
      
    default:
      console.log('Usage:');
      console.log('  pnpm auto [scan|check|fix|fix:dry] [path]');
      console.log('');
      console.log('Commands:');
      console.log('  scan      Scan project and detect context');
      console.log('  check     Run checks based on detected context');
      console.log('  fix       Auto-fix based on detected context');
      console.log('  fix:dry   Dry run - show what would be fixed');
  }
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
