import apiClient from "./client";

/**
 * Resolves full accessible URL for an image path.
 * If path is relative (e.g. /uploads/...), prepends backend origin.
 *
 * @param {string|null|undefined} path
 * @returns {string|null}
 */
export function getImageUrl(path) {
  if (!path) return null;
  if (path.startsWith("data:") || path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // Derive origin from apiClient baseURL or default to http://localhost:8080
  const baseURL = apiClient.defaults.baseURL || "http://localhost:8080/api";
  const origin = baseURL.replace(/\/api\/?$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  return `${origin}${cleanPath}`;
}

/**
 * Validates and uploads an image file (JPG, JPEG, PNG, WEBP, <= 5MB).
 *
 * @param {File} file
 * @returns {Promise<{ url: string, imageUrl: string, filename: string }>}
 */
export async function uploadImage(file) {
  if (!file) {
    throw new Error("Please select an image file to upload.");
  }

  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const fileName = (file.name || "").toLowerCase();
  const validExtension = [".jpg", ".jpeg", ".png", ".webp"].some((ext) =>
    fileName.endsWith(ext)
  );

  if (!allowedTypes.includes(file.type) && !validExtension) {
    throw new Error("Invalid file type. Only JPG, JPEG, PNG, and WEBP formats are allowed.");
  }

  // Strict 5 MB check
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("File size must be less than 5 MB.");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post("/upload/image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  const rawUrl = response.data?.url || response.data?.imageUrl;
  const resolvedUrl = getImageUrl(rawUrl);

  return {
    url: resolvedUrl,
    rawUrl,
    imageUrl: resolvedUrl,
    filename: response.data?.filename || "",
  };
}

export default {
  uploadImage,
  getImageUrl,
};
