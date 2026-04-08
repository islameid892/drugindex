import mysql from 'mysql2/promise';
import https from 'https';
import { storagePut } from './server/storage.ts';

// Download image from URL following redirects
function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/jpeg,image/png,image/*'
      } 
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadImage(res.headers.location).then(resolve).catch(reject);
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
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function uploadImagesToS3() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Get drugs with Unsplash images (not yet on S3)
  const [drugs] = await connection.execute(
    "SELECT id, trade_name, image_url FROM drug_lens WHERE image_url LIKE '%unsplash%' LIMIT 10"
  );
  
  console.log(`Found ${drugs.length} drugs with Unsplash images\n`);
  
  for (const drug of drugs) {
    try {
      console.log(`📥 Downloading: ${drug.trade_name}`);
      const imageBuffer = await downloadImage(drug.image_url);
      
      const safeName = drug.trade_name.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 30);
      const fileName = `drug-images/${drug.id}-${safeName}-${Date.now()}.jpg`;
      const { url } = await storagePut(fileName, imageBuffer, 'image/jpeg');
      
      await connection.execute(
        'UPDATE drug_lens SET image_url = ? WHERE id = ?',
        [url, drug.id]
      );
      
      console.log(`✅ S3 URL: ${url.substring(0, 80)}...\n`);
    } catch (error) {
      console.log(`❌ Error for ${drug.trade_name}: ${error.message}\n`);
    }
  }
  
  // Verify
  const [updated] = await connection.execute(
    "SELECT id, trade_name, image_url FROM drug_lens WHERE image_url IS NOT NULL AND image_url NOT LIKE '%unsplash%' AND image_url NOT LIKE '%placeholder%' LIMIT 5"
  );
  
  console.log('\n✅ Drugs with S3 images:');
  updated.forEach(d => {
    console.log(`- ${d.trade_name}`);
    console.log(`  ${d.image_url}`);
  });
  
  await connection.end();
}

uploadImagesToS3().catch(console.error);
