#!/usr/bin/env bash
set -eo pipefail

usage() {
  cat <<'EOF'
用法：
  scripts/prd_workflow/claude_prd_review.sh [参数]

必填参数：
  --module-id PRD-XX              模块编号，例如 PRD-03
  --prd-dir PATH                  正式版 PRD 目录
  --source PATH                   原始 PRD、确认清单或参考资料；可重复传入
  --round 1|2                     核查轮次

可选参数：
  --module-name NAME              模块名称；不传时使用 PRD 目录名
  --previous-report PATH          上一轮核查报告；第二轮可传，可重复
  --fix-log PATH                  Codex 整改记录；第二轮建议传入
  --demo-reference PATH           Demo 或页面规格参照目录；第二轮可传
  --extra-context PATH            额外上下文；可重复传入
  --claude-bin PATH               Claude CLI 路径，默认 claude
  --model MODEL                   Claude 模型别名或完整模型名
  --dry-run                       只输出核查任务，不调用 Claude、不写文件
  -h, --help                      显示帮助

示例：
  scripts/prd_workflow/claude_prd_review.sh \
    --module-id PRD-03 \
    --module-name 消息、私信与通知中心 \
    --prd-dir "docs/需求文档/需求文档-正式版/03-消息、私信与通知中心" \
    --source "docs/需求文档/移动端/细化PRD-03_消息、私信与通知中心.md" \
    --source "docs/需求文档/管理后台/管理后台细化PRD-03_消息、私信与通知中心.md" \
    --round 1
EOF
}

die() {
  printf '错误：%s\n' "$*" >&2
  exit 1
}

need_arg() {
  local key="$1"
  local value="${2:-}"
  [[ -n "$value" ]] || die "$key 需要参数"
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

MODULE_ID=""
MODULE_NAME=""
PRD_DIR=""
ROUND=""
CLAUDE_BIN="claude"
MODEL=""
FIX_LOG=""
DEMO_REFERENCE=""
DRY_RUN=0
SOURCE_FILES=()
PREVIOUS_REPORTS=()
EXTRA_CONTEXT=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --module-id)
      need_arg "$1" "${2:-}"
      MODULE_ID="$2"
      shift 2
      ;;
    --module-name)
      need_arg "$1" "${2:-}"
      MODULE_NAME="$2"
      shift 2
      ;;
    --prd-dir)
      need_arg "$1" "${2:-}"
      PRD_DIR="$2"
      shift 2
      ;;
    --source)
      need_arg "$1" "${2:-}"
      SOURCE_FILES+=("$2")
      shift 2
      ;;
    --round)
      need_arg "$1" "${2:-}"
      ROUND="$2"
      shift 2
      ;;
    --previous-report)
      need_arg "$1" "${2:-}"
      PREVIOUS_REPORTS+=("$2")
      shift 2
      ;;
    --fix-log)
      need_arg "$1" "${2:-}"
      FIX_LOG="$2"
      shift 2
      ;;
    --demo-reference)
      need_arg "$1" "${2:-}"
      DEMO_REFERENCE="$2"
      shift 2
      ;;
    --extra-context)
      need_arg "$1" "${2:-}"
      EXTRA_CONTEXT+=("$2")
      shift 2
      ;;
    --claude-bin)
      need_arg "$1" "${2:-}"
      CLAUDE_BIN="$2"
      shift 2
      ;;
    --model)
      need_arg "$1" "${2:-}"
      MODEL="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "未知参数：$1"
      ;;
  esac
done

