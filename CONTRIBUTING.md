# 内容编写与贡献

## 新增 Skill

创建 `skills/<名称>/SKILL.md`。名称使用小写字母、数字和单连字符，不超过 64 字符，与 YAML 中的 `name` 一致。

```markdown
---
name: example-skill
description: 说明技能做什么，以及何时应该使用。
metadata:
  updated_at: "1793694300000"
---

# 技能名称

## 适用场景

说明触发条件、需要用户提供的输入及依赖。

## 执行步骤

1. 获取必要信息。
2. 执行任务。
3. 验证结果。

## 输出要求

说明完成标准和预期输出。
```

上面的值为 Unix 毫秒时间戳，对应 `2026-11-03 16:25 GMT+8`。创建或修改时填写当前时间戳，对齐到分钟；使用引号保留字符串类型。`metadata` 的值均为字符串。`updated_at` 是本仓库自定义字段，不是 Agent Skills 规范内置字段。

辅助文件按需放在技能目录下的 `references/`、`scripts/` 或 `assets/`。用相对 Markdown 链接引用资料，例如 `[参考](references/guide.md)`；本地链接必须指向同一 Skill 目录内存在的文件。校验器支持普通链接、图片和引用式链接，不校验外部 URL、标题锚点或代码块中的路径。

Skill 通过仓库安装，网站构建保留目录内的引用资源，不使用指向外部文件的软链接。不要放入临时文件、依赖目录或凭据。

格式参考：[Agent Skills 官方规范](https://agentskills.io/specification)。

## 新增 Prompt

创建 `prompts/<名称>.md`：

```markdown
---
name: example-prompt
description: 说明提示词用途。
metadata:
  updated_at: "1793694300000"
---

请根据以下材料整理一份简洁摘要：

{{材料}}

要求：保留关键事实，列出尚未明确的问题。
```

变量说明直接写在正文中；网站展示并支持复制正文，不执行变量替换。名称、描述和时间格式规则与 Skill 相同。

## 修改与提交

获取当前分钟的时间戳：

```bash
node -p 'String(Math.floor(Date.now() / 60000) * 60000)'
```

将输出值加引号填入 `metadata.updated_at`。网站按访问者本地时区显示日期和 `GMT` 偏移量，列表和详情一致。

1. 修改源文件。
2. 如果改了某个 Skill 目录内的任何文件，把其 `SKILL.md` 中的 `metadata.updated_at` 更新为当前分钟的 Unix 毫秒时间戳，且晚于原值。Prompt 也应同步维护时间。
3. `git add` 时包含资源变更和时间变更。
4. 执行 `npm run check:staged`，确认本次提交通过。
5. 提交；pre-commit 会再次校验。提交描述使用简洁中文，不添加任何 AI 签名标记。

本仓库安装器会保留并调用已有 hooks，无需额外配置签名 hook。

CI 会检查每个提交，若漏更时间，应修正对应提交；不能只追加一个“补时间”提交。分支合并时也需保证最终 Skill 时间晚于目标分支已有时间。

## 验证范围

修改内容只需内容校验；修改构建或 hook 时运行 `npm run test:content` 和 `npm run build`。不要自动运行额外的全量 lint、类型检查或 E2E，不自动启动浏览器。网站的搜索、安装命令复制、移动布局由维护者在预览中检查。

## 本地开发

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

运行 `npm run preview` 会先构建网站，再启动 Node.js 本地服务，访问 `http://127.0.0.1:3000/`。修改内容后重新执行 `npm run build`。不要直接用 `file://` 打开 HTML。停止预览按 Ctrl+C。

## 更新时间校验规则

统一读取 `metadata.updated_at`，存储加引号的 13 位 Unix 毫秒时间戳，例如 `"1793694300000"`。值必须对齐到分钟（可被 60000 整除）。构建索引输出数值，前端按访问者本地时区显示为 `2026-11-03 16:25 GMT+8`，支持夏令时。时间戳本身不绑定时区，不展示版本号，也不从 Git 提交时间推导。

- 修改 `skills/<名称>/` 内任意文件，必须同时暂存对应 `SKILL.md` 的时间变更，且时间晚于上次提交。
- 新增 Skill 必须有合法时间；删除整个 Skill 不要求更新时间；只删除入口、留下其他文件会失败。
- 同一分钟再次提交同一 Skill 会被拦截，请等下一分钟并填写实际时间。不要填写未来时间绕过约定。
- 本地 hook 读取暂存区快照，工作区未暂存的修改不影响结果。
- CI 逐提交检查范围，后续补改时间不能掩盖前面的违规提交。合并提交相对第一父提交检查；新增分支或手动发布会检查可达历史。
- Prompt 也必须有合法时间，用于网站展示；当前自动强制“修改时更新时间”的规则仅针对 Skill。

Git 的 `--no-verify` 可以跳过本地 hook，因此要在 GitHub 分支规则中把“校验与构建”设为必需检查，才能阻止不合规内容合入。CI 失败也会阻止网站发布。

## 网站发布

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
