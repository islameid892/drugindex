#!/usr/bin/env node

import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const URL = 'http://localhost:3000';

async function runLighthouse() {
  console.log('🚀 Starting Lighthouse audit...\n');
  
  let chrome;
  try {
    // Launch Chrome
    chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
    
    // Run Lighthouse
    const options = {
      logLevel: 'info',
      output: 'json',
      port: chrome.port,
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    };

    const runnerResult = await lighthouse(URL, options);
    
    // Extract scores
    const { categories, audits } = runnerResult.lhr;
    
    console.log('📊 LIGHTHOUSE AUDIT RESULTS\n');
    console.log('═'.repeat(50));
    
    // Overall Scores
    console.log('\n🎯 OVERALL SCORES:\n');
    Object.entries(categories).forEach(([key, category]) => {
      const score = Math.round(category.score * 100);
      const status = score >= 90 ? '✅' : score >= 50 ? '⚠️ ' : '❌';
      console.log(`${status} ${category.title.padEnd(20)} ${score}/100`);
    });
    
    // Core Web Vitals
    console.log('\n⚡ CORE WEB VITALS:\n');
    
    const metrics = {
      'largest-contentful-paint': 'Largest Contentful Paint (LCP)',
      'cumulative-layout-shift': 'Cumulative Layout Shift (CLS)',
      'first-input-delay': 'First Input Delay (FID)',
    };
    
    Object.entries(metrics).forEach(([auditKey, label]) => {
      const audit = audits[auditKey];
      if (audit) {
        const value = audit.displayValue || 'N/A';
        const status = audit.score === 1 ? '✅' : audit.score >= 0.5 ? '⚠️ ' : '❌';
        console.log(`${status} ${label.padEnd(35)} ${value}`);
      }
    });
    
    // Performance Opportunities
    console.log('\n💡 TOP PERFORMANCE OPPORTUNITIES:\n');
    
    const opportunities = Object.entries(audits)
      .filter(([, audit]) => audit.details?.type === 'opportunity' && audit.score < 1)
      .sort((a, b) => (b[1].details?.overallSavingsMs || 0) - (a[1].details?.overallSavingsMs || 0))
      .slice(0, 5);
    
    opportunities.forEach(([, audit]) => {
      const savings = audit.details?.overallSavingsMs || 0;
      console.log(`• ${audit.title}`);
      console.log(`  Potential savings: ${savings}ms\n`);
    });
    
    // Save full report
    const reportPath = path.resolve(projectRoot, 'lighthouse-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(runnerResult.lhr, null, 2));
    console.log(`\n📄 Full report saved to: ${reportPath}`);
    
    console.log('\n✅ Lighthouse audit complete!\n');
    
  } catch (error) {
    console.error('❌ Lighthouse audit failed:', error);
  } finally {
    if (chrome) {
      await chrome.kill();
    }
  }
}

runLighthouse();
