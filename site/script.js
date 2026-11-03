import { formatUpdatedAt } from './time.js';
import { initPromptCollection } from './prompt-collection.js';

const REPOSITORY_URL = 'https://github.com/zhihuahuang/agent-kit';
const $ = (selector) => document.querySelector(selector);
const promptCollection = initPromptCollection();
let items = [];
let selectedType = 'skills';
let current = null;
let copyResetTimer;
let promptCopyResetTimer;

function setCopyState(copied, button = $('#copy-install')) {
  const label = button.id === 'copy-install' ? '复制安装命令' : '复制';
  button.classList.toggle('copied', copied);
  button.setAttribute('aria-label', copied ? '已复制' : label);
  button.title = copied ? '已复制' : label;
}

function element(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

function renderList() {
  const query = $('#search').value.trim().toLocaleLowerCase();
  const available = items.filter((item) => item.type === selectedType);
  const matchingItems = items.filter((item) =>
    `${item.name} ${item.description}`.toLocaleLowerCase().includes(query),
  );
  for (const type of ['skills', 'prompts']) {
    $(`#${type}-count`).textContent = matchingItems.filter(
      (item) => item.type === type,
    ).length;
  }
  const matches = matchingItems.filter((item) => item.type === selectedType);
  $('#list').replaceChildren(
    ...matches.map((item, index) => {
      const row = element('a', '', 'resource-row');
      row.href = `#/${item.type}/${encodeURIComponent(item.id)}`;
      const summary = element('div', '', 'resource-summary');
      summary.append(element('h2', item.name), element('p', item.description));
      row.append(
        element('span', String(index + 1), 'row-number'),
        summary,
        element('span', formatUpdatedAt(item.updated_at), 'column-time'),
      );
      return row;
    }),
  );
  $('#empty').hidden = matches.length > 0;
  $('#empty-title').textContent = available.length
    ? '没有匹配结果'
    : `暂无 ${selectedType === 'skills' ? 'Skills' : 'Prompts'}`;
}

function selectType(type) {
  selectedType = type;
  for (const button of document.querySelectorAll('[data-type]')) {
    const active = button.dataset.type === type;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  renderList();
}

function route() {
  promptCollection.setCurrent(null);
  clearTimeout(promptCopyResetTimer);
  setCopyState(false, $('#copy-prompt'));
  $('#prompt-copy-status').textContent = '';
  clearTimeout(copyResetTimer);
  setCopyState(false);
  $('#error').hidden = true;
  $('#install-status').textContent = '';
  const match = location.hash.match(/^#\/(skills|prompts)\/([^/]+)$/);
  if (!match) {
    current = null;
    $('#catalog').hidden = false;
    $('#detail').hidden = true;
    document.title = 'Agent Kit · Skills & Prompts';
    renderList();
    return;
  }
  let id;
  try {
    id = decodeURIComponent(match[2]);
  } catch {
    id = '';
  }
  current = items.find((item) => item.type === match[1] && item.id === id);
  $('#catalog').hidden = true;
  $('#detail').hidden = !current;
  if (!current) {
    $('#error').textContent =
      '资源不存在或已移除，请点击左上角 Agent Kit 返回列表。';
    $('#error').hidden = false;
    return;
  }
  promptCollection.setCurrent(current);
  selectType(current.type);
  $('#detail-type').textContent =
    `${current.type === 'skills' ? 'SKILL' : 'PROMPT'} / ${current.name}`;
  $('#detail-name').textContent = current.name;
  $('#detail-description').textContent = current.description;
  $('#detail-time').textContent = formatUpdatedAt(current.updated_at);
  $('#detail-time').dateTime = new Date(current.updated_at).toISOString();
  $('#source').href = `${REPOSITORY_URL}/blob/main/${current.file}`;
  $('#install').hidden = current.type !== 'skills';
  $('#prompt-actions').hidden = current.type !== 'prompts';
  $('#install-command').textContent =
    current.type === 'skills'
      ? `npx skills add ${REPOSITORY_URL} --skill ${current.id}`
      : '';
  // HTML 在构建阶段经 sanitize-html 清理，浏览器不加载外部解析脚本。
  $('#markdown').innerHTML = current.html;
  document.title = `${current.name} · Agent Kit`;
  $('#detail-name').focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

for (const button of document.querySelectorAll('[data-type]'))
  button.addEventListener('click', () => selectType(button.dataset.type));
$('#search').addEventListener('input', renderList);
$('#copy-install').addEventListener('click', async () => {
  if (!current || current.type !== 'skills') return;
  const item = current;
  clearTimeout(copyResetTimer);
  setCopyState(false);
  $('#install-status').textContent = '';
  try {
    await navigator.clipboard.writeText($('#install-command').textContent);
    if (current !== item) return;
    setCopyState(true);
    copyResetTimer = setTimeout(() => setCopyState(false), 2000);
  } catch {
    if (current !== item) return;
    $('#install-status').textContent = '复制失败，请手动选中命令复制。';
  }
});

$('#copy-prompt').addEventListener('click', async () => {
  if (!current || current.type !== 'prompts') return;
  const item = current;
  const button = $('#copy-prompt');
  clearTimeout(promptCopyResetTimer);
  setCopyState(false, button);
  $('#prompt-copy-status').textContent = '';
  try {
    await navigator.clipboard.writeText(item.body);
    if (current !== item) return;
    setCopyState(true, button);
    promptCopyResetTimer = setTimeout(() => setCopyState(false, button), 2000);
  } catch {
    if (current !== item) return;
    $('#prompt-copy-status').textContent = '复制失败，请手动选中正文复制。';
  }
});

fetch('./manifest.json')
  .then((response) => {
    if (!response.ok) throw new Error('资源列表加载失败');
    return response.json();
  })
  .then((manifest) => {
    items = manifest.items;
    selectType('skills');
    route();
    window.addEventListener('hashchange', route);
  })
  .catch(() => {
    $('#error').textContent =
      '无法加载资源列表，请刷新重试；本地预览需要通过 HTTP 服务访问构建后的 dist 目录。';
    $('#error').hidden = false;
  });
