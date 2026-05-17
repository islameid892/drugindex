import { getDb } from "./db";
import { drugEntries, icdCodes } from "../drizzle/schema";

interface SitemapEntry {
  url: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

export async function generateXmlSitemap(baseUrl: string): Promise<string> {
  const entries: SitemapEntry[] = [];
  
  const staticPages: SitemapEntry[] = [
    { url: "/", priority: 1.0, changefreq: "weekly" },
    { url: "/about", priority: 0.8, changefreq: "monthly" },
    { url: "/contact", priority: 0.8, changefreq: "monthly" },
    { url: "/privacy", priority: 0.7, changefreq: "yearly" },
    { url: "/terms", priority: 0.7, changefreq: "yearly" },
    { url: "/faq", priority: 0.8, changefreq: "monthly" },
    { url: "/tools", priority: 0.7, changefreq: "monthly" },
    { url: "/tools/image-to-pdf", priority: 0.6, changefreq: "monthly" },
    { url: "/tools/merge-pdf", priority: 0.6, changefreq: "monthly" },
    { url: "/drug-lens", priority: 0.7, changefreq: "weekly" },
    { url: "/favorites", priority: 0.5, changefreq: "weekly" },
  ];
  
  entries.push(...staticPages);
  
  try {
    const db = await getDb();
    
    const drugs = await db
      .select({ tradeName: drugEntries.tradeName })
      .from(drugEntries)
      .limit(10000);
    
    const uniqueDrugs = Array.from(new Set(drugs.map((d: any) => d.tradeName)));
    
    uniqueDrugs.forEach((drugName: any) => {
      entries.push({
        url: `/drug/${encodeURIComponent(drugName)}`,
        priority: 0.6,
        changefreq: "weekly",
      });
    });
    
    const codes = await db
      .select({ code: icdCodes.code })
      .from(icdCodes)
      .limit(10000);
    
    const uniqueCodes = Array.from(new Set(codes.map((c: any) => c.code)));
    
    uniqueCodes.forEach((code: any) => {
      entries.push({
        url: `/code/${encodeURIComponent(code)}`,
        priority: 0.5,
        changefreq: "monthly",
      });
    });
  } catch (error) {
    console.error("Error generating dynamic sitemap entries:", error);
  }
  
  const now = new Date().toISOString().split("T")[0];
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  entries.forEach(entry => {
    xml += "  <url>\n";
    xml += `    <loc>${baseUrl}${entry.url}</loc>\n`;
    xml += `    <lastmod>${entry.lastmod || now}</lastmod>\n`;
    if (entry.changefreq) {
      xml += `    <changefreq>${entry.changefreq}</changefreq>\n`;
    }
    if (entry.priority) {
      xml += `    <priority>${entry.priority}</priority>\n`;
    }
    xml += "  </url>\n";
  });
  
  xml += "</urlset>";
  
  return xml;
}

export async function generateHtmlSitemap(baseUrl: string): Promise<string> {
  const staticPages = [
    { url: "/", title: "Home", priority: 1.0 },
    { url: "/about", title: "About Us", priority: 0.8 },
    { url: "/contact", title: "Contact Us", priority: 0.8 },
    { url: "/privacy", title: "Privacy Policy", priority: 0.7 },
    { url: "/terms", title: "Terms of Service", priority: 0.7 },
    { url: "/faq", title: "FAQ", priority: 0.8 },
    { url: "/tools", title: "Tools", priority: 0.7 },
    { url: "/tools/image-to-pdf", title: "Image to PDF Converter", priority: 0.6 },
    { url: "/tools/merge-pdf", title: "PDF Merger", priority: 0.6 },
    { url: "/drug-lens", title: "Drug Lens", priority: 0.7 },
    { url: "/favorites", title: "My Favorites", priority: 0.5 },
  ];
  
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sitemap - ICD-10 Medical Search Engine</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); min-height: 100vh; padding: 40px 20px; }
    .container { max-width: 900px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; }
    .header h1 { font-size: 32px; margin-bottom: 10px; }
    .header p { font-size: 16px; opacity: 0.9; }
    .content { padding: 40px; }
    .section { margin-bottom: 40px; }
    .section h2 { font-size: 20px; color: #333; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #667eea; }
    .links-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px; }
    .link-item { padding: 12px 16px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #667eea; transition: all 0.3s ease; }
    .link-item:hover { background: #e9ecef; transform: translateX(4px); }
    .link-item a { color: #667eea; text-decoration: none; font-weight: 500; }
    .link-item a:hover { text-decoration: underline; }
    .link-priority { font-size: 12px; color: #999; margin-top: 4px; }
    .footer { background: #f8f9fa; padding: 20px 40px; text-align: center; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🗺️ Sitemap</h1>
      <p>ICD-10 Medical Search Engine - Complete Site Map</p>
    </div>
    <div class="content">
      <div class="section">
        <h2>Main Pages</h2>
        <div class="links-grid">
`;

  staticPages.forEach(page => {
    html += `          <div class="link-item">
            <a href="${baseUrl}${page.url}">${page.title}</a>
            <div class="link-priority">Priority: ${page.priority}</div>
          </div>\n`;
  });

  html += `        </div>
      </div>
      <div class="section">
        <h2>Information</h2>
        <p style="color: #666; line-height: 1.6;">
          This sitemap provides a complete list of pages available on the ICD-10 Medical Search Engine. 
          For a complete list of all indexed pages, please refer to our 
          <a href="${baseUrl}/sitemap.xml" style="color: #667eea; text-decoration: none;">XML Sitemap</a>.
        </p>
      </div>
    </div>
    <div class="footer">
      <p>Last updated: ${new Date().toLocaleDateString()} | 
      <a href="${baseUrl}/sitemap.xml" style="color: #667eea; text-decoration: none;">XML Sitemap</a></p>
    </div>
  </div>
</body>
</html>`;

  return html;
}

export function generateRobotsTxt(sitemapUrl: string): string {
  return `# Robots.txt for ICD-10 Medical Search Engine
User-agent: *
Allow: /
Disallow: /admin
Disallow: /database
Disallow: /metrics
Disallow: /performance
Disallow: /*.json$
Disallow: /api/

Sitemap: ${sitemapUrl}
Crawl-delay: 1
Request-rate: 1/1s
`;
}
