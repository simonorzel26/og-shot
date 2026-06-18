import sharp from "sharp";
import type { OutputOptions, Target } from "./types.js";

/**
 * Downscale the captured buffer to the target output size with a Lanczos3
 * kernel (sharp text on shrink) and encode it. When optimization is disabled
 * and the capture already matches the output size, the raw buffer is returned.
 */
export async function optimize(
  captured: Buffer,
  target: Target,
  output: OutputOptions = {},
): Promise<Buffer> {
  const { width, height, captureWidth, captureHeight, deviceScaleFactor } =
    target.resolution;
  const format = output.format ?? "png";
  const optimizeEnabled = output.optimize ?? true;

  const alreadyExact =
    captureWidth * deviceScaleFactor === width &&
    captureHeight * deviceScaleFactor === height;
  if (!optimizeEnabled && alreadyExact) return captured;

  const pipeline = sharp(captured).resize(width, height, { kernel: "lanczos3" });

  if (format === "jpeg") {
    return pipeline.jpeg({ quality: output.quality ?? 90, mozjpeg: true }).toBuffer();
  }
  return pipeline
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })
    .toBuffer();
}
