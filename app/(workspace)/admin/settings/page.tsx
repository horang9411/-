import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminSettingsManager } from "@/components/admin/admin-settings-manager";
import { listManagedStorageFiles } from "@/lib/admin/storage-management";
import { requireCurrentEmployee } from "@/lib/auth/session";
import { getSystemSettings } from "@/lib/settings/system-settings";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "관리자 설정" };
export default async function AdminSettingsPage() {
  const currentEmployee = await requireCurrentEmployee();
  if (currentEmployee.role !== "admin") redirect("/calendar");
  const supabase = createAdminClient();
  const now = new Date();

  const [holidayResult, logResult, employeeResult, sessionResult, storageFiles, settingResult] = await Promise.all([
    supabase.from("company_holidays").select("id, title, holiday_date, description, created_by, created_at").order("holiday_date", { ascending: true }),
    supabase.from("activity_logs").select("id, employee_id, action_type, target_type, target_id, changed_data, created_at").order("created_at", { ascending: false }).limit(150),
    supabase.from("employees").select("id, login_id, name, department, position, account_status, failed_login_count, locked_until").order("name", { ascending: true }),
    supabase.from("sessions").select("id, employee_id, expires_at, created_at"),
    listManagedStorageFiles(supabase),
    getSystemSettings(supabase),
  ]);

  if (holidayResult.error || logResult.error || employeeResult.error || sessionResult.error) {
    throw new Error("관리자 설정 데이터를 불러오지 못했습니다.");
  }

  const employees = employeeResult.data ?? [];
  const nameById = new Map(employees.map((employee) => [employee.id, employee.name]));
  const sessions = sessionResult.data ?? [];

  return (
    <AdminSettingsManager
      holidays={(holidayResult.data ?? []).map((holiday) => ({
        id: holiday.id,
        title: holiday.title,
        holidayDate: holiday.holiday_date,
        description: holiday.description ?? "",
        creatorName: nameById.get(holiday.created_by) ?? "알 수 없는 관리자",
        createdAt: holiday.created_at,
      }))}
      storageFiles={storageFiles}
      activityLogs={(logResult.data ?? []).map((log) => ({
        id: log.id,
        actionType: log.action_type,
        actorName: log.employee_id ? nameById.get(log.employee_id) ?? "알 수 없는 직원" : "시스템",
        targetType: log.target_type,
        targetId: log.target_id,
        changedData: (log.changed_data ?? {}) as Record<string, unknown>,
        createdAt: log.created_at,
      }))}
      lockedEmployees={employees.filter((employee) => employee.failed_login_count > 0 || Boolean(employee.locked_until)).map((employee) => ({
        id: employee.id,
        loginId: employee.login_id,
        name: employee.name,
        failedLoginCount: employee.failed_login_count,
        lockedUntil: employee.locked_until,
        accountStatus: employee.account_status,
      }))}
      sessionStats={{
        total: sessions.length,
        active: sessions.filter((session) => new Date(session.expires_at) > now).length,
        expired: sessions.filter((session) => new Date(session.expires_at) <= now).length,
      }}
      settings={settingResult.settings}
      settingsSchemaReady={settingResult.schemaReady}
    />
  );
}
