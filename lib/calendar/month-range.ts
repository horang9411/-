export function calendarMonthValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function overlapsCalendarMonth(
  startDate: string,
  endDate: string,
  monthValue: string,
) {
  const match = /^(\d{4})-(\d{2})$/.exec(monthValue);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return false;

  const monthStart = `${monthValue}-01`;
  const nextMonth = new Date(year, month, 1);
  const nextMonthStart = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;

  return startDate < nextMonthStart && endDate >= monthStart;
}

export function calendarMonthLabel(monthValue: string) {
  const [year, month] = monthValue.split("-");
  return `${year}년 ${Number(month)}월`;
}
