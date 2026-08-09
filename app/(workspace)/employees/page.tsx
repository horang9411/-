import type { Metadata } from "next";

import { EmployeeDirectory } from "@/components/employees/employee-directory";
import { requireCurrentEmployee } from "@/lib/auth/session";
import { departmentLabel, positionLabel } from "@/lib/employees/constants";
import { canViewEmployeeWorkDetails } from "@/lib/employees/permissions";
import { createProfileImageSignedUrlMap } from "@/lib/storage/profile-image";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "직원 목록" };

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const currentEmployee = await requireCurrentEmployee();
  const supabase = createAdminClient();
  const { data: rows } = await supabase
    .from("employees")
    .select("id, name, position, department, phone, profile_image_url, role")
    .eq("account_status", "active")
    .order("department", { ascending: true })
    .order("name", { ascending: true });
  const { denied } = await searchParams;

  const profileImageUrlByValue = await createProfileImageSignedUrlMap(
    supabase,
    (rows ?? []).map((employee) => employee.profile_image_url),
  );
  const employees = (rows ?? []).map((employee) => ({
      id: employee.id,
      name: employee.name,
      position: employee.position,
      positionLabel: positionLabel(employee.position),
      department: employee.department,
      departmentLabel: departmentLabel(employee.department),
      phone: employee.phone,
      role: employee.role as "employee" | "admin",
      imageUrl: employee.profile_image_url
        ? (profileImageUrlByValue.get(employee.profile_image_url) ?? null)
        : null,
      canViewDetails: canViewEmployeeWorkDetails(
        currentEmployee,
        employee.id,
        employee.department,
      ),
      isCurrentEmployee: currentEmployee.id === employee.id,
    }));

  return <EmployeeDirectory employees={employees} accessDenied={denied === "1"} />;
}
