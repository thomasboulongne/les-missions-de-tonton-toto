import { getStore } from "@netlify/blobs";
import sharp from "sharp";

// Supported image formats for transformation
const TRANSFORMABLE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
];

// Output format mapping
const FORMAT_MAP: Record<string, keyof sharp.FormatEnum> = {
  webp: "webp",
  avif: "avif",
  jpeg: "jpeg",
  jpg: "jpeg",
  png: "png",
};

// Content-Type mapping
const CONTENT_TYPE_MAP: Record<string, string> = {
  webp: "image/webp",
  avif: "image/avif",
  jpeg: "image/jpeg",
  png: "image/png",
};

interface TransformOptions {
  width?: number;
  height?: number;
  quality: number;
  format?: keyof sharp.FormatEnum;
  fit: keyof sharp.FitEnum;
}

function parseTransformOptions(
  url: URL,
  acceptHeader: string | null
): TransformOptions {
  const params = url.searchParams;

  // Parse width (max 2000px)
  const w = params.get("w");
  const width = w ? Math.min(Math.max(1, parseInt(w, 10)), 2000) : undefined;

  // Parse height (max 2000px)
  const h = params.get("h");
  const height = h ? Math.min(Math.max(1, parseInt(h, 10)), 2000) : undefined;

  // Parse quality (1-100, default 80)
  const q = params.get("q");
  const quality = q ? Math.min(Math.max(1, parseInt(q, 10)), 100) : 80;

  // Parse fit mode
  const fitParam = params.get("fit");
  const validFits: (keyof sharp.FitEnum)[] = [
    "cover",
    "contain",
    "fill",
    "inside",
    "outside",
  ];
  const fit: keyof sharp.FitEnum =
    fitParam && validFits.includes(fitParam as keyof sharp.FitEnum)
      ? (fitParam as keyof sharp.FitEnum)
      : "cover";

  // Parse format or auto-detect from Accept header
  const f = params.get("f");
  let format: keyof sharp.FormatEnum | undefined;

  if (f && FORMAT_MAP[f]) {
    format = FORMAT_MAP[f];
  } else if (!f) {
    // Auto-detect best format from Accept header
    if (acceptHeader?.includes("image/avif")) {
      format = "avif";
    } else if (acceptHeader?.includes("image/webp")) {
      format = "webp";
    }
    // Otherwise keep original format
  }

  return { width, height, quality, format, fit };
}

function generateCacheKey(
  originalKey: string,
  options: TransformOptions
): string {
  const parts = [originalKey];

  if (options.width || options.height) {
    parts.push(`${options.width || "auto"}x${options.height || "auto"}`);
  }

  parts.push(`q${options.quality}`);

  if (options.format) {
    parts.push(options.format);
  }

  parts.push(options.fit);

  return `transformed/${parts.join("-")}`;
}

function needsTransformation(options: TransformOptions): boolean {
  return !!(options.width || options.height || options.format);
}

export default async (req: Request) => {
  const url = new URL(req.url);

  // Extract the key from the path: /images/uploads/timestamp-id.ext
  const pathParts = url.pathname.split("/");
  const keyIndex = pathParts.indexOf("images") + 1;
  const key = pathParts.slice(keyIndex).join("/");

  if (!key) {
    return new Response("Not found", { status: 404 });
  }

  const acceptHeader = req.headers.get("Accept");
  const options = parseTransformOptions(url, acceptHeader);

  try {
    // Get blob stores
    const imageStore = getStore({
      name: "images",
      siteID: process.env.SITE_ID,
    });

    const cacheStore = getStore({
      name: "images-cache",
      siteID: process.env.SITE_ID,
    });

    // Fetch original image metadata first to check content type
    const { data: originalData, metadata } = await imageStore.getWithMetadata(
      key,
      {
        type: "arrayBuffer",
      }
    );

    if (!originalData) {
      return new Response("Not found", { status: 404 });
    }

    const contentType =
      (metadata as { contentType?: string })?.contentType || "image/jpeg";

    // If not a transformable image type (e.g., video), serve directly
    if (!TRANSFORMABLE_TYPES.includes(contentType)) {
      return new Response(originalData, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // If no transformation needed, serve original
    if (!needsTransformation(options)) {
      return new Response(originalData, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Generate cache key for transformed image
    const cacheKey = generateCacheKey(key, options);

    // Check cache for transformed image
    try {
      const { data: cachedData, metadata: cachedMetadata } =
        await cacheStore.getWithMetadata(cacheKey, {
          type: "arrayBuffer",
        });

      if (cachedData) {
        const cachedContentType =
          (cachedMetadata as { contentType?: string })?.contentType ||
          contentType;

        return new Response(cachedData, {
          status: 200,
          headers: {
            "Content-Type": cachedContentType,
            "Cache-Control": "public, max-age=31536000, immutable",
            "Access-Control-Allow-Origin": "*",
            "X-Cache": "HIT",
          },
        });
      }
    } catch {
      // Cache miss or error, continue to transform
    }

    // Transform the image
    let transformer = sharp(Buffer.from(originalData));

    // Resize if dimensions specified
    if (options.width || options.height) {
      transformer = transformer.resize(options.width, options.height, {
        fit: options.fit,
        withoutEnlargement: true,
      });
    }

    // Convert format and set quality
    const outputFormat = options.format || getFormatFromContentType(contentType);
    const outputContentType = CONTENT_TYPE_MAP[outputFormat] || contentType;

    switch (outputFormat) {
      case "webp":
        transformer = transformer.webp({ quality: options.quality });
        break;
      case "avif":
        transformer = transformer.avif({ quality: options.quality });
        break;
      case "png":
        transformer = transformer.png({
          quality: options.quality,
          compressionLevel: 9,
        });
        break;
      case "jpeg":
      default:
        transformer = transformer.jpeg({ quality: options.quality });
        break;
    }

    const transformedBuffer = await transformer.toBuffer();

    // Cache the transformed image (async, don't wait)
    cacheStore
      .set(cacheKey, transformedBuffer, {
        metadata: { contentType: outputContentType },
      })
      .catch((err) => console.error("Failed to cache transformed image:", err));

    return new Response(transformedBuffer, {
      status: 200,
      headers: {
        "Content-Type": outputContentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("Error serving image:", error);
    return new Response("Not found", { status: 404 });
  }
};

function getFormatFromContentType(
  contentType: string
): keyof sharp.FormatEnum {
  const map: Record<string, keyof sharp.FormatEnum> = {
    "image/jpeg": "jpeg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/gif": "gif",
  };
  return map[contentType] || "jpeg";
}
