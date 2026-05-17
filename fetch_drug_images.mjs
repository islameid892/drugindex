import mysql from 'mysql2/promise';
import https from 'https';
import http from 'http';
import { storagePut } from './server/storage.ts';

// Download binary from URL following redirects
function downloadUrl(url, redirectCount = 0) {
  if (redirectCount > 5) return Promise.reject(new Error('Too many redirects'));
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
      }
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        return downloadUrl(res.headers.location, redirectCount + 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ data: Buffer.concat(chunks), contentType: res.headers['content-type'] || 'image/jpeg' }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// Search drugs.com for drug image
async function getDrugsDotComImage(tradeName) {
  try {
    // drugs.com URL format: /mtm/drug-name.html
    const slug = tradeName.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '-');
    const url = `https://www.drugs.com/mtm/${slug}.html`;
    const { data } = await downloadUrl(url);
    const html = data.toString();
    
    // Look for drug image in the page
    const imgMatch = html.match(/class="[^"]*drug-image[^"]*"[^>]*src="([^"]+)"/i) ||
                     html.match(/<img[^>]+src="(https:\/\/[^"]*drugs\.com[^"]*\.(jpg|jpeg|png))[^"]*"/i) ||
                     html.match(/content="(https:\/\/[^"]*drugs\.com[^"]*\.(jpg|jpeg|png))"/i);
    
    if (imgMatch) return imgMatch[1];
    return null;
  } catch (e) {
    return null;
  }
}

// Search Wikipedia for drug image
async function getWikipediaImage(scientificName) {
  try {
    if (!scientificName) return null;
    const drugName = scientificName.split(',')[0].trim();
    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(drugName)}`;
    const { data } = await downloadUrl(wikiUrl);
    const json = JSON.parse(data.toString());
    if (json.thumbnail && json.thumbnail.source) {
      // Get higher resolution version
      return json.thumbnail.source.replace(/\/\d+px-/, '/400px-');
    }
    return null;
  } catch (e) {
    return null;
  }
}

// Try Google Images via scraping
async function getGoogleImage(query) {
  try {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch&hl=en`;
    const { data } = await downloadUrl(searchUrl);
    const html = data.toString();
    
    // Extract image URLs from Google Images response
    const matches = [...html.matchAll(/"(https?:\/\/[^"]+\.(jpg|jpeg|png)(?:\?[^"]*)?)"[^>]*>/gi)];
    const validUrls = matches
      .map(m => m[1])
      .filter(url => !url.includes('google') && !url.includes('gstatic') && url.length > 30)
      .slice(0, 5);
    
    for (const imgUrl of validUrls) {
      try {
        const { data: imgData } = await downloadUrl(imgUrl);
        if (imgData.length > 5000) return { url: imgUrl, data: imgData };
      } catch (e) { /* try next */ }
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function fetchAndUploadAllImages(batchSize = 20) {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

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

    for (const drug of drugs) {
      totalProcessed++;
      try {
        let imageData = null;
        let imageUrl = null;

        // Strategy 1: Try drugs.com
        const drugsUrl = await getDrugsDotComImage(drug.trade_name);
        if (drugsUrl) {
          try {
            const result = await downloadUrl(drugsUrl);
            if (result.data.length > 5000) {
              imageData = result.data;
              imageUrl = drugsUrl;
            }
          } catch (e) { /* try next */ }
        }

        // Strategy 2: Try Wikipedia with scientific name
        if (!imageData) {
          const wikiUrl = await getWikipediaImage(drug.scientific_name);
          if (wikiUrl) {
            try {
              const result = await downloadUrl(wikiUrl);
              if (result.data.length > 5000) {
                imageData = result.data;
                imageUrl = wikiUrl;
              }
            } catch (e) { /* try next */ }
          }
        }

        // Strategy 3: Google Images scraping
        if (!imageData) {
          const baseName = drug.trade_name.split(' ').slice(0, 2).join(' ');
          const result = await getGoogleImage(`${baseName} medication`);
          if (result) {
            imageData = result.data;
            imageUrl = result.url;
          }
        }

        if (!imageData) {
          process.stdout.write(`⏭️ [${totalProcessed}/${total}] No image: ${drug.trade_name.substring(0, 35)}\n`);
          continue;
        }

        // Upload to S3
        const safeName = drug.trade_name.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 30);
        const ext = imageUrl?.includes('.png') ? 'png' : 'jpg';
        const fileName = `drug-images/${drug.id}-${safeName}-${Date.now()}.${ext}`;
        const { url: s3Url } = await storagePut(fileName, imageData, `image/${ext}`);

        await connection.execute('UPDATE drug_lens SET image_url = ? WHERE id = ?', [s3Url, drug.id]);

        totalSuccess++;
        process.stdout.write(`✅ [${totalProcessed}/${total}] ${drug.trade_name.substring(0, 35)} (${Math.round(imageData.length/1024)}KB)\n`);

        await new Promise(r => setTimeout(r, 500));
      } catch (error) {
        process.stdout.write(`❌ [${totalProcessed}/${total}] ${drug.trade_name.substring(0, 25)}: ${error.message}\n`);
      }
    }

    offset += batchSize;
    console.log(`\n📈 Batch done. Total uploaded: ${totalSuccess} / Processed: ${totalProcessed}\n`);
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n🎉 COMPLETE! ${totalSuccess}/${totalProcessed} images uploaded to S3`);
  await connection.end();
}

const batchSize = parseInt(process.argv[2] || '20');
fetchAndUploadAllImages(batchSize).catch(console.error);
