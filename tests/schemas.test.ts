import assert from "node:assert/strict";
import test from "node:test";

import { leaveFormSchema } from "@/schemas/leave";
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
