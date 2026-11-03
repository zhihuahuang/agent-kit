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
5. 提交；pre-commit 会再次校验。提交描述使用简洁中文，按仓库约定使用 `AI_SIGN=1 git commit ...` 并检查 hook 追加的签名。

本仓库安装器会保留并调用已有签名 hook，不自行生成签名。缺少签名 hook 时应先完成团队签名配置。

CI 会检查每个提交，若漏更时间，应修正对应提交；不能只追加一个“补时间”提交。分支合并时也需保证最终 Skill 时间晚于目标分支已有时间。

## 验证范围

修改内容只需内容校验；修改构建或 hook 时运行 `npm run test:content` 和 `npm run build`。不要自动运行额外的全量 lint、类型检查或 E2E，不自动启动浏览器。网站的搜索、安装命令复制、移动布局由维护者在预览中检查。
