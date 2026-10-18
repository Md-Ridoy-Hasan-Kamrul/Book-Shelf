import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: run-prisma.ts <prisma-subcommand> [...args]');
  process.exit(1);
}

execSync(`prisma ${args.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(' ')}`, {
  stdio: 'inherit',
  env: process.env,
});
