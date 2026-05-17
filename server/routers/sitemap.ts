import { publicProcedure, router } from "../_core/trpc";
import { generateXmlSitemap, generateHtmlSitemap, generateRobotsTxt } from "../sitemapGenerator";

export const sitemapRouter = router({
  getXmlSitemap: publicProcedure.query(async ({ ctx }) => {
    // Get base URL from request headers or environment
    const protocol = ctx.req.headers["x-forwarded-proto"] || "https";
    const host = ctx.req.headers["x-forwarded-host"] || ctx.req.headers.host || "localhost:3000";
    const baseUrl = `${protocol}://${host}`;
    
    const xmlContent = await generateXmlSitemap(baseUrl);
    return { content: xmlContent, contentType: "application/xml" };
  }),

  getHtmlSitemap: publicProcedure.query(async ({ ctx }) => {
    const protocol = ctx.req.headers["x-forwarded-proto"] || "https";
    const host = ctx.req.headers["x-forwarded-host"] || ctx.req.headers.host || "localhost:3000";
    const baseUrl = `${protocol}://${host}`;
    
    const htmlContent = await generateHtmlSitemap(baseUrl);
    return { content: htmlContent, contentType: "text/html" };
  }),

  getRobotsTxt: publicProcedure.query(async ({ ctx }) => {
    const protocol = ctx.req.headers["x-forwarded-proto"] || "https";
    const host = ctx.req.headers["x-forwarded-host"] || ctx.req.headers.host || "localhost:3000";
    const baseUrl = `${protocol}://${host}`;
    const sitemapUrl = `${baseUrl}/sitemap.xml`;
    
    const robotsContent = generateRobotsTxt(sitemapUrl);
    return { content: robotsContent, contentType: "text/plain" };
  }),
});
