import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../scripts/validate-content.mjs', import.meta.url));
const skill = (time = '1793694300000', body = '# 测试\n') => `---\nname: demo\ndescription: 测试技能\nmetadata:\n  updated_at: "${time}"\n---\n${body}`;
function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'agent-kit-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const env = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_AUTHOR_NAME: '测试', GIT_AUTHOR_EMAIL: 'test@example.com', GIT_COMMITTER_NAME: '测试', GIT_COMMITTER_EMAIL: 'test@example.com' };
  const git = (...args) => {
    const result = spawnSync('git', args, { cwd: root, env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  const write = (file, content) => { mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); writeFileSync(path.join(root, file), content); };
  const commit = () => {
    git('add', '.');
    const head = spawnSync('git', ['rev-parse', '--verify', 'HEAD'], { cwd: root, env, encoding: 'utf8' });
    const sha = git('commit-tree', git('write-tree'), ...(head.status === 0 ? ['-p', head.stdout.trim()] : []), '-m', '测试快照');
    git('update-ref', 'HEAD', sha);
    return sha;
  };
  const check = (...args) => spawnSync(process.execPath, [cli, ...args], { cwd: root, env, encoding: 'utf8' });
  git('init', '-q');
  write('skills/demo/SKILL.md', skill());
  return { root, git, write, commit, check };
}
function passes(result) { assert.equal(result.status, 0, result.stderr); }
function fails(result, pattern) { assert.notEqual(result.status, 0); assert.match(result.stderr, pattern); }

test('新增技能必须带合法时间，支持初始提交', t => {
  const f = fixture(t); f.git('add', '.'); passes(f.check('--staged'));
  f.write('skills/demo/SKILL.md', skill('2026-02-30 16:25')); f.git('add', '.');
  fails(f.check('--staged'), /updated_at/);
});
test('辅助文件变更但时间不变时拒绝', t => {
  const f = fixture(t); f.commit(); f.write('skills/demo/references/a.md', '参考'); f.git('add', '.');
  fails(f.check('--staged'), /updated_at.*晚于/);
});
test('工作区更新时间但未暂存仍拒绝', t => {
  const f = fixture(t); f.commit(); f.write('skills/demo/run.sh', 'echo ok'); f.git('add', '.');
  f.write('skills/demo/SKILL.md', skill('1793694360000'));
  fails(f.check('--staged'), /updated_at.*晚于/);
});
test('暂存时间向后更新允许提交，不受未暂存内容影响', t => {
  const f = fixture(t); f.commit(); f.write('skills/demo/SKILL.md', skill('1793694360000')); f.git('add', '.');
  f.write('skills/demo/SKILL.md', '未暂存的损坏内容'); passes(f.check('--staged'));
});
test('时间倒退和秒精度拒绝', t => {
  const f = fixture(t); f.commit();
  for (const time of ['1793694240000', '1793694361000']) {
    f.write('skills/demo/SKILL.md', skill(time)); f.git('add', '.'); fails(f.check('--staged'), /updated_at/);
  }
});
test('删除整个技能允许，仅删除入口拒绝', t => {
  const f = fixture(t); f.write('skills/demo/run.sh', 'echo ok'); f.commit();
  f.git('rm', 'skills/demo/SKILL.md'); fails(f.check('--staged'), /SKILL.md/);
  f.git('rm', 'skills/demo/run.sh'); passes(f.check('--staged'));
});
test('不相关提交不要求更新时间', t => {
  const f = fixture(t); f.commit(); f.write('README.md', '说明'); f.git('add', '.'); passes(f.check('--staged'));
});
test('检查本地链接，支持 Markdown 引用式链接', t => {
  const f = fixture(t); f.write('skills/demo/SKILL.md', skill(undefined, '[参考][ref]\n\n[ref]: references/a.md\n'));
  fails(f.check(), /references\/a.md/);
  f.write('skills/demo/references/a.md', '参考'); passes(f.check());
});
test('缺少时间或重复 YAML 字段拒绝', t => {
  const f = fixture(t);
  f.write('skills/demo/SKILL.md', '---\nname: demo\ndescription: 测试\n---\n正文'); fails(f.check(), /updated_at/);
  f.write('skills/demo/SKILL.md', skill().replace('name: demo', 'name: demo\nname: duplicate')); fails(f.check(), /key|键/i);
});
test('CI 逐提交检查，后续修正不能掩盖漏更时间的提交', t => {
  const f = fixture(t); const base = f.commit();
  f.write('skills/demo/run.sh', 'echo ok'); f.commit();
  f.write('skills/demo/SKILL.md', skill('1793694360000')); const head = f.commit();
  fails(f.check('--range', base, head), /updated_at.*晚于/);
});
test('CI 允许合法的多提交范围', t => {
  const f = fixture(t); const base = f.commit();
  f.write('skills/demo/SKILL.md', skill('1793694360000')); const head = f.commit();
  passes(f.check('--range', base, head));
});

test('拒绝秒时间戳、未对齐分钟、旧格式和未加引号的值', t => {
  const f = fixture(t);
  for (const time of ['1793694300', '1793694300001', '2026-11-03 16:25', 'not-a-date']) {
    f.write('skills/demo/SKILL.md', skill(time)); fails(f.check(), /updated_at/);
  }
  f.write('skills/demo/SKILL.md', skill().replace('"1793694300000"', '1793694300000'));
  fails(f.check(), /metadata/);
});
