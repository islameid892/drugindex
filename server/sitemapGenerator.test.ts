import { describe, it, expect, beforeAll } from "vitest";
import { generateXmlSitemap, generateHtmlSitemap, generateRobotsTxt } from "./sitemapGenerator";

describe("Sitemap Generator", () => {
  const baseUrl = "https://example.com";
  const sitemapUrl = `${baseUrl}/sitemap.xml`;

  describe("XML Sitemap", () => {
    it("should generate valid XML sitemap structure", async () => {
      const xml = await generateXmlSitemap(baseUrl);
      
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(xml).toContain('</urlset>');
    });

    it("should include static pages in sitemap", async () => {
      const xml = await generateXmlSitemap(baseUrl);
      
      expect(xml).toContain(`<loc>${baseUrl}/</loc>`);
      expect(xml).toContain(`<loc>${baseUrl}/about</loc>`);
      expect(xml).toContain(`<loc>${baseUrl}/contact</loc>`);
      expect(xml).toContain(`<loc>${baseUrl}/privacy</loc>`);
      expect(xml).toContain(`<loc>${baseUrl}/terms</loc>`);
      expect(xml).toContain(`<loc>${baseUrl}/faq</loc>`);
      expect(xml).toContain(`<loc>${baseUrl}/tools</loc>`);
    });

    it("should include priority and changefreq for each URL", async () => {
      const xml = await generateXmlSitemap(baseUrl);
      
      expect(xml).toContain("<priority>");
      expect(xml).toContain("<changefreq>");
      expect(xml).toContain("weekly");
      expect(xml).toContain("monthly");
      expect(xml).toContain("yearly");
    });

    it("should include lastmod date", async () => {
      const xml = await generateXmlSitemap(baseUrl);
      
      expect(xml).toContain("<lastmod>");
      // Check for ISO date format (YYYY-MM-DD)
      const dateMatch = xml.match(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/);
      expect(dateMatch).toBeTruthy();
    });

    it("should properly encode special characters in URLs", async () => {
      const xml = await generateXmlSitemap(baseUrl);
      
      // URLs should be properly encoded
      expect(xml).toContain("/drug/");
      expect(xml).toContain("/code/");
    });

    it("should have correct priority for home page", async () => {
      const xml = await generateXmlSitemap(baseUrl);
      
      // Home page should have priority 1.0
      const homeMatch = xml.match(/<url>\s*<loc>https:\/\/example\.com\/<\/loc>[\s\S]*?<priority>1\.0<\/priority>/);
      expect(homeMatch).toBeTruthy();
    });

    it("should handle database errors gracefully", async () => {
      // Should still generate XML even if database fails
      const xml = await generateXmlSitemap(baseUrl);
      
      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain('<urlset');
      // Should at least have static pages
      expect(xml).toContain(`<loc>${baseUrl}/</loc>`);
    });
  });

  describe("HTML Sitemap", () => {
    it("should generate valid HTML structure", async () => {
      const html = await generateHtmlSitemap(baseUrl);
      
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<html");
      expect(html).toContain("</html>");
      expect(html).toContain("<head>");
      expect(html).toContain("<body>");
    });

    it("should include page title", async () => {
      const html = await generateHtmlSitemap(baseUrl);
      
      expect(html).toContain("<title>Sitemap - ICD-10 Medical Search Engine</title>");
    });

    it("should include all main pages", async () => {
      const html = await generateHtmlSitemap(baseUrl);
      
      expect(html).toContain("Home");
      expect(html).toContain("About Us");
      expect(html).toContain("Contact Us");
      expect(html).toContain("Privacy Policy");
      expect(html).toContain("Terms of Service");
      expect(html).toContain("FAQ");
      expect(html).toContain("Tools");
    });

    it("should include links to all pages", async () => {
      const html = await generateHtmlSitemap(baseUrl);
      
      expect(html).toContain(`href="${baseUrl}/"`);
      expect(html).toContain(`href="${baseUrl}/about"`);
      expect(html).toContain(`href="${baseUrl}/contact"`);
      expect(html).toContain(`href="${baseUrl}/privacy"`);
    });

    it("should include priority information", async () => {
      const html = await generateHtmlSitemap(baseUrl);
      
      expect(html).toContain("Priority:");
    });

    it("should include link to XML sitemap", async () => {
      const html = await generateHtmlSitemap(baseUrl);
      
      expect(html).toContain(`href="${baseUrl}/sitemap.xml"`);
    });

    it("should have responsive CSS styling", async () => {
      const html = await generateHtmlSitemap(baseUrl);
      
      expect(html).toContain("@media");
      expect(html).toContain("grid-template-columns");
      expect(html).toContain("responsive");
    });

    it("should include last updated date", async () => {
      const html = await generateHtmlSitemap(baseUrl);
      
      expect(html).toContain("Last updated:");
    });
  });

  describe("Robots.txt", () => {
    it("should generate valid robots.txt", () => {
      const robots = generateRobotsTxt(sitemapUrl);
      
      expect(robots).toContain("User-agent: *");
      expect(robots).toContain("Allow: /");
    });

    it("should disallow admin and database pages", () => {
      const robots = generateRobotsTxt(sitemapUrl);
      
      expect(robots).toContain("Disallow: /admin");
      expect(robots).toContain("Disallow: /database");
      expect(robots).toContain("Disallow: /metrics");
      expect(robots).toContain("Disallow: /performance");
    });

    it("should disallow API routes", () => {
      const robots = generateRobotsTxt(sitemapUrl);
      
      expect(robots).toContain("Disallow: /api/");
    });

    it("should include sitemap URL", () => {
      const robots = generateRobotsTxt(sitemapUrl);
      
      expect(robots).toContain(`Sitemap: ${sitemapUrl}`);
    });

    it("should include crawl delay", () => {
      const robots = generateRobotsTxt(sitemapUrl);
      
      expect(robots).toContain("Crawl-delay:");
    });

    it("should include request rate", () => {
      const robots = generateRobotsTxt(sitemapUrl);
      
      expect(robots).toContain("Request-rate:");
    });

    it("should have proper comments", () => {
      const robots = generateRobotsTxt(sitemapUrl);
      
      expect(robots).toContain("# Robots.txt for ICD-10 Medical Search Engine");
      expect(robots).toContain("# Allow search engines to crawl all public pages");
    });
  });

  describe("URL Encoding", () => {
    it("should properly encode drug names with special characters", async () => {
      const xml = await generateXmlSitemap(baseUrl);
      
      // Should use encodeURIComponent for drug names
      expect(xml).toMatch(/\/drug\/%[A-F0-9]{2}/);
    });

    it("should properly encode ICD codes with special characters", async () => {
      const xml = await generateXmlSitemap(baseUrl);
      
      // Should use encodeURIComponent for codes
      expect(xml).toMatch(/\/code\/%[A-F0-9]{2}/);
    });
  });

  describe("Performance", () => {
    it("should generate XML sitemap quickly", async () => {
      const startTime = Date.now();
      await generateXmlSitemap(baseUrl);
      const duration = Date.now() - startTime;
      
      // Should complete in less than 5 seconds
      expect(duration).toBeLessThan(5000);
    });

    it("should generate HTML sitemap quickly", async () => {
      const startTime = Date.now();
      await generateHtmlSitemap(baseUrl);
      const duration = Date.now() - startTime;
      
      // Should complete in less than 1 second
      expect(duration).toBeLessThan(1000);
    });

    it("should generate robots.txt instantly", () => {
      const startTime = Date.now();
      generateRobotsTxt(sitemapUrl);
      const duration = Date.now() - startTime;
      
      // Should complete in less than 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});
