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
  const startTime = performance.now();
  const requestId = Math.random().toString(36).substring(2, 8);
  const log = (message: string, data?: Record<string, unknown>) => {
    const elapsed = (performance.now() - startTime).toFixed(1);
    console.log(
      `[${requestId}] [${elapsed}ms] ${message}`,
      data ? JSON.stringify(data) : ""
    );
  };

  const url = new URL(req.url);

  // Extract the key from the path: /images/uploads/timestamp-id.ext
  const pathParts = url.pathname.split("/");
  const keyIndex = pathParts.indexOf("images") + 1;
  const key = pathParts.slice(keyIndex).join("/");

  log("📥 Request received", {
    key,
    query: url.search,
    userAgent: req.headers.get("User-Agent")?.substring(0, 50),
  });

  if (!key) {
    log("❌ No key found, returning 404");
    return new Response("Not found", { status: 404 });
  }

  const acceptHeader = req.headers.get("Accept");
  const options = parseTransformOptions(url, acceptHeader);

  log("⚙️ Parsed options", {
    width: options.width,
    height: options.height,
    quality: options.quality,
    format: options.format,
    fit: options.fit,
    needsTransform: needsTransformation(options),
  });

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

    // If transformation is needed, check cache FIRST (before fetching original)
    if (needsTransformation(options)) {
      const cacheKey = generateCacheKey(key, options);
      log("🔍 Checking cache", { cacheKey });

      try {
        const cacheStart = performance.now();
        const { data: cachedData, metadata: cachedMetadata } =
          await cacheStore.getWithMetadata(cacheKey, {
            type: "arrayBuffer",
          });
        const cacheDuration = (performance.now() - cacheStart).toFixed(1);

        if (cachedData) {
          const cachedContentType =
            (cachedMetadata as { contentType?: string })?.contentType ||
            "image/jpeg";

          log("✅ Cache HIT", {
            cacheLookupMs: cacheDuration,
            size: (cachedData as ArrayBuffer).byteLength,
            contentType: cachedContentType,
          });

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
        log("⚡ Cache MISS", { cacheLookupMs: cacheDuration });
      } catch (cacheError) {
        log("⚠️ Cache lookup error", { error: String(cacheError) });
      }
    }

    // Only fetch original if cache miss or no transformation needed
    log("📦 Fetching original from blob store");
    const fetchStart = performance.now();
    const { data: originalData, metadata } = await imageStore.getWithMetadata(
      key,
      {
        type: "arrayBuffer",
      }
    );
    const fetchDuration = (performance.now() - fetchStart).toFixed(1);

    if (!originalData) {
      log("❌ Original not found in blob store");
      return new Response("Not found", { status: 404 });
    }

    const contentType =
      (metadata as { contentType?: string })?.contentType || "image/jpeg";

    log("📦 Original fetched", {
      fetchMs: fetchDuration,
      size: (originalData as ArrayBuffer).byteLength,
      contentType,
    });

    // If not a transformable image type (e.g., video), serve directly
    if (!TRANSFORMABLE_TYPES.includes(contentType)) {
      log("🎬 Non-transformable type, serving directly", { contentType });
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
      log("📤 No transformation needed, serving original");
      return new Response(originalData, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Generate cache key for transformed image (cache miss path)
    const cacheKey = generateCacheKey(key, options);

    // Transform the image
    log("🔄 Starting transformation");
    const transformStart = performance.now();
    let transformer = sharp(Buffer.from(originalData));

    // Resize if dimensions specified
    if (options.width || options.height) {
      transformer = transformer.resize(options.width, options.height, {
        fit: options.fit,
        withoutEnlargement: true,
      });
    }

    // Convert format and set quality
    const outputFormat =
      options.format || getFormatFromContentType(contentType);
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
    const transformDuration = (performance.now() - transformStart).toFixed(1);

    log("✨ Transformation complete", {
      transformMs: transformDuration,
      originalSize: (originalData as ArrayBuffer).byteLength,
      transformedSize: transformedBuffer.byteLength,
      reduction: `${(
        100 -
        (transformedBuffer.byteLength /
          (originalData as ArrayBuffer).byteLength) *
          100
      ).toFixed(1)}%`,
      outputFormat,
    });

    // Cache the transformed image (async, don't wait)
    // Convert Buffer to ArrayBuffer for Response and blob store compatibility
    const transformedArrayBuffer = transformedBuffer.buffer.slice(
      transformedBuffer.byteOffset,
      transformedBuffer.byteOffset + transformedBuffer.byteLength
    ) as ArrayBuffer;

    log("💾 Caching transformed image", { cacheKey });
    cacheStore
      .set(cacheKey, transformedArrayBuffer, {
        metadata: { contentType: outputContentType },
      })
      .then(() => log("💾 Cache write successful"))
      .catch((err) => log("❌ Cache write failed", { error: String(err) }));

    const totalDuration = (performance.now() - startTime).toFixed(1);
    log("📤 Sending response", {
      totalMs: totalDuration,
      size: transformedArrayBuffer.byteLength,
      contentType: outputContentType,
    });

    return new Response(transformedArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": outputContentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    log("❌ Error serving image", {
      error: String(error),
      stack: (error as Error).stack,
    });
    return new Response("Not found", { status: 404 });
  }
};

function getFormatFromContentType(contentType: string): keyof sharp.FormatEnum {
  const map: Record<string, keyof sharp.FormatEnum> = {
    "image/jpeg": "jpeg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/gif": "gif",
  };
  return map[contentType] || "jpeg";
}
