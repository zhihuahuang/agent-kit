import { execFileSync } from 'node:child_process';
import { git, snapshot, collect, checkChanges, changedPaths } from './content.mjs';

const emptyTree = () => execFileSync('git', ['hash-object', '-w', '-t', 'tree', '--stdin'], { input: '', encoding: 'utf8' }).trim();
try {
  const args = process.argv.slice(2);
  if (!args.length) {
    console.log(`内容校验通过：${collect(snapshot()).length} 项资源`);
  } else if (args.length === 1 && args[0] === '--staged') {
    let head;
    try { head = git('rev-parse', '--verify', 'HEAD'); } catch { head = emptyTree(); }
    // write-tree 只生成暂存区快照，不改变暂存区或工作区。
    const staged = git('write-tree');
    checkChanges(snapshot(head), snapshot(staged), changedPaths(head, staged));
    console.log('暂存内容和 Skill 更新时间校验通过');
  } else if (args.length === 3 && args[0] === '--range') {
    const head = git('rev-parse', '--verify', `${args[2]}^{commit}`);
    const base = /^0+$/.test(args[1]) ? null : git('rev-parse', '--verify', `${args[1]}^{commit}`);
    const commits = git('rev-list', '--reverse', '--topo-order', base ? `${base}..${head}` : head).split('\n').filter(Boolean);
    for (const commit of commits) {
      const parent = git('rev-list', '--parents', '-n', '1', commit).split(' ')[1] || emptyTree();
      try { checkChanges(snapshot(parent), snapshot(commit), changedPaths(parent, commit)); }
      catch (error) { throw new Error(`提交 ${commit.slice(0, 8)}：${error.message}`); }
    }
    console.log(`提交范围校验通过：${commits.length} 个提交`);
  } else {
    throw new Error('用法：node scripts/validate-content.mjs [--staged | --range <base> <head>]');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
