import assert from "node:assert/strict";
import {
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_IMAGE_UPLOAD_MESSAGE,
  getImageFileValidationError,
  validateImageFile,
} from "../lib/image-upload.ts";

function pngFile(size, type = "image/png") {
  const bytes = new Uint8Array(size);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].slice(0, size));
  return new File([bytes], "sample.png", { type });
}

assert.equal(await validateImageFile(pngFile(MAX_IMAGE_UPLOAD_BYTES - 1)), null);
assert.equal(await validateImageFile(pngFile(MAX_IMAGE_UPLOAD_BYTES)), null);
assert.equal(await validateImageFile(pngFile(MAX_IMAGE_UPLOAD_BYTES + 1)), MAX_IMAGE_UPLOAD_MESSAGE);
assert.equal(getImageFileValidationError(pngFile(12, "image/svg+xml")), "Only PNG, JPEG, and WebP images are allowed.");
assert.equal(getImageFileValidationError(pngFile(0)), "The selected image is empty or invalid.");
assert.equal(await validateImageFile(pngFile(32)), null);
assert.equal(await validateImageFile(new File([Uint8Array.from([0xff, 0xd8, 0xff, 0x00])], "sample.jpg", { type: "image/jpeg" })), null);
assert.equal(await validateImageFile(new File([Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])], "sample.webp", { type: "image/webp" })), null);
assert.equal(await validateImageFile(pngFile(12, "image/svg+xml")), "Only PNG, JPEG, and WebP images are allowed.");
assert.match(await validateImageFile(pngFile(32, "image/jpeg")), /contents do not match/);
assert.match(await validateImageFile(new File(["not an image"], "invalid.png", { type: "image/png" })), /contents do not match/);

console.log("PASS image upload type and size validation");
