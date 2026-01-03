import type { Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export default async (req: Request, context: Context) => {
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers,
    });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers,
      });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP',
        }),
        { status: 400, headers }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: 'File too large. Maximum size is 5MB' }),
        { status: 400, headers }
      );
    }

    // Generate unique key for the file
    const ext = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 10);
    const key = `uploads/${timestamp}-${randomId}.${ext}`;

    // Get the blob store
    const store = getStore('images');

    // Convert file to ArrayBuffer and store
    const arrayBuffer = await file.arrayBuffer();
    await store.set(key, arrayBuffer, {
      metadata: {
        contentType: file.type,
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
    console.error('Upload error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to upload file',
        details: String(error),
      }),
      { status: 500, headers }
    );
  }
};

