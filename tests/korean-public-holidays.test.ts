import assert from "node:assert/strict";
import test from "node:test";

import { parseKoreanPublicHolidayXml } from "@/lib/holidays/parse-korean-public-holidays";

test("공공데이터포털 공휴일 XML에서 휴일만 변환한다", () => {
  const xml = `
    <response>
      <header><resultCode>00</resultCode><resultMsg>OK</resultMsg></header>
      <body><items>
        <item><dateName>광복절</dateName><isHoliday>Y</isHoliday><locdate>20260815</locdate></item>
        <item><dateName>기념일</dateName><isHoliday>N</isHoliday><locdate>20260820</locdate></item>
      </items></body>
    </response>
  `;

  assert.deepEqual(parseKoreanPublicHolidayXml(xml), [
    { date: "2026-08-15", name: "광복절" },
  ]);
});

test("공공데이터포털 오류 응답은 실패로 처리한다", () => {
  assert.throws(
    () =>
      parseKoreanPublicHolidayXml(
        "<response><header><resultCode>30</resultCode><resultMsg>SERVICE KEY ERROR</resultMsg></header></response>",
      ),
    /SERVICE KEY ERROR/,
  );
});
