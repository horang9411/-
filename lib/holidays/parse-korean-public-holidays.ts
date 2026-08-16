export type ParsedKoreanPublicHoliday = {
  date: string;
  name: string;
};

function tagValue(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match?.[1]?.trim() ?? "";
}

function decodeXmlText(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function formatHolidayDate(value: string) {
  if (!/^\d{8}$/.test(value)) return null;
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

export function parseKoreanPublicHolidayXml(
  xml: string,
): ParsedKoreanPublicHoliday[] {
  const resultCode = tagValue(xml, "resultCode");
  if (resultCode && resultCode !== "00") {
    const resultMessage = decodeXmlText(tagValue(xml, "resultMsg"));
    throw new Error(
      resultMessage
        ? `대한민국 공휴일 API 오류: ${resultMessage}`
        : `대한민국 공휴일 API 오류 (${resultCode})`,
    );
  }

  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map((match) => {
      const item = match[1];
      const date = formatHolidayDate(tagValue(item, "locdate"));
      const name = decodeXmlText(tagValue(item, "dateName"));
      const isHoliday = tagValue(item, "isHoliday");
      return date && name && isHoliday === "Y" ? { date, name } : null;
    })
    .filter((holiday): holiday is ParsedKoreanPublicHoliday => Boolean(holiday));
}
