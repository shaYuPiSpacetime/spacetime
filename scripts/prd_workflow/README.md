# PRD Claude Code 自动核查脚本

本目录用于把 PRD 正式版核查流程交给本机 Claude Code CLI 自动执行。

## 基本用法

第一轮核查：

```bash
scripts/prd_workflow/claude_prd_review.sh \
  --module-id PRD-03 \
  --module-name 消息、私信与通知中心 \
  --prd-dir "docs/需求文档/需求文档-正式版/03-消息、私信与通知中心" \
  --source "docs/需求文档/移动端/细化PRD-03_消息、私信与通知中心.md" \
  --source "docs/需求文档/管理后台/管理后台细化PRD-03_消息、私信与通知中心.md" \
  --round 1
```

第二轮复核：

```bash
scripts/prd_workflow/claude_prd_review.sh \
  --module-id PRD-03 \
  --module-name 消息、私信与通知中心 \
  --prd-dir "docs/需求文档/需求文档-正式版/03-消息、私信与通知中心" \
  --source "docs/需求文档/移动端/细化PRD-03_消息、私信与通知中心.md" \
  --source "docs/需求文档/管理后台/管理后台细化PRD-03_消息、私信与通知中心.md" \
  --previous-report "docs/需求文档/需求文档-正式版/03-消息、私信与通知中心/PRD-03_核查报告_第1轮.md" \
  --fix-log "docs/需求文档/需求文档-正式版/03-消息、私信与通知中心/PRD-03_核查整改记录.md" \
  --round 2
```

## 输出文件

脚本会在 `--prd-dir` 指向的目录生成或更新：

- `PRD-XX_Claude核查任务_第1轮.md`
- `PRD-XX_核查报告_第1轮.md`
- `PRD-XX_Claude核查任务_第2轮.md`
- `PRD-XX_核查报告_第2轮.md`
- `PRD-XX_核查报告_两轮汇总.md`
- `PRD-XX_核查聊天记录.md`

## 安全默认值

脚本默认以只读方式调用 Claude Code CLI：

```bash
claude -p --permission-mode dontAsk --allowedTools Read,Grep,Glob,LS --output-format text
```

默认不给 Claude `Edit`、`Write`、`Bash` 权限。
