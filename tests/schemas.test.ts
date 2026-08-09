import assert from "node:assert/strict";
import test from "node:test";

import { announcementSchema } from "@/schemas/announcements";
import { leaveFormSchema } from "@/schemas/leave";
import { meetingSchema } from "@/schemas/meetings";
import { taskFormSchema } from "@/schemas/tasks";

test("업무 입력은 상태 필드 없이 검증된다", () => {
  const result = taskFormSchema.safeParse({
    title: "신제품 상세 페이지",
    description: "상세 페이지를 제작합니다.",
    ownerId: "00000000-0000-4000-8000-000000000001",
    participantIds: ["00000000-0000-4000-8000-000000000002"],
    department: "web",
    startDate: "2026-08-04",
    endDate: "2026-08-05",
    relatedLink: "",
  });
  assert.equal(result.success, true);
});

test("오전 반반차 입력을 허용한다", () => {
  const result = leaveFormSchema.safeParse({
    leaveType: "morning_quarter",
    dayType: "morning_quarter",
    startDate: "2026-08-04",
    endDate: "2026-08-04",
    reason: "개인 일정",
    handoverNote: "",
  });
  assert.equal(result.success, true);
});

test("반반차는 하루를 넘길 수 없다", () => {
  const result = leaveFormSchema.safeParse({
    leaveType: "afternoon_quarter",
    dayType: "afternoon_quarter",
    startDate: "2026-08-04",
    endDate: "2026-08-05",
    reason: "개인 일정",
    handoverNote: "",
  });
  assert.equal(result.success, false);
});

test("공지사항 제목과 내용을 검증한다", () => {
  assert.equal(
    announcementSchema.safeParse({
      title: "사내 워크숍 안내",
      content: "워크숍 일정을 확인해 주세요.",
    }).success,
    true,
  );
  assert.equal(
    announcementSchema.safeParse({ title: "", content: "" }).success,
    false,
  );
});

test("회의 일정과 참여자를 검증한다", () => {
  const validMeeting = {
    subject: "주간 업무 회의",
    content: "이번 주 업무 일정을 공유합니다.",
    meetingDate: "2026-08-10",
    startTime: "10:00",
    endTime: "11:00",
    participantIds: ["00000000-0000-4000-8000-000000000001"],
  };
  assert.equal(meetingSchema.safeParse(validMeeting).success, true);
  assert.equal(
    meetingSchema.safeParse({ ...validMeeting, endTime: "09:00" }).success,
    false,
  );
  assert.equal(
    meetingSchema.safeParse({ ...validMeeting, participantIds: [] }).success,
    false,
  );
});
