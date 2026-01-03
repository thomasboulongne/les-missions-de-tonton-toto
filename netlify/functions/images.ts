import { getStore } from "@netlify/blobs";

export default async (req: Request) => {
  const url = new URL(req.url);

  // Extract the key from the path: /images/uploads/timestamp-id.ext
  const pathParts = url.pathname.split("/");
  const keyIndex = pathParts.indexOf("images") + 1;
  const key = pathParts.slice(keyIndex).join("/");

  if (!key) {
    return new Response("Not found", { status: 404 });
  }

  try {
    // Get the blob store with site-scoped configuration
    const store = getStore({
      name: "images",
      siteID: process.env.SITE_ID,
      // token: process.env.BLOB_READ_WRITE_TOKEN || Netlify.env.get('BLOB_READ_WRITE_TOKEN'),
    });

    const { data, metadata } = await store.getWithMetadata(key, {
      type: "arrayBuffer",
    });

    if (!data) {
      return new Response("Not found", { status: 404 });
    }

    const contentType =
      (metadata as { contentType?: string })?.contentType || "image/jpeg";

    return new Response(data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error serving image:", error);
    return new Response("Not found", { status: 404 });
  }
};
