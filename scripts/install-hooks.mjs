import { mkdirSync, writeFileSync, existsSync, chmodSync, readdirSync, accessSync, constants } from 'node:fs';
import path from 'node:path';
import { git } from './content.mjs';

// CI 只运行校验，不修改 runner 的 Git 配置。
if (!process.env.CI) {
  const root = git('rev-parse', '--show-toplevel');
  const hookDir = path.resolve(root, git('rev-parse', '--git-common-dir'), 'agent-kit-hooks');
  let current;
  try { current = git('config', '--get', 'core.hooksPath'); } catch { current = git('rev-parse', '--git-path', 'hooks'); }
  let previous = path.resolve(root, current);
  if (previous === hookDir) {
    previous = git('config', '--local', '--get', 'agentKit.previousHooksPath');
  } else {
    git('config', '--local', 'agentKit.previousHooksPath', previous);
  }
  mkdirSync(hookDir, { recursive: true });
  const quote = value => "'" + value.replaceAll("'", "'\\''") + "'";
  const hooks = new Set(['pre-commit']);
  if (existsSync(previous)) {
    for (const name of readdirSync(previous)) {
      if (!/^(applypatch-msg|pre-applypatch|post-applypatch|pre-commit|pre-merge-commit|prepare-commit-msg|commit-msg|post-commit|pre-rebase|post-checkout|post-merge|pre-push|pre-receive|update|proc-receive|post-receive|post-update|reference-transaction|push-to-checkout|pre-auto-gc|post-rewrite|sendemail-validate|fsmonitor-watchman|p4-changelist|p4-prepare-changelist|p4-post-changelist|p4-pre-submit|post-index-change)$/.test(name)) continue;
      try { accessSync(path.join(previous, name), constants.X_OK); hooks.add(name); } catch { /* Git 同样忽略不可执行 hook。 */ }
    }
  }
  for (const name of hooks) {
    const prior = quote(path.join(previous, name));
    const validation = name === 'pre-commit' ? 'root=$(git rev-parse --show-toplevel) || exit 1\ncd "$root" || exit 1\nnode scripts/validate-content.mjs --staged || exit $?\n' : '';
    const file = path.join(hookDir, name);
    writeFileSync(file, `#!/bin/sh\n${validation}if [ -x ${prior} ]; then\n  exec ${prior} "$@"\nfi\n`);
    chmodSync(file, 0o755);
  }
  git('config', '--local', 'core.hooksPath', hookDir);
  console.log('已安装 Skill 更新时间 hook，并保留原有 hooks');
}
