import { z } from "zod";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const meetingSchema = z
  .object({
    subject: z
      .string()
      .trim()
      .min(1, "회의 주제를 입력해 주세요.")
      .max(120, "회의 주제는 120자 이하로 입력해 주세요."),
    content: z
      .string()
      .trim()
      .min(1, "회의 내용을 입력해 주세요.")
      .max(5000, "회의 내용은 5,000자 이하로 입력해 주세요."),
    meetingDate: z.string().regex(datePattern, "회의 날짜를 선택해 주세요."),
    startTime: z.string().regex(timePattern, "시작 시간을 선택해 주세요."),
    endTime: z.string().regex(timePattern, "종료 시간을 선택해 주세요."),
    participantIds: z
      .array(z.uuid("참여자 정보를 확인해 주세요."))
      .min(1, "참여자를 한 명 이상 선택해 주세요.")
      .max(50, "참여자는 최대 50명까지 선택할 수 있습니다."),
  })
  .refine(
    (data) => new Set(data.participantIds).size === data.participantIds.length,
    { path: ["participantIds"], message: "참여자가 중복되어 있습니다." },
  )
  .refine((data) => data.endTime > data.startTime, {
    path: ["endTime"],
    message: "종료 시간은 시작 시간보다 늦어야 합니다.",
  });

export type MeetingInput = z.infer<typeof meetingSchema>;
