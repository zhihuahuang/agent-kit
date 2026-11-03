import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { snapshot, collect, localTarget } from './content.mjs';

try {
  const source = snapshot();
  const entries = collect(source);
  rmSync('dist', { recursive: true, force: true });
  cpSync('site', 'dist', { recursive: true });
  const items = entries.map(({ body, ...entry }) => {
    const prefix = entry.type === 'skills' ? `skills/${entry.id}/` : entry.file;
    for (const file of source.files) {
      if (file === prefix || file.startsWith(prefix)) {
        mkdirSync(`dist/resources/${file.slice(0, file.lastIndexOf('/'))}`, {
          recursive: true,
        });
        cpSync(file, `dist/resources/${file}`);
      }
    }
    const tokens = marked.lexer(body);
    marked.walkTokens(tokens, (token) => {
      if (token.type !== 'link' && token.type !== 'image') return;
      const target = localTarget(token.href, entry.file);
      if (target)
        token.href = `resources/${target.split('/').map(encodeURIComponent).join('/')}${token.href.match(/[?#].*$/)?.[0] || ''}`;
    });
    const html = sanitizeHtml(marked.parser(tokens), {
      allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img'],
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        img: ['src', 'alt', 'title'],
        code: ['class'],
      },
    });
    return { ...entry, html, ...(entry.type === 'prompts' ? { body } : {}) };
  });
  writeFileSync(
    'dist/manifest.json',
    JSON.stringify({ items }, null, 2) + '\n',
  );
  writeFileSync('dist/.nojekyll', '');
  console.log(`网站构建完成：${items.length} 项资源 → dist/`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
