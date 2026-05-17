import { getSearchMetrics } from './server/db.ts';

console.log('Testing getSearchMetrics...');
const result = await getSearchMetrics(720);
console.log('Result:', result);
