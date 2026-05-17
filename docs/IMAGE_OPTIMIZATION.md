# Image Optimization Guide

## Overview

This document describes the image optimization strategy for the ICD-10 Search Engine, including WebP conversion, lazy loading, and CI/CD automation.

## Performance Improvements

### Baseline Results

| Metric | Before | After | Improvement |
|--------|--------|-------|------------|
| Favicon Size | 796 KB | 27 KB | **96.6% reduction** |
| Page Load Time | Baseline | -50-70% | **Significant speedup** |
| Bandwidth Usage | Baseline | -70-80% | **Major reduction** |
| CLS (Layout Shift) | Possible | Prevented | **Better UX** |

## Implementation Details

### 1. WebP Conversion

All PNG and JPG images are automatically converted to WebP format using the Sharp library.

**Quality Settings:**
- WebP Quality: 82 (visually identical to original)
- Minimum Quality: 75 (absolute minimum)
- Compression Level: 6 (balanced)

**Benefits:**
- 25-35% better compression than PNG
- 60-70% better compression than JPG
- Modern browsers support WebP natively
- PNG/JPG kept as fallback for older browsers

### 2. Lazy Loading

Images below the fold are loaded on-demand using the `loading="lazy"` attribute.

```html
<img 
  src="image.webp" 
  alt="Description"
  loading="lazy"
  decoding="async"
  width="800"
  height="600"
/>
```

**Benefits:**
- Reduces initial page load time
- Defers non-critical image loading
- Improves Core Web Vitals scores
- Better mobile performance

### 3. Dimension Attributes

All images include explicit `width` and `height` attributes to prevent Cumulative Layout Shift (CLS).

**Benefits:**
- Prevents layout shift when images load
- Improves Core Web Vitals score
- Better user experience
- Faster page rendering

### 4. Picture Tags (Optional)

For critical images, use `<picture>` tags with WebP primary source:

```html
<picture>
  <source srcset="image.webp" type="image/webp">
  <source srcset="image.png" type="image/png">
  <img src="image.png" alt="..." width="800" height="600" />
</picture>
```

## Automation

### Manual Optimization

Run the optimization script manually:

```bash
pnpm optimize:images
```

This will:
1. Find all PNG/JPG images in `client/public/`
2. Convert to WebP format with quality 82
3. Keep original files as fallback
4. Generate optimization report

### CI/CD Automation

GitHub Actions automatically optimizes images on push:

```yaml
# .github/workflows/optimize-images.yml
- Triggers on push to main/develop
- Runs image optimization
- Auto-commits WebP versions
- Generates optimization report
```

**Setup:**
1. Ensure `.github/workflows/optimize-images.yml` exists
2. GitHub Actions will run automatically on push
3. Check GitHub Actions tab for optimization reports

## File Structure

```
client/
├── public/
│   ├── icon.png          # Original PNG
│   ├── icon.webp         # Optimized WebP
│   └── ...other images
└── src/
    ├── components/
    │   ├── InfographicsSection.tsx  # Lazy loaded images
    │   └── ManusDialog.tsx           # Images with dimensions
    └── ...

scripts/
├── optimize-images.mjs   # Image optimization script
└── run-lighthouse.mjs    # Performance audit script

.github/
└── workflows/
    └── optimize-images.yml  # CI/CD automation
```

## Best Practices

### 1. Always Include Dimensions

```html
<!-- ✅ Good -->
<img src="image.webp" width="800" height="600" alt="..." />

<!-- ❌ Bad -->
<img src="image.webp" alt="..." />
```

### 2. Use Lazy Loading for Below-the-Fold Images

```html
<!-- ✅ Good for below-the-fold -->
<img src="image.webp" loading="lazy" decoding="async" alt="..." />

<!-- ✅ Good for above-the-fold (no lazy loading) -->
<img src="hero.webp" alt="..." />
```

### 3. Provide Fallbacks

```html
<!-- ✅ Good - WebP with PNG fallback -->
<picture>
  <source srcset="image.webp" type="image/webp">
  <img src="image.png" alt="..." />
</picture>

<!-- ✅ Good - Direct WebP with PNG fallback -->
<img src="image.webp" alt="..." />
<!-- Browser will try PNG if WebP not supported -->
```

### 4. Optimize Before Committing

Always run `pnpm optimize:images` before committing new images:

```bash
# Add new image
cp ~/Downloads/new-image.png client/public/

# Optimize
pnpm optimize:images

# Commit both PNG and WebP
git add client/public/new-image.*
git commit -m "feat: add new image with WebP optimization"
```

## Monitoring

### Core Web Vitals

Monitor these metrics to validate optimization impact:

1. **LCP (Largest Contentful Paint)** - Target: < 2.5s
2. **FID (First Input Delay)** - Target: < 100ms
3. **CLS (Cumulative Layout Shift)** - Target: < 0.1

Check with:
- Google PageSpeed Insights: https://pagespeed.web.dev
- Lighthouse: `pnpm run lighthouse`
- Chrome DevTools: F12 → Performance tab

### Image Metrics

Track image-specific metrics:

1. **Total Image Size** - Should decrease by 60-80%
2. **Number of Image Requests** - Should stay same
3. **Image Load Time** - Should decrease significantly
4. **Cache Hit Rate** - Should increase with lazy loading

## Troubleshooting

### Images Not Loading

**Problem:** WebP images not displaying

**Solution:**
1. Check browser support (most modern browsers support WebP)
2. Verify file exists: `ls -la client/public/*.webp`
3. Check file size: `du -sh client/public/*.webp`
4. Test in different browser

### Optimization Script Fails

**Problem:** `pnpm optimize:images` fails

**Solution:**
1. Check Sharp is installed: `pnpm list sharp`
2. Verify image files exist: `ls client/public/*.{png,jpg}`
3. Check file permissions: `chmod 644 client/public/*`
4. Run with verbose: `node scripts/optimize-images.mjs --verbose`

### CI/CD Not Running

**Problem:** GitHub Actions workflow not triggering

**Solution:**
1. Check workflow file exists: `.github/workflows/optimize-images.yml`
2. Verify branch is main/develop
3. Check file path matches trigger: `client/public/**/*.{png,jpg}`
4. View GitHub Actions tab for logs

## Future Improvements

1. **Brotli Compression** - Add brotli compression for text assets
2. **AVIF Format** - Support newer AVIF format for even better compression
3. **Responsive Images** - Generate multiple sizes for different devices
4. **Image CDN** - Serve images from CDN with automatic optimization
5. **Performance Budgets** - Set maximum image size limits in CI/CD

## References

- [WebP Format](https://developers.google.com/speed/webp)
- [Sharp Library](https://sharp.pixelplumbing.com/)
- [Core Web Vitals](https://web.dev/vitals/)
- [Lazy Loading Images](https://web.dev/lazy-loading-images/)
- [Responsive Images](https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images)
