import { z } from "zod";

export const announcementSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "공지 제목을 입력해 주세요.")
    .max(120, "공지 제목은 120자 이하로 입력해 주세요."),
  content: z
    .string()
    .trim()
    .min(1, "공지 내용을 입력해 주세요.")
    .max(5000, "공지 내용은 5,000자 이하로 입력해 주세요."),
});

export type AnnouncementInput = z.infer<typeof announcementSchema>;
