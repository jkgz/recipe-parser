import { createClient } from "@/lib/supabase/server";
import { parseRecipeFromUrl } from "@/lib/parse-recipe";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const url = body.url;
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    const parsed = await parseRecipeFromUrl(url);

    // Download and upload image to Supabase Storage
    let imagePath: string | null = null;
    if (parsed.image_url) {
      try {
        const imageResp = await fetch(parsed.image_url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          },
        });
        if (imageResp.ok) {
          const contentType =
            imageResp.headers.get("content-type") ?? "image/jpeg";
          const ext = contentType.includes("png")
            ? ".png"
            : contentType.includes("webp")
              ? ".webp"
              : ".jpg";
          const buffer = await imageResp.arrayBuffer();
          const fileName = `${parsed.slug}${ext}`;

          const { error: uploadError } = await supabase.storage
            .from("recipe-images")
            .upload(fileName, buffer, {
              contentType,
              upsert: true,
            });

          if (!uploadError) {
            const {
              data: { publicUrl },
            } = supabase.storage
              .from("recipe-images")
              .getPublicUrl(fileName);
            imagePath = publicUrl;
          }
        }
      } catch {
        // Image download failed — continue without image
      }
    }

    return NextResponse.json({ ...parsed, image_path: imagePath });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to parse recipe";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
