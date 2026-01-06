import { getStore } from "@netlify/blobs";
import sharp from "sharp";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB for images
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB for videos
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

// Upload optimization settings
const MAX_DIMENSION = 2000; // Max width/height for stored images
const UPLOAD_QUALITY = 85; // Quality for stored images

export default async (req: Request) => {
  // CORS headers
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers,
    });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers,
      });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return new Response(
        JSON.stringify({
          error: "Invalid file type. Allowed: JPEG, PNG, GIF, WebP, MP4, WebM, MOV",
        }),
        { status: 400, headers }
      );
    }

    // Determine max size based on file type
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    const maxSizeLabel = isVideo ? "100MB" : "5MB";

    // Validate file size
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({ error: `File too large. Maximum size is ${maxSizeLabel}` }),
        { status: 400, headers }
      );
    }

    // Get the blob store with site-scoped configuration
    const store = getStore({
      name: "images",
      siteID: process.env.SITE_ID,
    });

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);

    let finalBuffer: ArrayBuffer;
    let finalContentType: string;
    let finalExt: string;

    if (isImage && file.type !== "image/gif") {
      // Optimize images on upload (except GIFs to preserve animation)
      const optimized = await sharp(Buffer.from(arrayBuffer))
        .resize(MAX_DIMENSION, MAX_DIMENSION, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: UPLOAD_QUALITY })
        .toBuffer();

      finalBuffer = optimized.buffer.slice(
        optimized.byteOffset,
        optimized.byteOffset + optimized.byteLength
      ) as ArrayBuffer;
      finalContentType = "image/webp";
      finalExt = "webp";
    } else {
      // Store videos and GIFs as-is
      finalBuffer = arrayBuffer;
      finalContentType = file.type;
      finalExt = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
    }

    // Generate unique key for the file
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 10);
    const key = `uploads/${timestamp}-${randomId}.${finalExt}`;

    await store.set(key, finalBuffer, {
      metadata: {
        contentType: finalContentType,
        originalName: file.name,
      },
    });

    // Construct the public URL - served via the images function with redirect
    const publicUrl = `/images/${key}`;

    return new Response(
      JSON.stringify({
        success: true,
        url: publicUrl,
        key,
      }),
      { status: 201, headers }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to upload file",
        details: String(error),
      }),
      { status: 500, headers }
    );
  }
};
