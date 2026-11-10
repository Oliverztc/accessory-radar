#!/usr/bin/env bash
# 用法: ./publish.sh path/to/YYYY-MM-DD.json
# 校验/构建 -> 提交并推送到 GitHub（始终先推）-> 部署到已有 Vercel 项目 accessory-radar
set -euo pipefail
export PATH="/usr/local/bin:${PATH:-/usr/bin:/bin}"
cd "$(dirname "$0")"

SRC="${1:?用法: publish.sh <YYYY-MM-DD.json>}"
DATE=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1],encoding="utf-8"))["date"])' "$SRC")
[[ "$DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || { echo "date 字段格式错误: $DATE"; exit 1; }
DEST="data/$DATE.json"
[ "$(realpath "$SRC")" = "$(realpath -m "$DEST")" ] || cp "$SRC" "$DEST"
python3 build.py

PROJECT_ID="prj_nDLrQ3IhOqnTGRHyqPH9NAKKp9xB"
ORG_ID="team_ncYiY90vpW4c7wfGYO9Ae3If"
PROJECT_NAME="accessory-radar"
LIVE_URL="https://accessory-radar-iota.vercel.app"

ensure_existing_project() {
  mkdir -p .vercel
  local pid=""
  if [ -f .vercel/project.json ]; then
    pid=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1])).get("projectId",""))' .vercel/project.json 2>/dev/null || true)
  fi
  if [ "$pid" != "$PROJECT_ID" ]; then
    if [ -n "$pid" ]; then
      echo "warn: .vercel/project.json projectId=$pid，已改回已有项目 $PROJECT_ID" >&2
    fi
    python3 -c 'import json,sys; json.dump({"projectId":sys.argv[1],"orgId":sys.argv[2],"projectName":sys.argv[3]}, open(".vercel/project.json","w"), indent=2); open(".vercel/project.json","a").write("\n")' \
      "$PROJECT_ID" "$ORG_ID" "$PROJECT_NAME"
  fi
}

push_github() {
  if [ ! -d .git ]; then
    echo "GITHUB PUSH FAILED: 当前目录不是 git 仓库"
    exit 1
  fi
  git add -A
  if git diff --cached --quiet; then
    echo "没有新的提交（工作区已干净）"
  else
    git commit -m "daily: $DATE"
    echo "已提交: daily: $DATE"
  fi
  local push_log
  push_log=$(mktemp)
  local push_status=0
  set +e
  timeout 120 git push origin main >"$push_log" 2>&1
  push_status=$?
  set -e
  cat "$push_log"
  if [ "$push_status" -eq 0 ]; then
    echo "GitHub 推送成功"
    rm -f "$push_log"
    return 0
  fi
  if grep -q '/usr/bin/gh not found' "$push_log"; then
    echo "warn: 推送失败（/usr/bin/gh not found），运行 gh auth setup-git 后重试一次" >&2
    /usr/local/bin/gh auth setup-git
    set +e
    timeout 120 git push origin main >"$push_log" 2>&1
    push_status=$?
    set -e
    cat "$push_log"
    if [ "$push_status" -eq 0 ]; then
      echo "GitHub 推送成功"
      rm -f "$push_log"
      return 0
    fi
  fi
  echo "GITHUB PUSH FAILED: $(tr '\n' ' ' < "$push_log" | sed 's/[[:space:]]\+/ /g')"
  rm -f "$push_log"
  exit 1
}

# 对同一 scope 执行部署；若输出含 fetch failed，再重试一次。
deploy_with_scope() {
  local label="$1"
  shift
  local attempt=1
  local log
  log=$(mktemp)
  while true; do
    echo "Vercel 部署：$label（第 ${attempt} 次）"
    set +e
    timeout 300 npx --yes vercel@63 --prod --yes "$@" >"$log" 2>&1
    local status=$?
    set -e
    cat "$log"
    if [ "$status" -eq 0 ]; then
      rm -f "$log"
      return 0
    fi
    LAST_DEPLOY_ERR=$(tr '\n' ' ' < "$log" | sed 's/[[:space:]]\+/ /g')
    if [ "$attempt" -eq 1 ] && grep -qi 'fetch failed' "$log"; then
      echo "warn: $label 出现 fetch failed，重试一次" >&2
      attempt=2
      continue
    fi
    rm -f "$log"
    return 1
  done
}

confirm_live() {
  local url="$1"
  local code
  local i
  for i in 1 2 3; do
    set +e
    code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 30 "$url")
    local curl_status=$?
    set -e
    if [ "$curl_status" -eq 0 ] && [ "$code" = "200" ]; then
      echo "确认 $url -> HTTP 200"
      return 0
    fi
    echo "warn: $url 返回 ${code:-curl失败}，等待后重试（$i/3）" >&2
    sleep 5
  done
  echo "DEPLOY FAILED: 已部署但 $url 未返回 HTTP 200（最后状态: ${code:-curl失败}）"
  exit 1
}

push_github

ensure_existing_project

LAST_DEPLOY_ERR=""
if deploy_with_scope "default"; then
  :
elif deploy_with_scope "oliverztcs-projects" --scope oliverztcs-projects; then
  :
elif deploy_with_scope "team_ncYiY90vpW4c7wfGYO9Ae3If" --scope team_ncYiY90vpW4c7wfGYO9Ae3If; then
  :
else
  echo "DEPLOY FAILED: ${LAST_DEPLOY_ERR:-所有 scope 的部署均失败}"
  exit 1
fi

echo "Vercel 部署成功（项目 $PROJECT_NAME / $PROJECT_ID）"
confirm_live "$LIVE_URL"
confirm_live "$LIVE_URL/data/index.json"
echo "发布完成：$DATE"
