import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminEmployeesManager } from "@/components/admin/admin-employees-manager";
import { requireCurrentEmployee } from "@/lib/auth/session";
import { createProfileImageSignedUrl } from "@/lib/storage/profile-image";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "직원 관리",
};

export const dynamic = "force-dynamic";

export default async function AdminEmployeesPage() {
  const currentEmployee = await requireCurrentEmployee();
  if (currentEmployee.role !== "admin") redirect("/calendar");

  const supabase = createAdminClient();
  const [{ data: employees, error: employeeError }, { data: logs, error: logError }] =
    await Promise.all([
      supabase
        .from("employees")
        .select(
          "id, login_id, name, position, department, phone, profile_image_url, role, account_status, created_at, updated_at, last_login_at",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("activity_logs")
        .select(
          "id, employee_id, action_type, target_type, target_id, changed_data, created_at",
        )
        .like("action_type", "admin.employee.%")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  if (employeeError || logError) {
    throw new Error("직원 관리 데이터를 불러오지 못했습니다.");
  }

  const employeeRows = employees ?? [];
  const employeeNameById = new Map(
    employeeRows.map((employee) => [employee.id, employee.name]),
  );
  const employeesWithImage = await Promise.all(
    employeeRows.map(async (employee) => {
      const imageUrl = await createProfileImageSignedUrl(
        supabase,
        employee.profile_image_url,
      );

      return {
        id: employee.id,
        loginId: employee.login_id,
        name: employee.name,
        position: employee.position,
        department: employee.department,
        phone: employee.phone,
        imageUrl,
        role: employee.role,
        accountStatus: employee.account_status,
        createdAt: employee.created_at,
        updatedAt: employee.updated_at,
        lastLoginAt: employee.last_login_at,
      };
    }),
  );

  const activityLogs = (logs ?? []).map((log) => ({
    id: log.id,
    actionType: log.action_type,
    actorName: log.employee_id
      ? employeeNameById.get(log.employee_id) ?? "알 수 없는 관리자"
      : "시스템",
    targetName: log.target_id
      ? employeeNameById.get(log.target_id) ?? "삭제된 직원"
      : "직원",
    changedData: (log.changed_data ?? {}) as Record<string, unknown>,
    createdAt: log.created_at,
  }));

  return (
    <AdminEmployeesManager
      employees={employeesWithImage}
      activityLogs={activityLogs}
      currentEmployeeId={currentEmployee.id}
    />
  );
}
