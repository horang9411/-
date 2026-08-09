import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";

const PROFILE_IMAGE_BUCKET = "profile-images";
export const PROFILE_IMAGE_URL_TTL_SECONDS = 60 * 60;

const createCachedProfileImageSignedUrl = unstable_cache(
  async (storedValue: string) => {
    const path = getProfileImagePath(storedValue);
    if (!path) return null;

    const { data, error } = await createAdminClient().storage
      .from(PROFILE_IMAGE_BUCKET)
      .createSignedUrl(path, PROFILE_IMAGE_URL_TTL_SECONDS);

    return error ? null : data.signedUrl;
  },
  ["profile-image-signed-url-v1"],
  { revalidate: 50 * 60 },
);

export async function createProfileImageSignedUrl(
  _supabase: SupabaseClient,
  storedValue: string | null | undefined,
) {
  if (!storedValue) return null;
  return createCachedProfileImageSignedUrl(storedValue);
}

export async function createProfileImageSignedUrlMap(
  supabase: SupabaseClient,
  storedValues: Array<string | null | undefined>,
) {
  const uniqueValues = [
    ...new Set(
      storedValues.filter((storedValue): storedValue is string => Boolean(storedValue)),
    ),
  ];
  const entries = await Promise.all(
    uniqueValues.map(async (storedValue) => [
      storedValue,
      await createProfileImageSignedUrl(supabase, storedValue),
    ] as const),
  );
  return new Map(entries);
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
