export function addPrompt(items, prompt) {
  return items.some((item) => item.id === prompt.id)
    ? items
    : [...items, prompt];
}

export function movePrompt(items, sourceId, targetId) {
  const from = items.findIndex((item) => item.id === sourceId);
  const to = items.findIndex((item) => item.id === targetId);
  if (from < 0 || to < 0 || from === to) return items;
  const result = [...items];
  result.splice(to, 0, result.splice(from, 1)[0]);
  return result;
}

export function joinPrompts(items) {
  return items.map((item) => item.body.trim()).join('\n\n');
}

export function initPromptCollection() {
  const root = document.querySelector('#prompt-collection');
  const toggle = document.querySelector('#collection-toggle');
  const panel = document.querySelector('#collection-panel');
  const list = document.querySelector('#collection-list');
  const add = document.querySelector('#add-prompt');
  const copy = document.querySelector('#copy-collection');
  const status = document.querySelector('#collection-status');
  let items = [];
  let current = null;
  let dragging = null;
  let pointerInside = false;
  let copyTimer;

  function show(open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  }

  function updateAddButton() {
    const included = current && items.some((item) => item.id === current.id);
    add.disabled = !current || included;
    add.querySelector('span').textContent = included ? '已拼接' : '拼接';
  }

  function reorder(sourceId, targetId) {
    items = movePrompt(items, sourceId, targetId);
    render();
  }

  function render() {
    root.hidden = items.length === 0;
    if (root.hidden) {
      pointerInside = false;
      show(false);
    }
    clearTimeout(copyTimer);
    status.textContent = '';
    copy.textContent = '复制全部';
    copy.disabled = items.length === 0;
    document.querySelector('#collection-count').textContent = items.length;
    document.querySelector('#collection-empty').hidden = items.length > 0;
    toggle.setAttribute('aria-label', `Prompt 拼接，已选 ${items.length} 项`);
    updateAddButton();
    list.replaceChildren(
      ...items.map((item, index) => {
        const row = document.createElement('li');
        row.draggable = true;
        row.dataset.id = item.id;
        const grip = document.createElement('span');
        grip.className = 'collection-grip';
        grip.textContent = '⠿';
        grip.title = '拖动排序';
        grip.setAttribute('aria-hidden', 'true');
        const number = document.createElement('span');
        number.className = 'collection-number';
        number.textContent = String(index + 1);
        const name = document.createElement('span');
        name.className = 'collection-name';
        name.textContent = item.name;
        name.title = item.description;
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'collection-remove';
        remove.setAttribute('aria-label', `删除 ${item.name}`);
        remove.title = '删除';
        remove.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6"/></svg>';
        remove.addEventListener('click', () => {
          items = items.filter(entry => entry.id !== item.id);
          render();
        });
        row.append(grip, number, name, remove);
        row.addEventListener('dragstart', (event) => {
          dragging = item.id;
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', item.id);
          row.classList.add('dragging');
        });
        row.addEventListener('dragover', (event) => {
          if (!dragging || dragging === item.id) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          row.classList.add('drop-target');
        });
        row.addEventListener('dragleave', () =>
          row.classList.remove('drop-target'),
        );
        row.addEventListener('drop', (event) => {
          event.preventDefault();
          if (dragging) reorder(dragging, item.id);
          dragging = null;
        });
        row.addEventListener('dragend', () => {
          dragging = null;
          for (const entry of list.children)
            entry.classList.remove('dragging', 'drop-target');
        });
        return row;
      }),
    );
  }

  add.addEventListener('click', () => {
    if (!current) return;
    items = addPrompt(items, current);
    render();
  });
  copy.addEventListener('click', async () => {
    if (!items.length) return;
    const text = joinPrompts(items);
    clearTimeout(copyTimer);
    status.textContent = '';
    try {
      await navigator.clipboard.writeText(text);
      if (text !== joinPrompts(items)) return;
      copy.textContent = '已复制';
      copyTimer = setTimeout(() => {
        copy.textContent = '复制全部';
      }, 2000);
    } catch {
      if (text === joinPrompts(items))
        status.textContent = '复制失败，请重试。';
    }
  });
  root.addEventListener('pointerenter', () => {
    pointerInside = true;
    show(true);
  });
  root.addEventListener('pointerleave', () => {
    pointerInside = false;
    if (!dragging && !root.contains(document.activeElement)) show(false);
  });
  root.addEventListener('focusin', () => show(true));
  root.addEventListener('focusout', (event) => {
    if (!pointerInside && !dragging && !root.contains(event.relatedTarget)) show(false);
  });
  toggle.addEventListener('click', () => show(true));
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      toggle.focus();
      show(false);
    }
  });
  document.addEventListener('click', (event) => {
    // 删除条目会移除点击目标；事件传播路径仍保留操作发生时的父节点。
    if (!event.composedPath().includes(root)) show(false);
  });
  render();
  return {
    setCurrent(item) {
      current = item?.type === 'prompts' ? item : null;
      updateAddButton();
    },
  };
}
