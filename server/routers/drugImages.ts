/**
 * Drug Images Router
 * Handles fetching and managing drug images for Drug Lens
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { drugLens } from "../../drizzle/schema";
import { eq, isNull } from "drizzle-orm";
import { fetchDrugImages } from "../services/drugImageFetcher";

export const drugImagesRouter = router({
  // Get image for a specific drug
  getImage: publicProcedure
    .input(z.object({ drugId: z.number() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        const result = await db
          .select({ imageUrl: drugLens.imageUrl })
          .from(drugLens)
          .where(eq(drugLens.id, input.drugId))
          .limit(1);

        return {
          success: true,
          imageUrl: result[0]?.imageUrl || null,
        };
      } catch (error) {
        console.error("Error fetching drug image:", error);
        return {
          success: false,
          imageUrl: null,
          error: "Failed to fetch image",
        };
      }
    }),

  // Get images for multiple drugs
  getImages: publicProcedure
    .input(z.object({ drugIds: z.array(z.number()) }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        const { inArray } = await import('drizzle-orm');
        const results = await db
          .select({ id: drugLens.id, imageUrl: drugLens.imageUrl })
          .from(drugLens)
          .where(
            inArray(drugLens.id, input.drugIds)
          );

        const imageMap = new Map(results.map((r: any) => [r.id, r.imageUrl]));
        
        return {
          success: true,
          images: input.drugIds.map(id => ({
            drugId: id,
            imageUrl: imageMap.get(id) || null,
          })),
        };
      } catch (error) {
        console.error("Error fetching drug images:", error);
        return {
          success: false,
          images: [],
          error: "Failed to fetch images",
        };
      }
    }),

  // Get count of drugs without images
  getCountWithoutImages: publicProcedure
    .query(async () => {
      try {
        const db = await getDb();
        const result = await db
          .select({ count: drugLens.id })
          .from(drugLens)
          .where(isNull(drugLens.imageUrl));

        return {
          success: true,
          count: result.length,
        };
      } catch (error) {
        console.error("Error counting drugs without images:", error);
        return {
          success: false,
          count: 0,
          error: "Failed to count",
        };
      }
    }),

  // Trigger image fetching (admin only - can be made protected later)
  triggerImageFetch: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(100) }))
    .mutation(async ({ input }) => {
      try {
        console.log(`\n🖼️ Starting image fetch for up to ${input.limit} drugs...`);
        const result = await fetchDrugImages(input.limit);
        
        return {
          success: true,
          message: `Fetched ${result.success} images, ${result.failed} failed`,
          successCount: result.success,
          failedCount: result.failed,
        };
      } catch (error) {
        console.error("Error triggering image fetch:", error);
      return {
        success: false,
        message: "Failed to fetch images",
        successCount: 0,
        failedCount: 0,
        error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),
});
