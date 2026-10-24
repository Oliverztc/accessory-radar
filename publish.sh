#!/usr/bin/env bash
# 用法: ./publish.sh path/to/YYYY-MM-DD.json
# 校验 JSON -> 复制到 data/ -> 重建 data/index.json -> 部署到 Vercel 生产环境 (项目 accessory-radar)
set -euo pipefail
cd "$(dirname "$0")"
SRC="${1:?用法: publish.sh <YYYY-MM-DD.json>}"
DATE=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1],encoding="utf-8"))["date"])' "$SRC")
[[ "$DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || { echo "date 字段格式错误: $DATE"; exit 1; }
DEST="data/$DATE.json"
[ "$(realpath "$SRC")" = "$(realpath -m "$DEST")" ] || cp "$SRC" "$DEST"
python3 build.py
ORG=$(python3 -c 'import json;print(json.load(open(".vercel/project.json")).get("orgId",""))' 2>/dev/null || true)
SCOPE_ARGS=()
[ -n "${ORG:-}" ] && SCOPE_ARGS=(--scope "$ORG")
timeout 300 npx --yes vercel@63 deploy --prod --yes "${SCOPE_ARGS[@]}"
# 同步到 GitHub（失败不影响已完成的部署）
if [ -d .git ]; then
  git add -A && { git diff --cached --quiet || git commit -q -m "daily: $DATE"; } \
    && timeout 120 git push -q origin main \
    && echo "GitHub 推送成功" \
    || echo "错误: GitHub 推送失败（Vercel 部署已完成），请手动执行 git push origin main" >&2
fi
