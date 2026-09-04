import assert from "node:assert/strict";
import test from "node:test";

import {
  calendarMonthLabel,
  overlapsCalendarMonth,
} from "@/lib/calendar/month-range";

test("한눈에 보기는 선택한 월과 겹치는 일정만 표시한다", () => {
  assert.equal(overlapsCalendarMonth("2026-09-01", "2026-09-04", "2026-09"), true);
  assert.equal(overlapsCalendarMonth("2026-08-31", "2026-09-02", "2026-09"), true);
  assert.equal(overlapsCalendarMonth("2026-08-01", "2026-08-31", "2026-09"), false);
  assert.equal(overlapsCalendarMonth("2026-10-01", "2026-10-02", "2026-09"), false);
});

test("12월 다음 달 경계를 올바르게 계산한다", () => {
  assert.equal(overlapsCalendarMonth("2026-12-31", "2027-01-02", "2026-12"), true);
  assert.equal(overlapsCalendarMonth("2027-01-01", "2027-01-02", "2026-12"), false);
  assert.equal(calendarMonthLabel("2026-12"), "2026년 12월");
});
