#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

console.log('[audit] pnpm audit --prod');
const result = spawnSync('pnpm', ['audit', '--prod'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
// Audit may exit non-zero when vulns found — surface that for operators
process.exit(result.status ?? 0);
