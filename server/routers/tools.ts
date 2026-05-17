import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { PDFDocument } from "pdf-lib";

export const toolsRouter = router({
  imagesToPDF: publicProcedure
    .input(
      z.object({
        images: z.array(
          z.object({
            data: z.string(), // base64 encoded image
            type: z.string(), // image mime type
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Create a new PDF document
        const pdfDoc = await PDFDocument.create();

        // Process each image
        for (const imageData of input.images) {
          try {
            // Decode base64 to buffer
            const base64Data = imageData.data.split(",")[1] || imageData.data;
            const imageBuffer = Buffer.from(base64Data, "base64");

            // Embed image in PDF based on type
            let embeddedImage;
            if (imageData.type === "image/jpeg" || imageData.type === "image/jpg") {
              embeddedImage = await pdfDoc.embedJpg(imageBuffer);
            } else if (imageData.type === "image/png") {
              embeddedImage = await pdfDoc.embedPng(imageBuffer);
            } else if (
              imageData.type === "image/webp" ||
              imageData.type === "image/gif"
            ) {
              // For WebP and GIF, convert to PNG first
              embeddedImage = await pdfDoc.embedPng(imageBuffer);
            } else {
              // Try PNG as fallback
              embeddedImage = await pdfDoc.embedPng(imageBuffer);
            }

            // Add a new page with the image dimensions
            const { width, height } = embeddedImage.scale(1);
            const page = pdfDoc.addPage([width, height]);
            page.drawImage(embeddedImage, {
              x: 0,
              y: 0,
              width,
              height,
            });
          } catch (error) {
            console.error("Error processing image:", error);
            // Continue with next image if one fails
          }
        }

        // Save PDF to buffer
        const pdfBuffer = await pdfDoc.save();

        // Convert to base64 for download
        const base64PDF = Buffer.from(pdfBuffer).toString("base64");
        const dataUrl = `data:application/pdf;base64,${base64PDF}`;

        return {
          url: dataUrl,
          success: true,
        };
      } catch (error) {
        console.error("Error converting images to PDF:", error);
        throw new Error("Failed to convert images to PDF");
      }
    }),
});
