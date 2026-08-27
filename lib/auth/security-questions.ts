export const securityQuestionOptions = [
  { value: "high_school", label: "졸업한 고등학교 이름은?" },
  { value: "first_pet", label: "처음 키운 반려동물의 이름은?" },
  { value: "childhood_neighborhood", label: "어린 시절 살았던 동네 이름은?" },
  { value: "favorite_teacher", label: "기억에 남는 선생님의 성함은?" },
  { value: "first_company", label: "첫 직장 이름은?" },
] as const;

export const securityQuestionValues = securityQuestionOptions.map(
  (option) => option.value,
) as [
  "high_school",
  "first_pet",
  "childhood_neighborhood",
  "favorite_teacher",
  "first_company",
];

export type SecurityQuestion = (typeof securityQuestionValues)[number];

export function securityQuestionLabel(value: string) {
  return (
    securityQuestionOptions.find((option) => option.value === value)?.label ??
    "등록된 보안 질문"
  );
}
