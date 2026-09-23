import { NextResponse } from "next/server";

import { requirePermission, serviceSupabase } from "@/lib/admin";

type GalleryMetadata = {
  stableIndex: number;
  clientId: string;
};

type GalleryResult = {
  fileName: string;
  success: boolean;
  imageId?: string;
  error?: string;
};

function getExtension(fileName: string, contentType: string) {
  const fromName = fileName.split(".").pop()?.toLowerCase();

  if (fromName && /^[a-z0-9]+$/.test(fromName)) {
    return fromName;
  }

  const fromType = contentType.split("/")[1]?.toLowerCase();

  if (fromType && /^[a-z0-9]+$/.test(fromType)) {
    return fromType === "jpeg" ? "jpg" : fromType;
  }

  return "bin";
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requirePermission("media.upload");
  if (access.response) return access.response;
  const { supabase } = access;

  const service = serviceSupabase();

  if (!service) {
    return NextResponse.json(
      { error: "Server storage configuration is missing." },
      { status: 500 }
    );
  }

  const { id: productId } = await params;

  const { data: product, error: productError } = await service
    .from("products")
    .select("id")
    .eq("id", productId)
    .maybeSingle();

  if (productError) {
    return NextResponse.json(
      { error: productError.message },
      { status: 500 }
    );
  }

  if (!product) {
    return NextResponse.json(
      { error: "Product not found." },
      { status: 404 }
    );
  }

  const formData = await req.formData();

  const files = formData
    .getAll("files")
    .filter((value): value is File => value instanceof File);

  if (!files.length) {
    return NextResponse.json(
      { error: "No gallery files were provided." },
      { status: 400 }
    );
  }

  const metadataRaw = formData.get("metadata");

  let metadata: GalleryMetadata[];

  try {
    metadata = metadataRaw
      ? (JSON.parse(String(metadataRaw)) as GalleryMetadata[])
      : [];
  } catch {
    return NextResponse.json(
      { error: "Invalid gallery metadata." },
      { status: 400 }
    );
  }

  if (metadata.length !== files.length) {
    return NextResponse.json(
      { error: "Gallery files and metadata count do not match." },
      { status: 400 }
    );
  }

  if (files.length > 3) {
    return NextResponse.json(
      { error: "Gallery batches may contain at most 3 files." },
      { status: 400 }
    );
  }

  const results: GalleryResult[] = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const item = metadata[index];

    if (!item || !Number.isInteger(item.stableIndex) || !item.clientId) {
      results.push({
        fileName: file.name,
        success: false,
        error: "Invalid gallery metadata for this file.",
      });
      continue;
    }

    if (!file.type.startsWith("image/")) {
      results.push({
        fileName: file.name,
        success: false,
        error: "Only image files are allowed.",
      });
      continue;
    }

    const extension = getExtension(file.name, file.type);

    const storagePath =
      `products/${productId}/gallery/` +
      `${item.stableIndex}-${item.clientId}.${extension}`;

    try {
      /*
       * Duplicate protection:
       * The client keeps the same clientId when retrying a file.
       * Therefore the generated Storage path stays identical.
       *
       * Check product_images first so a successful previous attempt
       * does not create another database row.
       */
      const { data: existingImage, error: existingError } = await service
        .from("product_images")
        .select("id,image_url")
        .eq("product_id", productId)
        .eq("image_url", `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/trinity-media/${storagePath}`)
        .maybeSingle();

      if (existingError) {
        throw new Error(existingError.message);
      }

      if (existingImage) {
        results.push({
          fileName: file.name,
          success: true,
          imageId: existingImage.id,
        });
        continue;
      }

      const fileBuffer = await file.arrayBuffer();

      const { error: uploadError } = await service.storage
        .from("trinity-media")
        .upload(storagePath, fileBuffer, {
          contentType: file.type,
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const {
        data: { publicUrl },
      } = service.storage
        .from("trinity-media")
        .getPublicUrl(storagePath);

      const { data: imageRow, error: insertError } = await service
        .from("product_images")
        .insert({
          product_id: productId,
          image_url: publicUrl,
          sort_order: item.stableIndex,
          alt_text: file.name,
        })
        .select("id")
        .single();

      if (insertError) {
        await service.storage
          .from("trinity-media")
          .remove([storagePath]);

        throw new Error(insertError.message);
      }

      results.push({
        fileName: file.name,
        success: true,
        imageId: imageRow.id,
      });
    } catch (error) {
      results.push({
        fileName: file.name,
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Gallery upload failed.",
      });
    }
  }

  const successCount = results.filter((result) => result.success).length;

  return NextResponse.json(
    {
      results,
      successCount,
      failedCount: results.length - successCount,
    },
    { status: 200 }
  );
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requirePermission("media.delete");
  if (access.response) return access.response;
  const { supabase } = access;

  const { id: productId } = await params;

  const body = await req.json();

  if (!Array.isArray(body.images)) {
    return NextResponse.json(
      { error: "Invalid gallery order payload." },
      { status: 400 }
    );
  }

  for (let index = 0; index < body.images.length; index += 1) {
    const image = body.images[index];

    if (!image?.id) continue;

    const { error } = await supabase
      .from("product_images")
      .update({ sort_order: index })
      .eq("id", image.id)
      .eq("product_id", productId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requirePermission("media.upload");
  if (access.response) return access.response;
  const { supabase } = access;

  const service = serviceSupabase();

  if (!service) {
    return NextResponse.json(
      { error: "Server storage configuration is missing." },
      { status: 500 }
    );
  }

  const { id: productId } = await params;

  const url = new URL(req.url);
  const imageId = url.searchParams.get("imageId");

  if (!imageId) {
    return NextResponse.json(
      { error: "imageId is required." },
      { status: 400 }
    );
  }

  const { data: image, error: imageError } = await service
    .from("product_images")
    .select("id,image_url")
    .eq("id", imageId)
    .eq("product_id", productId)
    .maybeSingle();

  if (imageError) {
    return NextResponse.json(
      { error: imageError.message },
      { status: 400 }
    );
  }

  if (!image) {
    return NextResponse.json(
      { error: "Gallery image not found." },
      { status: 404 }
    );
  }

  const { error: deleteError } = await service
    .from("product_images")
    .delete()
    .eq("id", imageId)
    .eq("product_id", productId);

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message },
      { status: 400 }
    );
  }

  try {
    const publicMarker =
      "/storage/v1/object/public/trinity-media/";

    const markerIndex = image.image_url.indexOf(publicMarker);

    if (markerIndex !== -1) {
      const storagePath = decodeURIComponent(
        image.image_url.slice(markerIndex + publicMarker.length)
      );

      await service.storage
        .from("trinity-media")
        .remove([storagePath]);
    }
  } catch (error) {
    console.error("[Gallery] Storage cleanup failed", error);
  }

  return NextResponse.json({ ok: true });
}