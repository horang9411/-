import { NextResponse } from "next/server";

import {
  hasValidMutationOrigin,
  invalidOriginResponse,
  requireApiEmployee,
} from "@/lib/auth/api";
import { canManageTask } from "@/lib/tasks/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { taskScheduleSchema } from "@/schemas/tasks";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!hasValidMutationOrigin(request)) return invalidOriginResponse();

  const auth = await requireApiEmployee();
  if (auth.response) return auth.response;

  const parsed = taskScheduleSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "업무 기간을 확인해 주세요." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const supabase = createAdminClient();
  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, owner_id, start_date, end_date")
    .eq("id", id)
    .maybeSingle();

  if (!task) {
    return NextResponse.json({ message: "업무를 찾을 수 없습니다." }, { status: 404 });
  }
  if (!canManageTask(auth.employee, task.owner_id)) {
    return NextResponse.json(
      { message: "이 업무의 일정을 변경할 권한이 없습니다." },
      { status: 403 },
    );
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
    })
    .eq("id", id);
  if (error) {
    return NextResponse.json(
      { message: "업무 일정을 변경하지 못했습니다." },
      { status: 500 },
    );
  }

  await supabase.from("activity_logs").insert({
    employee_id: auth.employee.id,
    action_type: "task.schedule.update",
    target_type: "task",
    target_id: task.id,
    changed_data: {
      title: task.title,
      start_date: { before: task.start_date, after: parsed.data.startDate },
      end_date: { before: task.end_date, after: parsed.data.endDate },
      method: "calendar_drag",
    },
  });

  return NextResponse.json({ ok: true });
}
