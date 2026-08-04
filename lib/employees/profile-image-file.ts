// Vercel Functions의 4.5MB 요청 본문 한도에 multipart 오버헤드를 남깁니다.
export const MAX_PROFILE_IMAGE_SIZE = 4 * 1024 * 1024;
export const PROFILE_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedExtensions = new Set(["jpg", "jpeg", "png", "webp"]);

export function getProfileImageExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function validateProfileImage(file: File) {
  if (
    !allowedTypes.has(file.type) ||
    !allowedExtensions.has(getProfileImageExtension(file.name))
  ) {
    return "프로필 이미지는 JPG, PNG, WEBP 파일만 등록할 수 있습니다.";
  }
  if (file.size > MAX_PROFILE_IMAGE_SIZE) {
    return "프로필 이미지는 최대 4MB까지 등록할 수 있습니다.";
  }
  return null;
}

export async function hasValidProfileImageSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (file.type === "image/png") {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (value, index) => bytes[index] === value,
    );
  }
  if (file.type === "image/webp") {
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }
  return false;
}
