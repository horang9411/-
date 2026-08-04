import { expect, test } from "@playwright/test";

test("첫 진입은 로그인 화면으로 이동한다", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "직원 로그인" })).toBeVisible();
  await expect(page.getByRole("link", { name: "직원 등록" })).toBeVisible();
});

test("비로그인 사용자는 워크스페이스에 접근할 수 없다", async ({ page }) => {
  await page.goto("/calendar");
  await expect(page).toHaveURL(/\/login/);
});

test("가입 화면의 필수 입력 항목이 표시된다", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByLabel("로그인 아이디")).toBeVisible();
  await expect(page.getByLabel("비밀번호", { exact: true })).toBeVisible();
  await expect(page.getByLabel("이름")).toBeVisible();
  await expect(page.getByLabel("연락처")).toBeVisible();
});

test("비로그인 API 요청은 거부된다", async ({ request }) => {
  const response = await request.get("/api/tasks");
  expect(response.status()).toBe(401);
});
