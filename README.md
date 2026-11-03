# Agent Kit

集中存放可复用的 Agent Skills 与 Prompts，并通过 GitHub Pages 提供浏览、搜索和安装入口。

网站配置地址：[zhihuahuang.github.io/agent-kit](https://zhihuahuang.github.io/agent-kit/)。首次启用 Pages 并成功执行发布流程后可访问。

## 目录

```text
skills/<名称>/SKILL.md   Skill 入口，附属脚本与资料放在同一目录
prompts/<名称>.md       可直接复制使用的 Prompt
site/                   静态网站页面、样式和交互
scripts/                内容校验、构建及 hook 安装脚本
test/                   校验规则、网站构建和 hook 测试
.github/workflows/      内容检查与 GitHub Pages 发布流程
CONTRIBUTING.md          内容格式与维护约定
```

格式示例见 [贡献指南](CONTRIBUTING.md)。网站索引、Markdown 预览和引用资源由源文件生成，`dist/` 不进入 Git。

## 本地使用

环境：Node.js 22 或更高版本、npm、Git。

```bash
npm ci
npm run check
npm run build
```

`npm ci` 会安装本仓库的 pre-commit hook，并串联已有 hooks；只改变本仓库 Git 配置，不修改全局 hook 文件。CI 使用 `npm ci --ignore-scripts`，直接运行同一套检查。

常用命令：

| 命令 | 用途 |
| --- | --- |
| `npm run check` | 检查工作区内容格式、时间和 Markdown 本地文件引用 |
| `npm run check:staged` | 检查真正将提交的暂存内容和 Skill 时间变更 |
| `npm run test:content` | 运行本仓库内容、构建和 hook 的定向测试 |
| `npm run build` | 校验内容并生成 `dist/` |
| `npm run prepare` | 安装或重新安装 hooks |

需要预览时，可在安装了 Python 3 的环境运行 `python3 -m http.server 4173 --directory dist`，然后访问 `http://localhost:4173/`。不要直接用 `file://` 打开 HTML。停止预览按 Ctrl+C。

## 使用 Skill

Skill 发布到 GitHub 后，可在目标项目目录使用 [Skills CLI](https://github.com/vercel-labs/skills) 安装（Node.js 22.20 或更高版本）：

```bash
npx skills add https://github.com/zhihuahuang/agent-kit --skill <名称>
```

命令会引导选择 Agent，默认安装到当前项目；添加 `-g` 可全局安装。详情页提供对应命令和复制按钮，“查看源码”指向原始 `SKILL.md`。

本仓库不自动把全部资源加载成当前项目的技能。

## 使用 Prompt

在详情页点击“复制”，复制不含 YAML 元信息的原始 Markdown 正文，按文档说明替换变量后使用；需要原始文件时点击“查看源码”。

点击“拼接”可将 Prompt 加入顶部列表。悬停或点击顶部列表图标，点击垃圾桶可删除条目，拖动调整顺序；“复制全部”按当前顺序拼接原始正文，正文间用空行分隔。列表仅保留在当前页面会话，刷新后清空。

## 更新时间与提交检查

统一读取 `metadata.updated_at`，存储加引号的 13 位 Unix 毫秒时间戳，例如 `"1793694300000"`。值必须对齐到分钟（可被 60000 整除）。构建索引输出数值，前端按访问者本地时区显示为 `2026-11-03 16:25 GMT+8`，支持夏令时。时间戳本身不绑定时区，不展示版本号，也不从 Git 提交时间推导。

- 修改 `skills/<名称>/` 内任意文件，必须同时暂存对应 `SKILL.md` 的时间变更，且时间晚于上次提交。
- 新增 Skill 必须有合法时间；删除整个 Skill 不要求更新时间；只删除入口、留下其他文件会失败。
- 同一分钟再次提交同一 Skill 会被拦截，请等下一分钟并填写实际时间。不要填写未来时间绕过约定。
- 本地 hook 读取暂存区快照，工作区未暂存的修改不影响结果。
- CI 逐提交检查范围，后续补改时间不能掩盖前面的违规提交。合并提交相对第一父提交检查；新增分支或手动发布会检查可达历史。
- Prompt 也必须有合法时间，用于网站展示；当前自动强制“修改时更新时间”的规则仅针对 Skill。

Git 的 `--no-verify` 可以跳过本地 hook，因此要在 GitHub 分支规则中把“校验与构建”设为必需检查，才能阻止不合规内容合入。CI 失败也会阻止网站发布。

## GitHub Pages

1. 将仓库推送到 GitHub 的 `main` 分支。
2. 在 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**。
3. 查看“发布 GitHub Pages”工作流；可在 Actions 页面手动运行。

`main` 的更新先执行校验和测试，构建成功后才发布同一份产物；PR 和其他分支只检查并保留构建产物。网站使用相对资源路径和 hash 详情路由，支持 `/agent-kit/` 子目录。

仓库迁移或修改默认分支时，同步调整 `site/index.html`、`site/script.js` 内的源码链接及工作流分支设置。

## 恢复原有 hooks

安装器把原路径保存在仓库本地 Git 配置中：

```bash
git config --local core.hooksPath "$(git config --local --get agentKit.previousHooksPath)"
```

之后执行 `npm run prepare` 可重新启用本仓库检查。没有安装依赖的克隆不会自动启用本地检查，CI 仍然执行。
