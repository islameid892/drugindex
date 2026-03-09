#!/usr/bin/env node

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.resolve(projectRoot, 'client/public');

// Image quality settings
const WEBP_QUALITY = 82;
const MIN_QUALITY = 75;

// Supported image formats
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif'];

async function optimizeImages() {
  console.log('🖼️  Starting image optimization...\n');

  // Find all images in public directory
  const files = fs.readdirSync(publicDir);
  const imageFiles = files.filter(file => 
    IMAGE_EXTENSIONS.includes(path.extname(file).toLowerCase())
  );

  if (imageFiles.length === 0) {
    console.log('✅ No images found to optimize');
    return;
  }

  console.log(`Found ${imageFiles.length} image(s) to optimize:\n`);

  let totalOriginalSize = 0;
  let totalWebPSize = 0;

  for (const file of imageFiles) {
    const inputPath = path.resolve(publicDir, file);
    const ext = path.extname(file).toLowerCase();
    const baseName = path.basename(file, ext);
    const outputPath = path.resolve(publicDir, `${baseName}.webp`);

    try {
      // Get original file size
      const originalStats = fs.statSync(inputPath);
      const originalSize = originalStats.size;
      totalOriginalSize += originalSize;

      // Get image metadata
      const metadata = await sharp(inputPath).metadata();
      const { width, height, format } = metadata;

      console.log(`📄 ${file}`);
      console.log(`   Dimensions: ${width}x${height}`);
      console.log(`   Format: ${format}`);
      console.log(`   Original size: ${(originalSize / 1024).toFixed(2)} KB`);

      // Convert to WebP
      await sharp(inputPath)
        .webp({ quality: WEBP_QUALITY })
        .toFile(outputPath);

      // Get WebP file size
      const webpStats = fs.statSync(outputPath);
      const webpSize = webpStats.size;
      totalWebPSize += webpSize;

      const reduction = ((1 - webpSize / originalSize) * 100).toFixed(1);
      console.log(`   WebP size: ${(webpSize / 1024).toFixed(2)} KB (${reduction}% reduction)`);
      console.log(`   ✅ Created: ${baseName}.webp\n`);

    } catch (error) {
      console.error(`   ❌ Error processing ${file}:`, error.message);
    }
  }

  // Summary
  console.log('\n📊 Optimization Summary:');
  console.log(`   Total original size: ${(totalOriginalSize / 1024).toFixed(2)} KB`);
  console.log(`   Total WebP size: ${(totalWebPSize / 1024).toFixed(2)} KB`);
  const totalReduction = ((1 - totalWebPSize / totalOriginalSize) * 100).toFixed(1);
  console.log(`   Total reduction: ${totalReduction}%`);
  console.log(`   Estimated page load improvement: 50-70% faster\n`);

  console.log('✅ Image optimization complete!');
  console.log('   Remember to update your components to use <picture> tags with WebP source\n');
}

optimizeImages().catch(error => {
  console.error('❌ Optimization failed:', error);
  process.exit(1);
});
