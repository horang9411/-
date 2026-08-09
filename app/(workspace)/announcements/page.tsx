import type { Metadata } from "next";

import { AnnouncementBoard } from "@/components/announcements/announcement-board";
import {
  canDeleteAnnouncement,
  canPublishAnnouncement,
} from "@/lib/announcements/permissions";
import { requireCurrentEmployee } from "@/lib/auth/session";
import { positionLabel } from "@/lib/employees/constants";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "공지사항" };
export default async function AnnouncementsPage() {
  const currentEmployee = await requireCurrentEmployee();
  const supabase = createAdminClient();
  const announcementResult = await supabase
    .from("announcements")
    .select("id, title, content, created_by, meeting_id, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const schemaMissing =
    announcementResult.error?.code === "PGRST205" ||
    announcementResult.error?.code === "PGRST204" ||
    announcementResult.error?.code === "42P01";
  if (announcementResult.error && !schemaMissing) {
    throw new Error("공지사항을 불러오지 못했습니다.");
  }

  const announcements = announcementResult.data ?? [];
  const authorIds = [
    ...new Set(announcements.map((announcement) => announcement.created_by)),
  ];
  const { data: authors, error: authorError } = authorIds.length
    ? await supabase
        .from("employees")
        .select("id, name, position")
        .in("id", authorIds)
    : { data: [], error: null };
  if (authorError) throw new Error("공지 작성자 정보를 불러오지 못했습니다.");
  const authorById = new Map((authors ?? []).map((author) => [author.id, author]));

  return (
    <AnnouncementBoard
      announcements={announcements.map((announcement) => {
        const author = authorById.get(announcement.created_by);
        return {
          id: announcement.id,
          title: announcement.title,
          content: announcement.content,
          createdAt: announcement.created_at,
          authorName: author?.name ?? "알 수 없는 직원",
          authorPosition: author ? positionLabel(author.position) : "직원",
          canDelete:
            !announcement.meeting_id &&
            canDeleteAnnouncement(currentEmployee, announcement.created_by),
        };
      })}
      canPublish={canPublishAnnouncement(currentEmployee)}
      schemaAvailable={!announcementResult.error}
      displayAll
    />
  );
}
