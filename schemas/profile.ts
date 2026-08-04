import { z } from "zod";

export const profileFormSchema = z.object({
  name: z.string().trim().min(2, "이름은 2자 이상 입력해 주세요.").max(50, "이름은 50자 이하로 입력해 주세요."),
  phone: z.string().regex(/^010-\d{4}-\d{4}$/, "010-1234-5678 형식으로 입력해 주세요."),
});

export type ProfileFormInput = z.infer<typeof profileFormSchema>;
