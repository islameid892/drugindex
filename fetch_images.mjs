import { db } from './server/db.ts';
import { drugImageFetcher } from './server/services/drugImageFetcher.ts';

async function fetchImages() {
  console.log('Starting image fetch for first 100 drugs...');
  try {
    const result = await drugImageFetcher.fetchAndStoreImages(100);
    console.log(`✅ Fetched ${result.successCount} images`);
    console.log(`❌ Failed: ${result.failureCount}`);
    console.log(`⏭️  Skipped: ${result.skippedCount}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

fetchImages();
