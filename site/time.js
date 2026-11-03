// 使用浏览器本地时区；保留统一日期格式，偏移量按目标日期计算以支持夏令时。
export function formatUpdatedAt(timestamp) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'shortOffset',
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  const offset = values.timeZoneName === 'GMT' ? 'GMT+0' : values.timeZoneName;
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute} ${offset}`;
}
