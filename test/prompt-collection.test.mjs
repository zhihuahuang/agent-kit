import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addPrompt,
  movePrompt,
  joinPrompts,
} from '../site/prompt-collection.js';

const a = { id: 'a', name: 'A', body: '# A\n\n第一条\n' };
const b = { id: 'b', name: 'B', body: '第二条 {{变量}}' };
const c = { id: 'c', name: 'C', body: '第三条' };

test('按加入顺序保存，重复添加不重复、不打乱顺序', () => {
  const items = addPrompt(addPrompt([], a), b);
  assert.deepEqual(addPrompt(items, a), [a, b]);
  assert.deepEqual(items, [a, b]);
});
test('拖动可向前或向后排序，不丢失条目且不修改原列表', () => {
  const items = [a, b, c];
  assert.deepEqual(movePrompt(items, 'a', 'c'), [b, c, a]);
  assert.deepEqual(movePrompt(items, 'c', 'a'), [c, a, b]);
  assert.deepEqual(movePrompt(items, 'a', 'a'), items);
  assert.deepEqual(movePrompt(items, 'missing', 'a'), items);
  assert.deepEqual(items, [a, b, c]);
});
test('按当前顺序拼接正文，只增加空行、不替换变量或插入元信息', () => {
  assert.equal(
    joinPrompts(movePrompt([a, b], 'b', 'a')),
    '第二条 {{变量}}\n\n# A\n\n第一条',
  );
  assert.equal(joinPrompts([a, b].filter((item) => item.id !== 'a')), b.body);
  assert.equal(joinPrompts([]), '');
});
