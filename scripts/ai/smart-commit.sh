#!/usr/bin/env bash
#
# smart-commit.sh — تولید پیام commit کنونشنال از تغییرات staged با کمک OpenCode CLI
#
# استفاده:
#   bash scripts/ai/smart-commit.sh [--dry-run] [--model <provider/model>]
#
# متغیرهای محیطی:
#   OPENCODE_MODEL   مدل پیش‌فرض (مثل: avalai/deepseek-flash)
#   OPENCODE_AGENT   ایجنت مورد استفاده (اختیاری)
#   EDITOR / VISUAL  ادیتور برای ویرایش پیام
#
# نکته: این اسکریپت را از ریشه‌ی ریپو (یا هر زیرپوشه‌ای از آن) اجرا کن.
# این اسکریپت هرگز خودکار commit نمی‌کند؛ فقط با تأیید صریح تو commit می‌زند.

set -euo pipefail

DRY_RUN=0
MODEL="${OPENCODE_MODEL:-}"
AGENT="${OPENCODE_AGENT:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run|-n)
      DRY_RUN=1
      shift
      ;;
    --model|-m)
      MODEL="${2:-}"
      shift 2
      ;;
    --agent|-a)
      AGENT="${2:-}"
      shift 2
      ;;
    -h|--help)
      sed -n '2,20p' "$0"
      exit 0
      ;;
    *)
      echo "گزینه‌ی ناشناخته: $1" >&2
      exit 2
      ;;
  esac
done

# ── ۱) پیدا کردن ریشه‌ی ریپو ─────────────────────────────────────────────
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "خطا: داخل یک ریپوی گیت نیستی." >&2
  exit 1
fi
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

PROMPT_FILE="$REPO_ROOT/prompts/smart-commit.md"
if [[ ! -f "$PROMPT_FILE" ]]; then
  echo "خطا: فایل پرامپت پیدا نشد: $PROMPT_FILE" >&2
  exit 1
fi

# ── ۲) بررسی وجود تغییرات staged ────────────────────────────────────────
if git diff --cached --quiet; then
  echo "هیچ تغییر staged وجود ندارد. اول با «git add» چیزی را stage کن." >&2
  exit 1
fi

# ── ۳) بررسی دسترس‌بودن OpenCode CLI ────────────────────────────────────
if ! command -v opencode >/dev/null 2>&1; then
  echo "خطا: دستور «opencode» پیدا نشد." >&2
  echo "برای نصب CLI به https://opencode.ai/docs/cli مراجعه کن،" >&2
  echo "یا اگر نصب است، PATH ترمینال را بررسی کن." >&2
  exit 127
fi

# اطمینان از اینکه CLI واقعاً اجرا می‌شود (نصب ناقص/شکسته را بگیر)
if ! opencode --version >/dev/null 2>&1; then
  echo "خطا: «opencode» پیدا شد ولی قابل اجرا نیست (نصب ناقص یا PATH شکسته)." >&2
  echo "با «opencode --version» بررسی و در صورت نیاز CLI را دوباره نصب کن:" >&2
  echo "  https://opencode.ai/docs/cli" >&2
  exit 127
fi

# ── ۴) آماده‌سازی diff و پیام ───────────────────────────────────────────
TMP_DIR="$(mktemp -d 2>/dev/null || mktemp -d -t smart-commit)"
DIFF_FILE="$TMP_DIR/staged.diff"
MSG_FILE="$TMP_DIR/message.txt"
cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

git diff --cached > "$DIFF_FILE"

INSTRUCTION="$(cat "$PROMPT_FILE")"

# ساخت آرگومان‌های اختیاری CLI
CLI_ARGS=(run --file "$DIFF_FILE")
[[ -n "$MODEL" ]] && CLI_ARGS+=(--model "$MODEL")
[[ -n "$AGENT" ]] && CLI_ARGS+=(--agent "$AGENT")

echo "در حال تولید پیام commit با OpenCode..."
echo "  مدل: ${MODEL:-<پیش‌فرض opencode>}"
echo

# فراخوانی non-interactive؛ پیام نهایی روی stdout می‌آید.
if ! opencode "${CLI_ARGS[@]}" "$INSTRUCTION" > "$MSG_FILE" 2>"$TMP_DIR/err.log"; then
  echo "خطا: اجرای OpenCode CLI ناموفق بود:" >&2
  cat "$TMP_DIR/err.log" >&2 || true
  exit 1
fi

# پاک‌سازی: حذف کدهای ANSI، حذف فنس‌های Markdown، حذف خطوط خالی ابتدا/انتها
strip_ansi() {
  sed -E 's/\x1B\[[0-9;?]*[ -\/]*[@-~]//g'
}

sanitize_message() {
  strip_ansi \
    | tr -d '\r' \
    | sed -E 's/^[[:space:]]*```[a-zA-Z]*[[:space:]]*$//' \
    | sed -E '/^[[:space:]]*$/N;/\n[[:space:]]*$/D'
}

sanitize_message < "$MSG_FILE" > "$MSG_FILE.clean" && mv "$MSG_FILE.clean" "$MSG_FILE"

# حذف خطوط خالی ابتدا و انتهای فایل
awk 'NF{found=1} found{print}' "$MSG_FILE" | awk '{lines[NR]=$0} END{last=NR; while(last>0 && lines[last] ~ /^[[:space:]]*$/) last--; for(i=1;i<=last;i++) print lines[i]}' > "$MSG_FILE.trim" && mv "$MSG_FILE.trim" "$MSG_FILE"

if [[ ! -s "$MSG_FILE" ]]; then
  echo "خطا: خروجی خالی بود؛ پیامی تولید نشد." >&2
  exit 1
fi

show_message() {
  echo "──────────────── پیام پیشنهادی ────────────────"
  cat "$MSG_FILE"
  echo
  echo "───────────────────────────────────────────────"
}

show_message

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "حالت dry-run: هیچ commitی زده نشد."
  exit 0
fi

# ── ۵) تأیید کاربر: Y / edit / cancel ──────────────────────────────────
while true; do
  printf 'تأیید؟ [Y]es / [e]dit / [c]ancel: '
  read -r answer < /dev/tty || answer="c"
  case "$answer" in
    Y|y|yes|YES)
      break
      ;;
    e|E|edit)
      EDITOR_CMD="${EDITOR:-${VISUAL:-}}"
      if [[ -z "$EDITOR_CMD" ]]; then
        if command -v notepad >/dev/null 2>&1; then
          EDITOR_CMD="notepad"
        else
          EDITOR_CMD="vi"
        fi
      fi
      "$EDITOR_CMD" "$MSG_FILE" < /dev/tty > /dev/tty 2>&1 || true
      show_message
      continue
      ;;
    c|C|cancel|n|N|no|NO|"")
      echo "لغو شد. هیچ commitی زده نشد."
      exit 0
      ;;
    *)
      echo "پاسخ نامعتبر. Y برای تأیید، e برای ویرایش، c برای لغو."
      ;;
  esac
done

git commit -m "$(cat "$MSG_FILE")"
echo "commit انجام شد."