[[ -n "$MODULE_ID" ]] || die "缺少 --module-id"
[[ -n "$PRD_DIR" ]] || die "缺少 --prd-dir"
[[ -n "$ROUND" ]] || die "缺少 --round"
[[ "$ROUND" == "1" || "$ROUND" == "2" ]] || die "--round 只能是 1 或 2"
[[ -d "$PRD_DIR" ]] || die "正式版 PRD 目录不存在：$PRD_DIR"
[[ ${#SOURCE_FILES[@]} -gt 0 ]] || die "至少需要一个 --source"

if [[ -z "$MODULE_NAME" ]]; then
  MODULE_NAME="$(basename "$PRD_DIR")"
fi

for file in "${SOURCE_FILES[@]}"; do
  [[ -e "$file" ]] || die "source 不存在：$file"
done

if [[ "$ROUND" == "2" && ${#PREVIOUS_REPORTS[@]} -eq 0 ]]; then
  default_previous="$PRD_DIR/${MODULE_ID}_核查报告_第1轮.md"
  if [[ -f "$default_previous" ]]; then
    PREVIOUS_REPORTS+=("$default_previous")
  fi
fi

if [[ "$ROUND" == "2" && -z "$FIX_LOG" ]]; then
  default_fix_log="$PRD_DIR/${MODULE_ID}_核查整改记录.md"
  if [[ -f "$default_fix_log" ]]; then
    FIX_LOG="$default_fix_log"
  fi
fi

for file in "${PREVIOUS_REPORTS[@]}"; do
  [[ -e "$file" ]] || die "previous-report 不存在：$file"
done

if [[ -n "$FIX_LOG" ]]; then
  [[ -e "$FIX_LOG" ]] || die "fix-log 不存在：$FIX_LOG"
fi

if [[ -n "$DEMO_REFERENCE" ]]; then
  [[ -e "$DEMO_REFERENCE" ]] || die "demo-reference 不存在：$DEMO_REFERENCE"
fi

for file in "${EXTRA_CONTEXT[@]}"; do
  [[ -e "$file" ]] || die "extra-context 不存在：$file"
done

TASK_FILE="$PRD_DIR/${MODULE_ID}_Claude核查任务_第${ROUND}轮.md"
REPORT_FILE="$PRD_DIR/${MODULE_ID}_核查报告_第${ROUND}轮.md"
CHAT_LOG="$PRD_DIR/${MODULE_ID}_核查聊天记录.md"
SUMMARY_FILE="$PRD_DIR/${MODULE_ID}_核查报告_两轮汇总.md"
TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S %Z')"

print_file_list() {
  local title="$1"
  shift
  printf '\n## %s\n\n' "$title"
  for file in "$@"; do
    printf -- '- `%s`\n' "$file"
  done
}

build_prompt() {
  cat <<EOF
# ${MODULE_ID} ${MODULE_NAME} 第 ${ROUND} 轮 Claude Code PRD 自动核查任务

你是 Spacetime 项目的 PRD 独立核查负责人。本轮由 Codex 通过脚本调用你做只读核查。

## 强制约束

1. 只读核查，不要修改、创建、删除任何项目文件。
2. 必须使用中文输出。
3. 不要暴露 \`.env\`、\`.claude/settings*.json\`、token、API key 或本地密钥内容。
4. 结论必须可执行：每个问题都要写清文件路径、问题、影响和建议处理方式。
5. 不要只写“建议完善”“需要明确”这种泛化结论。

## 必须先读取的规范

- \`.claude/skills/prd-design/SKILL.md\`
- \`docs/需求文档/标准/README.md\`
- \`docs/需求文档/标准/00_PRD编写规范.md\`
- \`docs/需求文档/标准/05_PRD评审清单.md\`

## 正式版 PRD 目录

- \`${PRD_DIR}\`
EOF

  print_file_list "原始 PRD / 确认清单 / 参考资料" "${SOURCE_FILES[@]}"

  if [[ ${#PREVIOUS_REPORTS[@]} -gt 0 ]]; then
    print_file_list "上一轮核查报告" "${PREVIOUS_REPORTS[@]}"
  fi

  if [[ -n "$FIX_LOG" ]]; then
    print_file_list "Codex 整改记录" "$FIX_LOG"
  fi

  if [[ -n "$DEMO_REFERENCE" ]]; then
    print_file_list "Demo 或页面规格参照" "$DEMO_REFERENCE"
  fi

  if [[ ${#EXTRA_CONTEXT[@]} -gt 0 ]]; then
    print_file_list "额外上下文" "${EXTRA_CONTEXT[@]}"
  fi

  if [[ "$ROUND" == "1" ]]; then
    cat <<'EOF'

## 第一轮核查目标

1. 对比正式版 PRD 与原始 PRD，找遗漏、冲突、模糊和结构偏差。
2. 检查正式版是否遵循 PRD 标准：模块公共定义、端内定义、模块 PRD、页面规格、字段表、操作表、状态、验收标准、UI 画板清单。
3. 按 P0/P1/P2 分级输出问题。
4. 如果正式版比原始版做了合理架构拆分，请标为“合理拆分”，不要误判为遗漏。
5. 输出整体覆盖率、主要风险和是否建议进入整改阶段。

## 第一轮报告格式

# PRD 第一轮核查报告

## 1. 读取范围

列出你实际读取的规范、原始资料和正式版文件范围。

## 2. 结构概览

用表格说明原始 PRD 与正式版文件的对应关系。

## 3. P0 关键问题

表格列：编号、问题、涉及文件、影响、建议处理方式。

## 4. P1 重要偏差

表格列：编号、问题、涉及文件、影响、建议处理方式。

## 5. P2 轻微问题

表格列：编号、问题、涉及文件、影响、建议处理方式。

## 6. 合理拆分与做得好的地方

说明正式版相较原始版更清晰、更可实现的地方。

## 7. 总结与门禁结论

必须给出：通过 / 有条件通过 / 不通过。只要存在未闭环 P0，结论必须是不通过。
EOF
  else
    cat <<'EOF'

## 第二轮核查目标

1. 对照上一轮核查报告和 Codex 整改记录，确认问题是否闭环。
2. 深入复核整体需求是否仍有遗漏、冲突、模糊、不一致。
3. 重点检查跨 PRD 边界、配置项默认值、UI 画板、字段表、操作表、状态、验收标准。
4. 如果存在管理后台页面规格，评估是否可直接进入静态 Demo 编写。
5. 输出是否可进入 UI、Demo、技术方案或测试用例阶段。

## 第二轮报告格式

# PRD 第二轮深度核查报告

## 1. 读取范围

列出你实际读取的规范、正式版文件、上一轮报告、整改记录和参考资料。

## 2. 上轮问题闭环确认

表格列：上轮编号、问题、整改状态、证据文件、是否闭环。

## 3. 新发现的 P0 关键问题

表格列：编号、问题、涉及文件、影响、建议处理方式。

## 4. 新发现的 P1 重要偏差

表格列：编号、问题、涉及文件、影响、建议处理方式。

## 5. P2 轻微问题

表格列：编号、问题、涉及文件、影响、建议处理方式。

## 6. 页面规格与 Demo 可编写性评估

如果有管理后台页面规格，逐页评估：是否可直接写 Demo、缺什么、是否阻塞。

## 7. 下一阶段门禁结论

必须分别给出：能否进入 UI 补稿、能否进入静态 Demo、能否进入技术方案、能否进入测试用例。

## 8. 总结

必须给出：通过 / 有条件通过 / 不通过。只要存在未闭环 P0，结论必须是不通过。
EOF
  fi
}

PROMPT_CONTENT="$(build_prompt)"

if [[ "$DRY_RUN" == "1" ]]; then
  printf '%s\n' "$PROMPT_CONTENT"
  printf '\n---\n'
  printf 'dry-run：不会调用 Claude，也不会写入任务文件或报告文件。\n'
  printf '正式执行时任务文件：%s\n' "$TASK_FILE"
  printf '正式执行时报告文件：%s\n' "$REPORT_FILE"
  exit 0
fi

command -v "$CLAUDE_BIN" >/dev/null 2>&1 || die "找不到 Claude CLI：$CLAUDE_BIN"

printf '%s\n' "$PROMPT_CONTENT" > "$TASK_FILE"

CLAUDE_ARGS=(-p --permission-mode dontAsk --allowedTools Read,Grep,Glob,LS --output-format text)
if [[ -n "$MODEL" ]]; then
  CLAUDE_ARGS+=(--model "$MODEL")
fi

"$CLAUDE_BIN" "${CLAUDE_ARGS[@]}" < "$TASK_FILE" > "$REPORT_FILE"

if [[ ! -f "$CHAT_LOG" ]]; then
  {
    printf '# %s 核查聊天记录\n\n' "$MODULE_ID"
    printf '> 本文件由 `scripts/prd_workflow/claude_prd_review.sh` 自动维护，用于记录 Claude Code CLI 核查任务和输出。\n'
  } > "$CHAT_LOG"
fi

{
  printf '\n---\n\n'
  printf '## 第 %s 轮 Claude Code 自动核查\n\n' "$ROUND"
  printf '> 执行时间：%s  \n' "$TIMESTAMP"
  printf '> 核查任务：`%s`  \n' "$TASK_FILE"
  printf '> 核查报告：`%s`\n\n' "$REPORT_FILE"
  printf '### 自动核查任务\n\n'
  printf '详见 `%s`。\n\n' "$TASK_FILE"
  printf '### Claude Code 输出\n\n'
  cat "$REPORT_FILE"
  printf '\n'
} >> "$CHAT_LOG"

if [[ "$ROUND" == "2" ]]; then
  {
    printf '# %s %s 核查报告（两轮汇总）\n\n' "$MODULE_ID" "$MODULE_NAME"
    printf '> 自动生成时间：%s  \n' "$TIMESTAMP"
    printf '> 正式版目录：`%s`\n\n' "$PRD_DIR"
    printf '## 1. 文件索引\n\n'
    printf '| 文件 | 说明 |\n'
    printf '|------|------|\n'
    printf '| `%s` | 第一轮核查报告 |\n' "$PRD_DIR/${MODULE_ID}_核查报告_第1轮.md"
    printf '| `%s` | 第二轮核查报告 |\n' "$REPORT_FILE"
    if [[ -n "$FIX_LOG" ]]; then
      printf '| `%s` | Codex 整改记录 |\n' "$FIX_LOG"
    fi
    printf '| `%s` | 核查聊天记录 |\n' "$CHAT_LOG"
    printf '\n## 2. 第一轮报告\n\n'
    if [[ -f "$PRD_DIR/${MODULE_ID}_核查报告_第1轮.md" ]]; then
      cat "$PRD_DIR/${MODULE_ID}_核查报告_第1轮.md"
    else
      printf '未找到第一轮报告文件。\n'
    fi
    printf '\n\n## 3. 第二轮报告\n\n'
    cat "$REPORT_FILE"
    printf '\n'
  } > "$SUMMARY_FILE"
fi

printf '已生成核查任务：%s\n' "$TASK_FILE"
printf '已生成核查报告：%s\n' "$REPORT_FILE"
printf '已更新核查聊天记录：%s\n' "$CHAT_LOG"
if [[ "$ROUND" == "2" ]]; then
  printf '已生成两轮汇总报告：%s\n' "$SUMMARY_FILE"
fi
