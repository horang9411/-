import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

const PROFILE_IMAGE_BUCKET = "profile-images";
export const PROFILE_IMAGE_URL_TTL_SECONDS = 60 * 60;

export async function createProfileImageSignedUrl(
  supabase: SupabaseClient,
  storedValue: string | null | undefined,
) {
  const path = getProfileImagePath(storedValue);
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from(PROFILE_IMAGE_BUCKET)
    .createSignedUrl(path, PROFILE_IMAGE_URL_TTL_SECONDS);

  return error ? null : data.signedUrl;
}

export async function createProfileImageSignedUrlMap(
  supabase: SupabaseClient,
  storedValues: Array<string | null | undefined>,
) {
  const valueToPath = new Map<string, string | null>();
  storedValues.forEach((storedValue) => {
    if (storedValue) valueToPath.set(storedValue, getProfileImagePath(storedValue));
  });
  const uniquePaths = [
    ...new Set(
      [...valueToPath.values()].filter((path): path is string => Boolean(path)),
    ),
  ];
  const result = new Map<string, string | null>();

  if (uniquePaths.length === 0) {
    valueToPath.forEach((_, storedValue) => result.set(storedValue, null));
    return result;
  }

  const { data, error } = await supabase.storage
    .from(PROFILE_IMAGE_BUCKET)
    .createSignedUrls(uniquePaths, PROFILE_IMAGE_URL_TTL_SECONDS);

  if (error || !data) {
    valueToPath.forEach((_, storedValue) => result.set(storedValue, null));
    return result;
  }

  const signedUrlByPath = new Map<string, string | null>();
  data.forEach((item, index) => {
    const path = item.path ?? uniquePaths[index];
    if (path) signedUrlByPath.set(path, item.error ? null : item.signedUrl);
  });
  valueToPath.forEach((path, storedValue) => {
    result.set(storedValue, path ? (signedUrlByPath.get(path) ?? null) : null);
  });

  return result;
}

export function getProfileImagePath(storedValue: string | null | undefined) {
  if (!storedValue) return null;

  let path = storedValue.trim();

  if (/^https?:\/\//i.test(path)) {
    try {
      const url = new URL(path);
      const markers = [
        `/storage/v1/object/sign/${PROFILE_IMAGE_BUCKET}/`,
        `/storage/v1/object/public/${PROFILE_IMAGE_BUCKET}/`,
        `/storage/v1/object/${PROFILE_IMAGE_BUCKET}/`,
      ];
      const marker = markers.find((candidate) => url.pathname.includes(candidate));
      if (!marker) return null;
      path = decodeURIComponent(url.pathname.split(marker)[1] ?? "");
    } catch {
      return null;
    }
  }

  path = path.replace(/^\/+/, "");
  if (!path || path.includes("..") || path.includes("\\")) return null;

  return path;
}
