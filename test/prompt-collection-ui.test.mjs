import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { initPromptCollection } from '../site/prompt-collection.js';

test('列表内点击和删除保持展开，序号随删除更新，点击外部关闭', t => {
  const { document, window } = parseHTML(readFileSync(new URL('../site/index.html', import.meta.url), 'utf8'));
  const original = globalThis.document;
  globalThis.document = document;
  t.after(() => { globalThis.document = original; });
  const click = node => node.dispatchEvent(new window.Event('click', { bubbles: true }));
  const root = document.querySelector('#prompt-collection');
  assert.equal(root.hidden, true);
  const collection = initPromptCollection();
  assert.equal(root.hidden, true);
  for (const id of ['a', 'b']) {
    collection.setCurrent({ type: 'prompts', id, name: id, body: id });
    click(document.querySelector('#add-prompt'));
  }
  assert.equal(root.hidden, false);
  const panel = document.querySelector('#collection-panel');
  root.dispatchEvent(new window.Event('pointerenter'));
  assert.equal(panel.hidden, false);
  // 鼠标点列表非聚焦区域时，原按钮可能失焦，relatedTarget 为 null。
  const blur = new window.Event('focusout', { bubbles: true });
  blur.relatedTarget = null;
  root.dispatchEvent(blur);
  click(document.querySelector('#collection-list li'));
  assert.equal(panel.hidden, false);
  assert.equal(document.querySelectorAll('#collection-list input').length, 0);
  assert.equal(document.querySelectorAll('.collection-move').length, 0);
  assert.deepEqual([...document.querySelectorAll('.collection-number')].map(node => node.textContent), ['1', '2']);
  click(document.querySelector('.collection-remove'));
  assert.equal(panel.hidden, false);
  assert.equal(document.querySelectorAll('#collection-list li').length, 1);
  assert.equal(document.querySelector('.collection-number').textContent, '1');
  click(document.querySelector('.collection-remove'));
  assert.equal(root.hidden, true);
  assert.equal(panel.hidden, true);
  assert.equal(document.querySelector('#collection-toggle').getAttribute('aria-expanded'), 'false');
  assert.equal(document.querySelector('#copy-collection').disabled, true);
  click(document.querySelector('main'));
  assert.equal(panel.hidden, true);
});
