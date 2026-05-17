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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/jpeg,image/png,image/*,*/*',
      }
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        return downloadImage(res.headers.location, redirectCount + 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// Get DuckDuckGo token (vqd)
function getDDGToken(query) {
  return new Promise((resolve, reject) => {
    const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const match = data.match(/vqd=['"]([^'"]+)['"]/);
        if (match) resolve(match[1]);
        else reject(new Error('Could not get DDG token'));
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// Search DuckDuckGo Images
async function searchDDGImages(query) {
  try {
    const vqd = await getDDGToken(query);
    return new Promise((resolve, reject) => {
      const searchUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,,,&p=1`;
      const req = https.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Referer': 'https://duckduckgo.com/',
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.results && json.results.length > 0) {
              resolve(json.results.slice(0, 5).map(r => r.image));
            } else {
              resolve([]);
            }
          } catch (e) { resolve([]); }
        });
        res.on('error', reject);
      });
      req.on('error', reject);
      req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
    });
  } catch (err) {
    return [];
  }
}

async function fetchAndUploadImages(batchSize = 50) {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  // Count total drugs without images
  const [[{ total }]] = await connection.execute(
    `SELECT COUNT(*) as total FROM drug_lens 
     WHERE image_url IS NULL OR image_url LIKE '%placeholder%' OR image_url LIKE '%unsplash%'`
  );
  console.log(`📊 Total drugs needing images: ${total}\n`);

  let offset = 0;
  let totalSuccess = 0;
  let totalProcessed = 0;

  while (true) {
    const [drugs] = await connection.execute(
      `SELECT id, trade_name, scientific_name FROM drug_lens 
       WHERE image_url IS NULL OR image_url LIKE '%placeholder%' OR image_url LIKE '%unsplash%'
       ORDER BY id ASC
       LIMIT ${batchSize} OFFSET ${offset}`
    );

    if (drugs.length === 0) break;

    console.log(`\n🔄 Processing batch ${Math.floor(offset/batchSize) + 1} (${offset + 1} - ${offset + drugs.length} of ${total})`);

    for (const drug of drugs) {
      totalProcessed++;
      try {
        const baseName = drug.trade_name.split(' ').slice(0, 2).join(' ');
        const queries = [
          `${baseName} medication pill`,
          `${drug.scientific_name?.split(',')[0]?.trim()} drug`,
        ].filter(Boolean);

        let imageBuffer = null;

        for (const query of queries) {
          const imageUrls = await searchDDGImages(query);
          for (const imgUrl of imageUrls) {
            try {
              const buf = await downloadImage(imgUrl);
              if (buf.length > 5000) { imageBuffer = buf; break; }
            } catch (e) { /* try next */ }
          }
          if (imageBuffer) break;
          await new Promise(r => setTimeout(r, 300));
        }

        if (!imageBuffer) {
          process.stdout.write(`⏭️ [${totalProcessed}/${total}] ${drug.trade_name.substring(0, 40)}\n`);
          continue;
        }

        const safeName = drug.trade_name.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 30);
        const fileName = `drug-images/${drug.id}-${safeName}-${Date.now()}.jpg`;
        const { url } = await storagePut(fileName, imageBuffer, 'image/jpeg');

        await connection.execute('UPDATE drug_lens SET image_url = ? WHERE id = ?', [url, drug.id]);

        totalSuccess++;
        process.stdout.write(`✅ [${totalProcessed}/${total}] ${drug.trade_name.substring(0, 40)} (${Math.round(imageBuffer.length/1024)}KB)\n`);

        await new Promise(r => setTimeout(r, 800));
      } catch (error) {
        process.stdout.write(`❌ [${totalProcessed}/${total}] ${drug.trade_name.substring(0, 30)}: ${error.message}\n`);
      }
    }

    offset += batchSize;
    console.log(`\n📈 Progress: ${totalSuccess} uploaded so far...`);

    // Small pause between batches
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\n🎉 DONE! ${totalSuccess}/${totalProcessed} images uploaded to S3`);
  await connection.end();
}

const batchSize = parseInt(process.argv[2] || '50');
fetchAndUploadImages(batchSize).catch(console.error);
