import type { CurrentEmployee } from "@/lib/auth/session";

export function canReviewAsTeamLead(
  employee: CurrentEmployee,
  applicant: { id: string; departmentCode: string },
) {
  return (
    employee.positionCode === "team_lead" &&
    employee.departmentCode === applicant.departmentCode &&
    employee.id !== applicant.id
  );
}

export function canReviewAsRepresentative(
  employee: CurrentEmployee,
  applicantId: string,
) {
  return (
    employee.role === "admin" &&
    employee.positionCode === "representative" &&
    employee.id !== applicantId
  );
}

export function canViewLeaveDetails(
  employee: CurrentEmployee,
  applicant: { id: string; departmentCode: string },
) {
  return (
    employee.id === applicant.id ||
    employee.role === "admin" ||
    employee.positionCode === "team_lead"
  );
}
