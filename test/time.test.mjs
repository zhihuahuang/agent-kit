import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
const moduleUrl = new URL('../site/time.js', import.meta.url).href;
function format(timestamp, timezone) {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `import { formatUpdatedAt } from ${JSON.stringify(moduleUrl)}; console.log(formatUpdatedAt(${timestamp}));`], { encoding: 'utf8', env: { ...process.env, TZ: timezone } });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
test('同一时间戳按访问者时区显示，时间和 GMT 偏移在同一行', () => {
  const timestamp = Date.parse('2026-11-03T08:35:00Z');
  assert.equal(format(timestamp, 'Asia/Shanghai'), '2026-11-03 16:35 GMT+8');
  assert.equal(format(timestamp, 'America/New_York'), '2026-11-03 03:35 GMT-5');
  assert.equal(format(timestamp, 'Asia/Kolkata'), '2026-11-03 14:05 GMT+5:30');
  assert.equal(format(timestamp, 'UTC'), '2026-11-03 08:35 GMT+0');
});
test('按目标日期计算夏令时与跨日时间', () => {
  assert.equal(format(Date.parse('2026-07-03T01:35:00Z'), 'America/New_York'), '2026-07-02 21:35 GMT-4');
  assert.equal(format(Date.parse('2026-11-03T16:00:00Z'), 'Asia/Shanghai'), '2026-11-04 00:00 GMT+8');
});
