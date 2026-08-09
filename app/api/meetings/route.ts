import { NextResponse } from "next/server";

import {
  hasValidMutationOrigin,
  invalidOriginResponse,
  requireApiEmployee,
} from "@/lib/auth/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { meetingSchema } from "@/schemas/meetings";

export async function POST(request: Request) {
  if (!hasValidMutationOrigin(request)) return invalidOriginResponse();

  const auth = await requireApiEmployee();
  if (auth.response) return auth.response;
  const parsed = meetingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        message:
          parsed.error.issues[0]?.message ?? "회의 등록 내용을 확인해 주세요.",
      },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data: participants, error: participantError } = await supabase
    .from("employees")
    .select("id, name")
    .in("id", parsed.data.participantIds)
    .eq("account_status", "active");
  if (
    participantError ||
    (participants ?? []).length !== parsed.data.participantIds.length
  ) {
    return NextResponse.json(
      { message: "선택한 참여자 중 현재 사용할 수 없는 직원이 있습니다." },
      { status: 400 },
    );
  }

  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .insert({
      subject: parsed.data.subject,
      content: parsed.data.content,
      meeting_date: parsed.data.meetingDate,
      start_time: parsed.data.startTime,
      end_time: parsed.data.endTime,
      created_by: auth.employee.id,
    })
    .select("id")
    .single();
  if (meetingError) {
    return NextResponse.json(
      {
        message:
          meetingError.code === "PGRST205" || meetingError.code === "42P01"
            ? "회의실 데이터베이스 설정이 필요합니다. 관리자에게 문의해 주세요."
            : "회의를 등록하지 못했습니다.",
      },
      { status: 500 },
    );
  }

  const { error: linkError } = await supabase.from("meeting_participants").insert(
    parsed.data.participantIds.map((employeeId) => ({
      meeting_id: meeting.id,
      employee_id: employeeId,
    })),
  );
  if (linkError) {
    await supabase.from("meetings").delete().eq("id", meeting.id);
    return NextResponse.json(
      { message: "회의 참여자를 저장하지 못했습니다." },
      { status: 500 },
    );
  }

  const participantNames = (participants ?? [])
    .map((participant) => participant.name)
    .sort((a, b) => a.localeCompare(b, "ko"));
  const announcementContent = [
    `회의 일시: ${formatMeetingDate(parsed.data.meetingDate)} ${parsed.data.startTime}~${parsed.data.endTime}`,
    `참여자: ${participantNames.join(", ")}`,
    "",
    parsed.data.content,
  ]
    .join("\n")
    .slice(0, 5000);
  const { error: announcementError } = await supabase
    .from("announcements")
    .insert({
      title: `[회의] ${parsed.data.subject}`.slice(0, 120),
      content: announcementContent,
      created_by: auth.employee.id,
      meeting_id: meeting.id,
    });
  if (announcementError) {
    await supabase.from("meetings").delete().eq("id", meeting.id);
    return NextResponse.json(
      {
        message:
          announcementError.code === "PGRST204"
            ? "회의 공지 연결 SQL 적용이 필요합니다. 관리자에게 문의해 주세요."
            : "회의 공지사항을 생성하지 못했습니다.",
      },
      { status: 500 },
    );
  }

  await supabase.from("activity_logs").insert({
    employee_id: auth.employee.id,
    action_type: "meeting.create",
    target_type: "meeting",
    target_id: meeting.id,
    changed_data: {
      subject: parsed.data.subject,
      meeting_date: parsed.data.meetingDate,
      start_time: parsed.data.startTime,
      end_time: parsed.data.endTime,
      participant_ids: parsed.data.participantIds,
    },
  });

  return NextResponse.json({ ok: true, id: meeting.id }, { status: 201 });
}

function formatMeetingDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${year}.${month}.${day}`;
}
