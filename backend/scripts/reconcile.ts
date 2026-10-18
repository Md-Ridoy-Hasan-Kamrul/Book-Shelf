import { reconcileOrdersVsLedger } from '../src/services/money/reconcileService.js';

const result = await reconcileOrdersVsLedger();
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
