export const MAX_IMAGE_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_IMAGE_UPLOAD_MESSAGE = "Maximum image size is 8 MiB (8,388,608 bytes).";

const imageExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function getImageFileValidationError(file: Pick<File, "size" | "type">): string | null {
  if (!imageExtensions[file.type]) {
    return "Only PNG, JPEG, and WebP images are allowed.";
  }
  if (!Number.isSafeInteger(file.size) || file.size < 1) {
    return "The selected image is empty or invalid.";
  }
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    return MAX_IMAGE_UPLOAD_MESSAGE;
  }
  return null;
}

export function getImageFileExtension(contentType: string): string | null {
  return imageExtensions[contentType] ?? null;
}

export async function validateImageFile(file: File): Promise<string | null> {
  const validationError = getImageFileValidationError(file);
  if (validationError) return validationError;

  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isPng = bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isWebp = bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;

  if (
    (file.type === "image/png" && isPng) ||
    (file.type === "image/jpeg" && isJpeg) ||
    (file.type === "image/webp" && isWebp)
  ) {
    return null;
  }

  return "The file contents do not match a supported PNG, JPEG, or WebP image.";
}
