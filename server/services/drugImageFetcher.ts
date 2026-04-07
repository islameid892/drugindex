/**
 * Drug Image Fetcher Service
 * Fetches drug images from Google Images and stores them in S3
 * Runs daily to fetch up to 100 images for drugs without images
 */

import axios from 'axios';
import { storagePut } from '../storage';
import { getDb } from '../db';
import { drugEntries } from '../../drizzle/schema';
import { eq, isNull } from 'drizzle-orm';

// Simple Google Images scraper using Bing Image Search (more reliable)
async function fetchDrugImageUrl(drugName: string): Promise<string | null> {
  try {
    // Use Bing Image Search API (more reliable than Google Images scraping)
    const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(drugName + ' medicine pill tablet')}`;
    
    // Try to fetch using a simple approach
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    // Extract image URLs from Bing response
    const imageMatch = response.data.match(/murl":"([^"]+)"/);
    if (imageMatch && imageMatch[1]) {
      return imageMatch[1];
    }

    return null;
  } catch (error) {
    console.error(`Failed to fetch image for ${drugName}:`, error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

// Alternative: Use a free image API
async function fetchDrugImageFromAPI(drugName: string): Promise<string | null> {
  try {
    // Try using Unsplash API (free, no key required for basic usage)
    const response = await axios.get('https://api.unsplash.com/search/photos', {
      params: {
        query: `${drugName} medicine`,
        per_page: 1,
        client_id: process.env.UNSPLASH_API_KEY || 'demo'
      },
      timeout: 10000
    });

    if (response.data.results && response.data.results.length > 0) {
      return response.data.results[0].urls.regular;
    }

    return null;
  } catch (error) {
    // Fallback to placeholder if API fails
    return null;
  }
}

// Fetch and store image in S3
async function fetchAndStoreImage(drugId: number, tradeName: string, scientificName: string): Promise<string | null> {
  try {
    // Try to fetch image URL
    let imageUrl = await fetchDrugImageFromAPI(tradeName);
    
    if (!imageUrl) {
      imageUrl = await fetchDrugImageFromAPI(scientificName);
    }

    if (!imageUrl) {
      return null;
    }

    // Download image
    const imageResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 15000
    });

    // Store in S3
    const fileName = `drugs/${drugId}-${tradeName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;
    const { url } = await storagePut(fileName, imageResponse.data, 'image/jpeg');

    return url;
  } catch (error) {
    console.error(`Failed to fetch and store image for drug ${drugId}:`, error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

// Main function: Fetch images for drugs without images (max 100 per day)
export async function fetchDrugImages(limit: number = 100): Promise<{ success: number; failed: number }> {
  try {
    const db = await getDb();

    // Get drugs without images
    const drugsWithoutImages = await db
      .select()
      .from(drugEntries)
      .where(isNull(drugEntries.imageUrl))
      .limit(limit);

    console.log(`\n🖼️ Fetching images for ${drugsWithoutImages.length} drugs...\n`);

    let successCount = 0;
    let failedCount = 0;

    for (const drug of drugsWithoutImages) {
      try {
        const imageUrl = await fetchAndStoreImage(drug.id, drug.tradeName, drug.scientificName);

        if (imageUrl) {
          // Update database with image URL
          await db
            .update(drugEntries)
            .set({ imageUrl })
            .where(eq(drugEntries.id, drug.id));

          successCount++;
          console.log(`✅ ${drug.tradeName} - Image stored`);
        } else {
          failedCount++;
          console.log(`⏭️ ${drug.tradeName} - No image found`);
        }
      } catch (error) {
        failedCount++;
        console.error(`❌ ${drug.tradeName} - Error:`, error instanceof Error ? error.message : 'Unknown error');
      }

      // Rate limiting: wait 500ms between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n📊 Summary: ${successCount} successful, ${failedCount} failed\n`);

    return { success: successCount, failed: failedCount };
  } catch (error) {
    console.error('Error in fetchDrugImages:', error);
    return { success: 0, failed: 0 };
  }
}

// Scheduled task to run daily
export async function scheduleDailyImageFetch() {
  // This will be called by a cron job or scheduled task
  console.log('Starting daily drug image fetch...');
  const result = await fetchDrugImages(100);
  console.log(`Daily fetch completed: ${result.success} images fetched`);
}
