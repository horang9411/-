import type { Metadata } from "next";

import { AnnouncementBoard } from "@/components/announcements/announcement-board";
import { WorkspaceCalendar } from "@/components/calendar/workspace-calendar";
import {
  canDeleteAnnouncement,
  canPublishAnnouncement,
} from "@/lib/announcements/permissions";
import { requireCurrentEmployee } from "@/lib/auth/session";
import { departmentLabel, positionLabel } from "@/lib/employees/constants";
import { canViewAllDepartments } from "@/lib/employees/permissions";
import {
  leaveDayTypeLabel,
  leaveProgressLabel,
  leaveTypeLabel,
} from "@/lib/leave/constants";
import { createProfileImageSignedUrlMap } from "@/lib/storage/profile-image";
import { canViewTaskDetails } from "@/lib/tasks/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSystemSettings } from "@/lib/settings/system-settings";

export const metadata: Metadata = {
  title: "캘린더",
};

export default async function CalendarPage() {
  const currentEmployee = await requireCurrentEmployee();
  const supabase = createAdminClient();
  const settingsPromise = getSystemSettings(supabase);
  const holidayPromise = supabase
    .from("company_holidays")
    .select("id, title, holiday_date, description")
    .order("holiday_date", { ascending: true });
  const announcementPromise = supabase
    .from("announcements")
    .select("id, title, content, created_by, meeting_id, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  const canSeeEveryDepartment = canViewAllDepartments(currentEmployee);
  let employeeScopeQuery = supabase
    .from("employees")
    .select("id, name, position, department, profile_image_url, account_status")
    .order("name", { ascending: true });
  if (!canSeeEveryDepartment) {
    employeeScopeQuery = employeeScopeQuery.eq("department", currentEmployee.departmentCode);
  }
  const employeeScopeResult = await employeeScopeQuery;
  if (employeeScopeResult.error) throw new Error("직원 범위를 확인하지 못했습니다.");
  const scopedEmployees = employeeScopeResult.data ?? [];
  const visibleEmployeeIds = scopedEmployees.map((employee) => employee.id);

  const [settingsResult, taskResult, leaveResult, holidayResult, announcementResult] = await Promise.all([
    settingsPromise,
    supabase
      .from("tasks")
      .select("id, title, description, owner_id, department, start_date, end_date")
      .in("owner_id", visibleEmployeeIds)
      .order("start_date", { ascending: true }),
    supabase
      .from("leave_requests")
      .select(
        "id, employee_id, leave_type, start_date, end_date, day_type, status, team_lead_status, representative_status",
      )
      .in("employee_id", visibleEmployeeIds)
      .order("start_date", { ascending: true }),
    holidayPromise,
    announcementPromise,
  ]);
  const { settings } = settingsResult;

  if (
    taskResult.error ||
    leaveResult.error ||
    holidayResult.error ||
    (announcementResult.error &&
      announcementResult.error.code !== "PGRST205" &&
      announcementResult.error.code !== "PGRST204" &&
      announcementResult.error.code !== "42P01")
  ) {
    throw new Error("캘린더 데이터를 불러오지 못했습니다.");
  }

  const tasks = taskResult.data ?? [];
  const leaves = leaveResult.data ?? [];
  const announcements = announcementResult.error
    ? []
    : (announcementResult.data ?? []);
  const announcementAuthorIds = [
    ...new Set(announcements.map((announcement) => announcement.created_by)),
  ];
  const announcementAuthorPromise = announcementAuthorIds.length
    ? supabase
          .from("employees")
          .select("id, name, position")
          .in("id", announcementAuthorIds)
    : Promise.resolve({ data: [], error: null });
  const taskParticipantPromise = tasks.length
    ? supabase
        .from("task_participants")
        .select("task_id, employee_id")
        .in("task_id", tasks.map((task) => task.id))
    : Promise.resolve({ data: [], error: null });
  const profileImagePromise = createProfileImageSignedUrlMap(
    supabase,
    scopedEmployees.map((employee) => employee.profile_image_url),
  );
  const [
    { data: announcementAuthors, error: announcementAuthorError },
    { data: taskParticipantRows, error: taskParticipantError },
    profileImageUrlByValue,
  ] = await Promise.all([
    announcementAuthorPromise,
    taskParticipantPromise,
    profileImagePromise,
  ]);
  if (announcementAuthorError) {
    throw new Error("공지 작성자 정보를 불러오지 못했습니다.");
  }
  const announcementAuthorById = new Map(
    (announcementAuthors ?? []).map((author) => [author.id, author]),
  );
  if (taskParticipantError && taskParticipantError.code !== "PGRST205") {
    throw new Error("업무 참여자 정보를 불러오지 못했습니다.");
  }

  const owners = scopedEmployees;
  const ownerEntries = owners.map((owner) => [
      owner.id,
      {
        name: owner.name,
        position: positionLabel(owner.position),
        positionCode: owner.position,
        department: owner.department,
        departmentLabel: departmentLabel(owner.department),
        imageUrl: owner.profile_image_url
          ? (profileImageUrlByValue.get(owner.profile_image_url) ?? null)
          : null,
      },
    ] as const);
  const ownerById = new Map(ownerEntries);
  const participantIdsByTask = new Map<string, string[]>();
  (taskParticipantRows ?? []).forEach((participant) => {
    const ids = participantIdsByTask.get(participant.task_id) ?? [];
    ids.push(participant.employee_id);
    participantIdsByTask.set(participant.task_id, ids);
  });
  const calendarEmployeeMap = new Map(
    scopedEmployees
      .filter((employee) => employee.account_status === "active")
      .map((employee) => [employee.id, employee.name]),
  );
  owners.forEach((owner) => {
    if (!calendarEmployeeMap.has(owner.id)) {
      calendarEmployeeMap.set(owner.id, `${owner.name} (사용 중지)`);
    }
  });

  const calendarTasks = tasks.map((task) => {
    const owner = ownerById.get(task.owner_id);
    const participantIds = participantIdsByTask.get(task.id) ?? [];
    const participants = participantIds
      .map((participantId) => {
        const participant = ownerById.get(participantId);
        return participant
          ? {
              id: participantId,
              name: participant.name,
              position: participant.position,
              positionCode: participant.positionCode,
              department: participant.department,
              departmentLabel: participant.departmentLabel,
              imageUrl: participant.imageUrl,
            }
          : null;
      })
      .filter((participant): participant is NonNullable<typeof participant> => Boolean(participant));
    const canViewDetails = canViewTaskDetails(
      currentEmployee,
      task.owner_id,
      participantIds.includes(currentEmployee.id),
    );
    const canViewAdminOverview = currentEmployee.role === "admin";
    return {
      id: task.id,
      title: task.title,
      description: canViewAdminOverview && canViewDetails ? task.description : null,
      ownerId: task.owner_id,
      ownerName: owner?.name ?? "알 수 없는 직원",
      ownerPosition: owner?.position ?? "직원",
      ownerPositionCode: owner?.positionCode ?? "staff",
      ownerImageUrl: owner?.imageUrl ?? null,
      participants,
      department: task.department,
      departmentLabel: departmentLabel(task.department),
      startDate: task.start_date,
      endDate: task.end_date,
      canEdit:
        currentEmployee.role === "admin" || currentEmployee.id === task.owner_id,
      canViewDetails,
    };
  });

  const calendarLeaves = leaves.map((leave) => {
    const employee = ownerById.get(leave.employee_id);
    return {
      id: leave.id,
      employeeId: leave.employee_id,
      employeeName: employee?.name ?? "알 수 없는 직원",
      employeePosition: employee?.position ?? "직원",
      employeePositionCode: employee?.positionCode ?? "staff",
      employeeImageUrl: employee?.imageUrl ?? null,
      department: employee?.department ?? "",
      departmentLabel: employee?.departmentLabel ?? "부서 없음",
      leaveType: leave.leave_type,
      leaveTypeLabel: leaveTypeLabel(leave.leave_type),
      dayType: leave.day_type,
      dayTypeLabel: leaveDayTypeLabel(leave.day_type),
      startDate: leave.start_date,
      endDate: leave.end_date,
      status: leave.status,
      statusLabel: leaveProgressLabel({
        status: leave.status,
        teamLeadStatus: leave.team_lead_status,
        representativeStatus: leave.representative_status,
      }),
      canEdit:
        (currentEmployee.id === leave.employee_id && leave.status === "pending") ||
        (currentEmployee.role === "admin" && leave.status !== "cancelled"),
    };
  });

  return (
    <>
      <AnnouncementBoard
        announcements={announcements.map((announcement) => {
          const author = announcementAuthorById.get(announcement.created_by);
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
      />
      <WorkspaceCalendar
        tasks={calendarTasks}
        leaves={calendarLeaves}
        holidays={(holidayResult.data ?? []).map((holiday) => ({
          id: holiday.id,
          title: holiday.title,
          holidayDate: holiday.holiday_date,
          description: holiday.description,
        }))}
        employees={[...calendarEmployeeMap.entries()].map(([id, name]) => ({
          id,
          name,
        }))}
        defaultMode={settings.defaultCalendarTab}
        weekStartsOn={settings.weekStartsOn}
        companyName={settings.companyName}
        canViewAdminOverview={currentEmployee.role === "admin"}
        canViewEveryDepartment={canSeeEveryDepartment}
        currentDepartment={currentEmployee.departmentCode}
      />
    </>
  );
}
