import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
  cpSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const source = fileURLToPath(new URL('..', import.meta.url));
function setup(t) {
  const root = mkdtempSync(path.join(tmpdir(), "agent kit's test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const env = {
    ...process.env,
    CI: '',
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
  };
  const run = (cmd, args) =>
    spawnSync(cmd, args, { cwd: root, env, encoding: 'utf8' });
  const write = (file, text) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), text);
  };
  run('git', ['init', '-q']);
  return { root, run, write };
}
test('构建保留引用资源、清理不安全 HTML，索引仅保留页面需要的数据', (t) => {
  const f = setup(t);
  cpSync(path.join(source, 'site'), path.join(f.root, 'site'), {
    recursive: true,
  });
  f.write(
    'skills/demo/SKILL.md',
    '---\nname: demo\ndescription: 示例\nmetadata:\n  updated_at: "1793694300000"\n---\n# 示例\n[参考](references/a.md)\n<script>alert(1)</script>\n',
  );
  f.write('skills/demo/references/a.md', '参考内容');
  f.write(
    'prompts/review.md',
    '---\nname: review\ndescription: 审查\nmetadata:\n  updated_at: "1793694300000"\n---\n请审查 {{code}}',
  );
  f.write('.gitignore', 'skills/*/agents/\nskills/*/references/*.txt\n!skills/*/references/keep.txt\n');
  f.write('skills/demo/agents/openai.yaml', '本地配置');
  f.write('skills/demo/references/local.txt', '忽略内容');
  f.write('skills/demo/references/keep.txt', '保留内容');
  f.write('skills/demo/references/tracked.txt', '已跟踪内容');
  assert.equal(f.run('git', ['add', '-f', 'skills/demo/references/tracked.txt']).status, 0);
  const result = f.run(process.execPath, [
    path.join(source, 'scripts/build-site.mjs'),
  ]);
  assert.equal(result.status, 0, result.stderr);
  const items = JSON.parse(
    readFileSync(path.join(f.root, 'dist/manifest.json')),
  ).items;
  assert.equal(items.length, 2);
  assert.equal(items[0].updated_at, 1793694300000);
  const skill = items.find((item) => item.type === 'skills');
  assert.doesNotMatch(skill.html, /<script>/);
  assert.match(skill.html, /resources\/skills\/demo\/references\/a.md/);
  assert.match(
    items.find((item) => item.type === 'prompts').html,
    /请审查 {{code}}/,
  );
  assert.equal(
    readFileSync(
      path.join(f.root, 'dist/resources/skills/demo/references/a.md'),
      'utf8',
    ),
    '参考内容',
  );
  assert.equal(existsSync(path.join(f.root, 'dist/resources/skills/demo/agents/openai.yaml')), false);
  assert.equal(existsSync(path.join(f.root, 'dist/resources/skills/demo/references/local.txt')), false);
  assert.equal(existsSync(path.join(f.root, 'dist/resources/skills/demo/references/keep.txt')), true);
  assert.equal(existsSync(path.join(f.root, 'dist/resources/skills/demo/references/tracked.txt')), true);
  assert.equal(existsSync(path.join(f.root, 'dist/downloads')), false);
  assert.equal(items.find((item) => item.type === 'prompts').body, '请审查 {{code}}');
  assert.equal(Object.hasOwn(skill, 'body'), false);
  for (const item of items) {
    for (const field of ['raw', 'download'])
      assert.equal(Object.hasOwn(item, field), false);
  }
});
test('hook 安装幂等且保留原有 hooks，校验失败会拦截', (t) => {
  const f = setup(t);
  symlinkSync(path.join(source, 'scripts'), path.join(f.root, 'scripts'));
  f.write('previous/pre-commit', '#!/bin/sh\necho previous-hook\n');
  f.write('previous/prepare-commit-msg', '#!/bin/sh\necho signature-hook\n');
  f.run('chmod', ['+x', 'previous/pre-commit', 'previous/prepare-commit-msg']);
  f.run('git', ['config', 'core.hooksPath', 'previous']);
  for (let i = 0; i < 2; i++) {
    const result = f.run(process.execPath, [
      path.join(source, 'scripts/install-hooks.mjs'),
    ]);
    assert.equal(result.status, 0, result.stderr);
  }
  const hooks = f.run('git', ['config', 'core.hooksPath']).stdout.trim();
  const result = f.run(path.join(hooks, 'pre-commit'), []);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /previous-hook/);
  assert.match(
    f.run(path.join(hooks, 'prepare-commit-msg'), []).stdout,
    /signature-hook/,
  );
  f.write('skills/demo/SKILL.md', '缺少元信息');
  f.run('git', ['add', 'skills']);
  const failed = f.run(path.join(hooks, 'pre-commit'), []);
  assert.notEqual(failed.status, 0);
  assert.doesNotMatch(failed.stdout, /previous-hook/);
});
