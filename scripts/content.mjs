import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parse } from 'yaml';
import { marked } from 'marked';

export const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trimEnd();
const splitPaths = text => text.split('\0').filter(Boolean);
export function snapshot(ref) {
  if (ref) {
    const entries = splitPaths(git('ls-tree', '-rz', ref));
    for (const entry of entries) {
      const [info, file] = entry.split('\t');
      if (/^(skills|prompts)\//.test(file) && !info.startsWith('100')) throw new Error(`${file}: 内容目录不支持软链接或子模块`);
    }
    const files = new Set(entries.map(entry => entry.slice(entry.indexOf('\t') + 1)));
    return { files, read: file => git('show', `${ref}:${file}`) };
  }
  const files = new Set();
  const ignored = new Set(splitPaths(git('ls-files', '--others', '--ignored', '--exclude-standard', '-z', '--', 'skills', 'prompts')));
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = path.posix.join(dir, entry.name);
      if (ignored.has(file)) continue;
      if (entry.isSymbolicLink()) throw new Error(`${file}: 内容目录不支持软链接`);
      if (entry.isDirectory()) walk(file);
      else files.add(file);
    }
  }
  for (const dir of ['skills', 'prompts']) {
    try { walk(dir); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return { files, read: file => readFileSync(file, 'utf8') };
}
export function parseContent(text, file) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error(`${file}: 缺少 YAML 元信息`);
  let data;
  try { data = parse(match[1]); } catch (error) { throw new Error(`${file}: ${error.message}`); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(`${file}: 元信息必须为对象`);
  return { data, body: text.slice(match[0].length) };
}
function validTime(value) {
  return typeof value === 'string' && /^\d{13}$/.test(value) && Number(value) % 60000 === 0;
}
export function localTarget(href, file) {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(href)) return null;
  const target = decodeURIComponent(href.split(/[?#]/)[0]);
  if (!target) return null;
  return path.posix.normalize(path.posix.join(path.posix.dirname(file), target));
}
export function collect(source) {
  const skillNames = [...new Set([...source.files].filter(file => /^skills\/[^/]+\//.test(file)).map(file => file.split('/')[1]))];
  const entries = skillNames.map(name => ({ type: 'skills', id: name, file: `skills/${name}/SKILL.md` }));
  for (const file of source.files) {
    if (/^prompts\/[^/]+\.md$/.test(file)) entries.push({ type: 'prompts', id: path.posix.basename(file, '.md'), file });
    else if (file.startsWith('prompts/') && file !== 'prompts/.gitkeep') throw new Error(`${file}: Prompt 应为 prompts/<名称>.md`);
  }
  const names = new Set();
  return entries.map(entry => {
    const { file, id, type } = entry;
    if (!source.files.has(file)) throw new Error(`${file}: Skill 缺少 SKILL.md`);
    const { data, body } = parseContent(source.read(file), file);
    if (data.name !== id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || id.length > 64) throw new Error(`${file}: name 必须与目录/文件名一致，使用小写字母、数字和单连字符，最多 64 字符`);
    if (names.has(`${type}/${data.name}`)) throw new Error(`${file}: 名称重复`);
    names.add(`${type}/${data.name}`);
    if (typeof data.description !== 'string' || !data.description.trim() || data.description.length > 1024) throw new Error(`${file}: description 必须为 1–1024 字符`);
    if (!data.metadata || Array.isArray(data.metadata) || typeof data.metadata !== 'object' || Object.values(data.metadata).some(value => typeof value !== 'string')) throw new Error(`${file}: metadata 必须为字符串键值映射，且包含 updated_at`);
    if (!validTime(data.metadata.updated_at)) throw new Error(`${file}: metadata.updated_at 必须为加引号的 13 位 Unix 毫秒时间戳，且对齐到分钟（可被 60000 整除）`);
    if (!body.trim()) throw new Error(`${file}: 正文不能为空`);
    const markdownFiles = type === 'skills' ? [...source.files].filter(p => p.startsWith(`skills/${id}/`) && p.endsWith('.md')) : [file];
    for (const markdownFile of markdownFiles) {
      const tokens = marked.lexer(markdownFile === file ? body : source.read(markdownFile));
      marked.walkTokens(tokens, token => {
        if (token.type !== 'link' && token.type !== 'image') return;
        const target = localTarget(token.href, markdownFile);
        if (target === null) return;
        const prefix = type === 'skills' ? `skills/${id}/` : 'prompts/';
        if (!target.startsWith(prefix) || !source.files.has(target)) throw new Error(`${markdownFile}: 本地引用不存在或超出资源目录：${token.href}`);
      });
    }
    return { ...entry, name: data.name, description: data.description, updated_at: Number(data.metadata.updated_at), body };
  }).sort((a, b) => b.updated_at - a.updated_at || a.name.localeCompare(b.name));
}
export function checkChanges(before, after, changed) {
  const entries = collect(after);
  const changedSkills = new Set(changed.filter(file => /^skills\/[^/]+\//.test(file)).map(file => file.split('/')[1]));
  for (const entry of entries.filter(entry => entry.type === 'skills' && changedSkills.has(entry.id))) {
    if (!before.files.has(entry.file)) continue;
    const old = parseContent(before.read(entry.file), entry.file).data.metadata?.updated_at;
    if (validTime(old) && entry.updated_at <= Number(old)) throw new Error(`${entry.file}: metadata.updated_at 必须晚于 ${old}；请更新为当前分钟的 Unix 毫秒时间戳并一起 git add（同一分钟不能重复更新时间）`);
  }
  return entries;
}
export const changedPaths = (before, after) => splitPaths(git('diff', '--name-only', '--no-renames', '-z', before, after, '--', 'skills', 'prompts'));
