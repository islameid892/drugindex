import mysql from 'mysql2/promise';
import https from 'https';
import http from 'http';
import { storagePut } from './server/storage.ts';

// Download image from URL following redirects
function downloadImage(url, redirectCount = 0) {
  if (redirectCount > 5) return Promise.reject(new Error('Too many redirects'));
  
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, { 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/jpeg,image/png,image/*,*/*',
        'Referer': 'https://www.google.com/'
      } 
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        return downloadImage(res.headers.location, redirectCount + 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(20000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

// Search Bing Images and get first image URL
async function searchBingImage(query) {
  return new Promise((resolve, reject) => {
    const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1&tsc=ImageHoverTitle`;
    
    const req = https.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Extract image URLs from Bing response
        const matches = data.match(/"murl":"([^"]+)"/g);
        if (matches && matches.length > 0) {
          const firstUrl = matches[0].replace('"murl":"', '').replace('"', '');
          resolve(firstUrl);
        } else {
          resolve(null);
        }
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function fetchAndUploadImages() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Get drugs that still have placeholder or unsplash images (failed ones)
  const [drugs] = await connection.execute(
    `SELECT id, trade_name, scientific_name, image_url FROM drug_lens 
     WHERE image_url IS NULL OR image_url LIKE '%placeholder%' OR image_url LIKE '%unsplash%'
     LIMIT 10`
  );
  
  console.log(`Found ${drugs.length} drugs needing real images\n`);
  
  let successCount = 0;
  
  for (const drug of drugs) {
    try {
      console.log(`🔍 Searching for: ${drug.trade_name}`);
      
      // Search Bing for drug image
      const query = `${drug.trade_name} medicine tablet pill`;
      const imageUrl = await searchBingImage(query);
      
      if (!imageUrl) {
        console.log(`⏭️ No image found for ${drug.trade_name}\n`);
        continue;
      }
      
      console.log(`📥 Downloading from: ${imageUrl.substring(0, 60)}...`);
      const imageBuffer = await downloadImage(imageUrl);
      
      if (imageBuffer.length < 1000) {
        console.log(`⏭️ Image too small (${imageBuffer.length} bytes), skipping\n`);
        continue;
      }
      
      const safeName = drug.trade_name.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 30);
      const fileName = `drug-images/${drug.id}-${safeName}-${Date.now()}.jpg`;
      const { url } = await storagePut(fileName, imageBuffer, 'image/jpeg');
      
      await connection.execute(
        'UPDATE drug_lens SET image_url = ? WHERE id = ?',
        [url, drug.id]
      );
      
      successCount++;
      console.log(`✅ Uploaded to S3 successfully!\n`);
      
      // Rate limit
      await new Promise(r => setTimeout(r, 1000));
    } catch (error) {
      console.log(`❌ Error for ${drug.trade_name}: ${error.message}\n`);
    }
  }
  
  console.log(`\n📊 Summary: ${successCount}/${drugs.length} images uploaded to S3`);
  
  // Show all drugs with S3 images
  const [s3Drugs] = await connection.execute(
    `SELECT id, trade_name, image_url FROM drug_lens 
     WHERE image_url IS NOT NULL 
     AND image_url NOT LIKE '%placeholder%' 
     AND image_url NOT LIKE '%unsplash%'
     LIMIT 10`
  );
  
  console.log('\n✅ All drugs with S3 images:');
  s3Drugs.forEach(d => {
    console.log(`- [ID:${d.id}] ${d.trade_name}`);
  });
  
  await connection.end();
}

fetchAndUploadImages().catch(console.error);
