import axios from 'axios';
import mysql from 'mysql2/promise';

async function fetchDrugImages() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  // Get first 5 drugs without images
  const [drugs] = await connection.execute(
    'SELECT id, trade_name, scientific_name FROM drug_lens WHERE image_url IS NULL LIMIT 5'
  );

  console.log(`Fetching images for ${drugs.length} drugs...\n`);

  for (const drug of drugs) {
    try {
      // Search for drug image using DuckDuckGo Image Search (no API key needed)
      const searchQuery = `${drug.trade_name} ${drug.scientific_name} medicine pill`;
      const duckUrl = `https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&iax=images&ia=images`;
      
      console.log(`🔍 Searching for: ${drug.trade_name}`);
      
      // Try using a simple image search approach
      const response = await axios.get(`https://api.unsplash.com/search/photos`, {
        params: {
          query: searchQuery,
          per_page: 1,
          client_id: 'demo'
        },
        timeout: 10000
      });

      if (response.data.results && response.data.results.length > 0) {
        const imageUrl = response.data.results[0].urls.regular;
        console.log(`✅ Found image: ${imageUrl.substring(0, 80)}...\n`);
      } else {
        console.log(`⏭️ No image found\n`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}\n`);
    }
  }

  await connection.end();
}

fetchDrugImages().catch(console.error);
