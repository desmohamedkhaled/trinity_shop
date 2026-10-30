import { NextResponse } from "next/server";

import { requirePermission, serviceSupabase } from "@/lib/admin";
import { getImageFileExtension, validateImageFile } from "@/lib/image-upload";

type GalleryMetadata = {
  stableIndex: number;
  clientId: string;
};

type VariantGalleryMetadata = GalleryMetadata & { variantId: string };

type GalleryResult = {
  fileName: string;
  success: boolean;
  imageId?: string;
  error?: string;
};

function galleryErrorMessage(error: { code?: string; message: string }) {
  return error.message.includes("available_quantity")
    ? "The local image availability migration is not applied. Apply it to this DEV database only after approval before saving image assignments or quantities."
    : error.message;
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
  const variantId = String(formData.get("variant_id") || "").trim();
  let variant: { id: string; product_id: string } | null = null;
  if (variantId) {
    const { data, error } = await service
      .from("product_variants")
      .select("id, product_id")
      .eq("id", variantId)
      .eq("product_id", productId)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ error: "Variant not found for this product." }, { status: 404 });
    variant = data;
  }

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

    const validationError = await validateImageFile(file);
    if (validationError) {
      results.push({
        fileName: file.name,
        success: false,
        error: validationError,
      });
      continue;
    }

    const extension = getImageFileExtension(file.type);
    if (!extension) {
      results.push({
        fileName: file.name,
        success: false,
        error: "Only PNG, JPEG, and WebP images are allowed.",
      });
      continue;
    }

    const storagePath =
      `products/${productId}/${variant ? `variants/${variant.id}/` : "gallery/"}` +
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
      const imageTable = variant ? "product_variant_images" : "product_images";
      const imageQuery = service
        .from(imageTable)
        .select("id,image_url")
        .eq(variant ? "variant_id" : "product_id", variant ? variant.id : productId)
        .eq("image_url", `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/trinity-media/${storagePath}`)
        .maybeSingle();
      const { data: existingImage, error: existingError } = await imageQuery;

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
        .from(imageTable)
        .insert({
          ...(variant ? { variant_id: variant.id } : { product_id: productId }),
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
  const access = await requirePermission("media.upload");
  if (access.response) return access.response;
  const { supabase } = access;

  const { id: productId } = await params;

  let body: { variantId?: unknown; images?: unknown; assignments?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid gallery payload." }, { status: 400 });
  }

  if (typeof body.variantId === "string") {
    const { data: variant, error: variantError } = await supabase
      .from("product_variants")
      .select("id")
      .eq("id", body.variantId)
      .eq("product_id", productId)
      .maybeSingle();
    if (variantError || !variant) return NextResponse.json({ error: variantError?.message || "Variant not found." }, { status: 400 });

    if (Array.isArray(body.assignments)) {
      const assignments = body.assignments;
      if (assignments.some((item) =>
        !item ||
        typeof item !== "object" ||
        typeof item.id !== "string" ||
        !Number.isInteger(item.available_quantity) ||
        item.available_quantity < 0
      )) {
        return NextResponse.json({ error: "Each assigned image needs a non-negative integer availability quantity." }, { status: 400 });
      }
      const assignmentIds = assignments.map((item) => item.id);
      if (new Set(assignmentIds).size !== assignmentIds.length) {
        return NextResponse.json({ error: "Assigned image IDs must be unique." }, { status: 400 });
      }
      if (assignmentIds.length) {
        const { data: existingAssignments, error: assignmentError } = await supabase
          .from("product_variant_images")
          .select("id, variant_id, image_url, alt_text, sort_order")
          .eq("variant_id", body.variantId)
          .in("id", assignmentIds);
        if (assignmentError) return NextResponse.json({ error: galleryErrorMessage(assignmentError) }, { status: 400 });
        if ((existingAssignments ?? []).length !== assignmentIds.length) {
          return NextResponse.json({ error: "One or more assigned images do not belong to this option." }, { status: 400 });
        }
        const assignmentsById = new Map((existingAssignments ?? []).map((item) => [item.id, item]));
        const { error: updateError } = await supabase
          .from("product_variant_images")
          .upsert(assignments.map((item) => ({
            ...assignmentsById.get(item.id),
            available_quantity: item.available_quantity,
          })), { onConflict: "id" });
        if (updateError) return NextResponse.json({ error: galleryErrorMessage(updateError) }, { status: 400 });
      }
      const { data: savedAssignments, error: savedError } = await supabase
        .from("product_variant_images")
        .select("id, variant_id, image_url, alt_text, sort_order, available_quantity")
        .eq("variant_id", body.variantId)
        .order("sort_order");
      if (savedError) return NextResponse.json({ error: galleryErrorMessage(savedError) }, { status: 400 });
      return NextResponse.json({ ok: true, assignments: savedAssignments ?? [] });
    }

    if (!Array.isArray(body.images)) {
      return NextResponse.json({ error: "Invalid existing-image assignment payload." }, { status: 400 });
    }
    if (body.images.some((image) => !image || typeof image !== "object" || typeof image.id !== "string")) {
      return NextResponse.json({ error: "Each source gallery image must have a valid ID." }, { status: 400 });
    }
    const sourceIds = body.images.map((image) => image.id);
    if (new Set(sourceIds).size !== sourceIds.length) {
      return NextResponse.json({ error: "Source gallery image IDs must be unique." }, { status: 400 });
    }
    let sourceImages: { id: string; image_url: string; alt_text: string | null; sort_order: number }[] = [];
    if (sourceIds.length) {
      const { data, error: sourceError } = await supabase
        .from("product_images")
        .select("id,image_url,alt_text,sort_order")
        .eq("product_id", productId)
        .in("id", sourceIds);
      if (sourceError) return NextResponse.json({ error: sourceError.message }, { status: 400 });
      if ((data ?? []).length !== sourceIds.length) {
        return NextResponse.json({ error: "One or more images are not in this product's shared gallery." }, { status: 400 });
      }
      const imagesById = new Map((data ?? []).map((image) => [image.id, image]));
      for (const id of sourceIds) {
        const image = imagesById.get(id);
        if (image) sourceImages.push(image);
      }
    }

    const { data: galleryImages, error: galleryError } = await supabase
      .from("product_images")
      .select("image_url")
      .eq("product_id", productId);
    if (galleryError) return NextResponse.json({ error: galleryError.message }, { status: 400 });

    const { data: existingAssignments, error: existingError } = await supabase
      .from("product_variant_images")
      .select("id,image_url,available_quantity")
      .eq("variant_id", body.variantId);
    if (existingError) return NextResponse.json({ error: galleryErrorMessage(existingError) }, { status: 400 });

    const quantitiesByUrl = new Map((existingAssignments ?? []).map((image) => [image.image_url, image.available_quantity]));
    const { error: copyError } = await supabase.from("product_variant_images").upsert(
      sourceImages.map((image, index) => ({
          variant_id: body.variantId,
          image_url: image.image_url,
          alt_text: image.alt_text,
          sort_order: index,
          available_quantity: quantitiesByUrl.get(image.image_url) ?? 0,
      })),
      { onConflict: "variant_id,image_url" },
    );
    if (copyError) return NextResponse.json({ error: galleryErrorMessage(copyError) }, { status: 400 });

    const galleryUrls = new Set((galleryImages ?? []).map((image) => image.image_url));
    const selectedUrls = new Set(sourceImages.map((image) => image.image_url));
    const removedAssignmentIds = (existingAssignments ?? [])
      .filter((image) => galleryUrls.has(image.image_url) && !selectedUrls.has(image.image_url))
      .map((image) => image.id);
    if (removedAssignmentIds.length) {
      const { error: deleteError } = await supabase
        .from("product_variant_images")
        .delete()
        .eq("variant_id", body.variantId)
        .in("id", removedAssignmentIds);
      if (deleteError) return NextResponse.json({ error: galleryErrorMessage(deleteError) }, { status: 400 });
    }

    const { data: assignments, error: assignmentError } = await supabase
      .from("product_variant_images")
      .select("id, variant_id, image_url, alt_text, sort_order, available_quantity")
      .eq("variant_id", body.variantId)
      .order("sort_order");
    if (assignmentError) return NextResponse.json({ error: galleryErrorMessage(assignmentError) }, { status: 400 });
    return NextResponse.json({ ok: true, assignments: assignments ?? [] });
  }

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