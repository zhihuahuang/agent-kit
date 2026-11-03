# Agent Kit

可复用的 Agent Skills 与 Prompts，帮助 Agent 完成写作、编程协作等任务。

[浏览网站](https://zhihuahuang.github.io/agent-kit/) · [贡献指南](CONTRIBUTING.md)

## Skills

Skill 包含任务说明、执行步骤及所需资料，可安装到支持它的 Agent 中使用。

在网站中选择 Skill，复制详情页的安装命令，在目标项目目录运行：

```bash
npx skills add https://github.com/zhihuahuang/agent-kit --skill <名称>
```

按照命令提示选择要安装到的 Agent。更多用法见 [Skills CLI](https://github.com/vercel-labs/skills)。

## Prompts

Prompt 是可直接复制到对话中使用的提示词。

在网站详情页点击「复制」获取正文。需要组合多个 Prompt 时，点击「拼接」，在顶部列表中拖动排序，再点击「复制全部」。拼接列表刷新后清空。

## 本地预览

需要 Node.js 22 或更高版本、npm。

```bash
npm ci
npm run preview
```

打开 <http://127.0.0.1:3000/>。修改内容后重新执行 `npm run build`。

`npm ci` 会安装本仓库的提交检查 hook，并保留已有 hooks。

## 贡献

- Skill 放在 `skills/<名称>/SKILL.md`，相关脚本和资料放在同一目录。
- Prompt 放在 `prompts/<名称>.md`。
- 修改 Skill 时，同步更新 `metadata.updated_at`。

内容格式、校验命令和网站发布方式见 [贡献指南](CONTRIBUTING.md)。
