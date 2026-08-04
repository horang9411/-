import { z } from "zod";

import { departmentValues } from "@/schemas/auth";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const taskFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "업무 제목을 입력해 주세요.")
      .max(120, "업무 제목은 120자 이하로 입력해 주세요."),
    description: z
      .string()
      .trim()
      .min(1, "업무 내용을 입력해 주세요.")
      .max(10_000, "업무 내용은 10,000자 이하로 입력해 주세요."),
    ownerId: z.uuid("담당 직원을 선택해 주세요."),
    participantIds: z
      .array(z.uuid("참여 직원 정보를 확인해 주세요."))
      .max(30, "참여 직원은 최대 30명까지 선택할 수 있습니다."),
    department: z.enum(departmentValues, { message: "부서를 선택해 주세요." }),
    startDate: z.string().regex(datePattern, "시작일을 선택해 주세요."),
    endDate: z.string().regex(datePattern, "종료일을 선택해 주세요."),
    relatedLink: z
      .union([
        z.literal(""),
        z.url("관련 링크는 https:// 형식의 올바른 주소를 입력해 주세요."),
      ])
      .refine((value) => value.length <= 2048, "관련 링크가 너무 깁니다."),
  })
  .refine(
    (data) => new Set(data.participantIds).size === data.participantIds.length,
    { path: ["participantIds"], message: "참여 직원이 중복되어 있습니다." },
  )
  .refine((data) => !data.participantIds.includes(data.ownerId), {
    path: ["participantIds"],
    message: "주 담당자는 참여 직원에서 제외해 주세요.",
  })
  .refine((data) => data.endDate >= data.startDate, {
    path: ["endDate"],
    message: "종료일은 시작일보다 빠를 수 없습니다.",
  });

export const removedAttachmentIdsSchema = z.array(z.uuid()).max(5);

export const taskScheduleSchema = z
  .object({
    startDate: z.string().regex(datePattern, "시작일을 확인해 주세요."),
    endDate: z.string().regex(datePattern, "종료일을 확인해 주세요."),
  })
  .refine((data) => data.endDate >= data.startDate, {
    path: ["endDate"],
    message: "종료일은 시작일보다 빠를 수 없습니다.",
  });

export type TaskFormInput = z.infer<typeof taskFormSchema>;

export function taskInputFromFormData(formData: FormData) {
  let participantIds: unknown = [];
  try {
    participantIds = JSON.parse(String(formData.get("participantIds") ?? "[]"));
  } catch {
    participantIds = null;
  }
  return {
    title: formData.get("title"),
    description: formData.get("description"),
    ownerId: formData.get("ownerId"),
    participantIds,
    department: formData.get("department"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    relatedLink: formData.get("relatedLink") ?? "",
  };
}
