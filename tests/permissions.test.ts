import assert from "node:assert/strict";
import test from "node:test";

import type { CurrentEmployee } from "@/lib/auth/session";
import { canViewDepartment } from "@/lib/employees/permissions";
import {
  canReviewAsRepresentative,
  canReviewAsTeamLead,
} from "@/lib/leave/permissions";
import { canManageTask, canViewTaskDetails } from "@/lib/tasks/permissions";

function employee(overrides: Partial<CurrentEmployee> = {}): CurrentEmployee {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    name: "테스트 직원",
    position: "사원",
    positionCode: "staff",
    department: "웹팀",
    departmentCode: "web",
    imageUrl: null,
    role: "employee",
    sessionExpiresAt: "2099-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("일반 직원은 본인 업무만 관리한다", () => {
  const current = employee();
  assert.equal(canManageTask(current, current.id), true);
  assert.equal(canManageTask(current, "00000000-0000-4000-8000-000000000002"), false);
});

test("과장급 이상과 참여 직원은 타인 업무 상세를 조회한다", () => {
  const ownerId = "00000000-0000-4000-8000-000000000002";
  assert.equal(canViewTaskDetails(employee(), ownerId), false);
  assert.equal(canViewTaskDetails(employee(), ownerId, true), true);
  assert.equal(
    canViewTaskDetails(employee({ positionCode: "manager", position: "과장" }), ownerId),
    true,
  );
});

test("부서 팀장만 같은 부서 직원의 1차 휴가 승인을 한다", () => {
  const applicant = {
    id: "00000000-0000-4000-8000-000000000002",
    departmentCode: "web",
  };
  assert.equal(
    canReviewAsTeamLead(employee({ positionCode: "team_lead", position: "팀장" }), applicant),
    true,
  );
  assert.equal(
    canReviewAsTeamLead(
      employee({ positionCode: "team_lead", departmentCode: "logistics" }),
      applicant,
    ),
    false,
  );
});

test("최종 휴가 승인은 대표 직급의 관리자만 한다", () => {
  const applicantId = "00000000-0000-4000-8000-000000000002";
  assert.equal(
    canReviewAsRepresentative(
      employee({ role: "admin", positionCode: "representative", position: "대표" }),
      applicantId,
    ),
    true,
  );
  assert.equal(
    canReviewAsRepresentative(
      employee({ role: "admin", positionCode: "team_lead", position: "팀장" }),
      applicantId,
    ),
    false,
  );
});

test("관리자와 팀장은 모든 부서를, 일반 직원은 자기 부서만 본다", () => {
  assert.equal(canViewDepartment(employee(), "logistics"), false);
  assert.equal(canViewDepartment(employee({ positionCode: "team_lead" }), "logistics"), true);
  assert.equal(canViewDepartment(employee({ role: "admin" }), "logistics"), true);
});
