import { NextResponse } from "next/server";
import { requirePermission, serviceSupabase } from "@/lib/admin";

async function storageClient() {
  const service = serviceSupabase();
  if (!service) return NextResponse.json({ error: "Supabase server credentials are not configured." }, { status: 503 });
  return service;
}

export async function GET() {
  const access = await requirePermission("media.read");
  if (access.response) return access.response;
  const supabase = await storageClient();
  if (supabase instanceof NextResponse) return supabase;
  const { data, error } = await supabase.storage.from("trinity-media").list("products", { limit: 100, sortBy: { column: "created_at", order: "desc" } });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const files = (data || []).filter((file) => file.name !== ".emptyFolderPlaceholder").map((file) => {
    const path = `products/${file.name}`;
    const { data: publicUrl } = supabase.storage.from("trinity-media").getPublicUrl(path);
    return { ...file, path, url: publicUrl.publicUrl };
  });
  return NextResponse.json(files);
}

export async function DELETE(request: Request) {
  const access = await requirePermission("media.delete");
  if (access.response) return access.response;
  const supabase = await storageClient();
  if (supabase instanceof NextResponse) return supabase;
  const path = new URL(request.url).searchParams.get("path");
  if (!path || !path.startsWith("products/")) return NextResponse.json({ error: "A valid product media path is required." }, { status: 400 });
  const { error } = await supabase.storage.from("trinity-media").remove([path]);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const access = await requirePermission("media.upload");
  if (access.response) return access.response;
  const supabase = await storageClient();
  if (supabase instanceof NextResponse) return supabase;
  const form = await request.formData();
  const file = form.get("file");
  const requestedFolder = form.get("folder");
  const folder = requestedFolder === null || String(requestedFolder).trim() === "" ? "products" : String(requestedFolder).trim();
  if (!["products", "events", "occasions"].includes(folder)) return NextResponse.json({ error: "Invalid upload folder." }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "Maximum image size is 8MB" }, { status: 400 });
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("trinity-media").upload(path, file, { contentType: file.type, upsert: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const { data } = supabase.storage.from("trinity-media").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, path });
}
