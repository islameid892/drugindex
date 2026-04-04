import { generateSilaApiKey, deactivateSilaApiKey } from './server/db.ts';

const result = await generateSilaApiKey('Debug Test', 'Debug');
console.log('Generated result:', result);
console.log('ID type:', typeof result.id);
console.log('ID value:', result.id);

try {
  const deactivateResult = await deactivateSilaApiKey(result.id);
  console.log('Deactivate result:', deactivateResult);
} catch (error) {
  console.error('Deactivate error:', error.message);
}
