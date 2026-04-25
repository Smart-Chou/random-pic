#!/usr/bin/env bash
# ============================================================
# 极致省钱版 - 图片压缩上传脚本
# 只生成 AVIF + WebP（可选），不上传 JPG
# 使用 S3 兼容 API + 并发 + Hash 去重
# ============================================================
set -euo pipefail

# ---- Config ----
[[ -f .env ]] && { set -a; source .env; set +a; }

R2_ACCOUNT_ID="${R2_ACCOUNT_ID:-}"
R2_BUCKET="${R2_BUCKET:-pic}"
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-}"
ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

SOURCE_DIR="${1:-./images}"
ROOT_FOLDER="${2:-meitu}"
CATEGORY="${3:-landscape}"

# 格式策略：avif,webp 或 avif 或 jpg,avif,webp（保留原图）
FORMAT="${4:-jpg,avif,webp}"
DRY_RUN="${DRY_RUN:-false}"

# ---- 压缩参数（极致压缩） ----
JPG_QUALITY=85       # 中间 JPG 品质
WEBP_QUALITY=65      # WebP 压缩率
AVIF_QUALITY=40      # AVIF 极致压缩
MAX_WIDTH=1920
MIN_SIZE_KB=30
THREADS=4
TMP_DIR="/tmp/img_pipeline_$$"
mkdir -p "$TMP_DIR"

# ---- 工具函数 ----
get_size_kb() {
  local file="$1"
  if stat --version >/dev/null 2>&1; then
    echo $(( $(stat -c%s "$file") / 1024 ))
  else
    echo $(( $(stat -f%z "$file") / 1024 ))
  fi
}

hash_file() {
  local file="$1"
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 1 "$file" | cut -c1-8
  else
    sha1sum "$file" | cut -c1-8
  fi
}

should_upload() {
  local ext="$1"
  [[ "$FORMAT" == "all" ]] && return 0
  IFS=',' read -ra arr <<< "$FORMAT"
  for f in "${arr[@]}"; do [[ "$f" == "$ext" ]] && return 0; done
  return 1
}

check_exists() {
  local key="$1"
  if aws s3api head-object --bucket "$R2_BUCKET" --key "$key" \
    --endpoint-url "$ENDPOINT" --only-show-errors >/dev/null 2>&1; then
    return 0
  fi
  return 1
}

upload_s3() {
  local file="$1"
  local key="$2"

  if check_exists "$key"; then
    echo "    ♻️ Already exists: $key"
    return 0
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "    [DRY] Upload: $key"
    return 0
  fi

  for i in {1..3}; do
    if aws s3 cp "$file" "s3://${R2_BUCKET}/${key}" \
      --endpoint-url "$ENDPOINT" \
      --content-type "image/${key##*.}" \
      --only-show-errors 2>/dev/null; then
      echo "    ✅ Uploaded: $key"
      return 0
    fi
    echo "    🔁 Retry ($i): $key"
    sleep 1
  done
  echo "    ❌ Failed: $key"
  return 1
}

process_image() {
  local file="$1"
  local base ext name jpg_file
  base=$(basename "$file")
  ext="${file##*.}"
  name="${base%.*}"

  local size_kb
  size_kb=$(get_size_kb "$file")
  [[ "$size_kb" -lt "$MIN_SIZE_KB" ]] && { echo "⏭️ Skip small: $base"; return 0; }

  local hash
  hash=$(hash_file "$file")
  local safe_name="${name}-${hash}"
  local r2_path="${ROOT_FOLDER}/${CATEGORY}"

  echo "🔄 $base (${size_kb}KB, hash=${hash})"

  # Step 1: 上传原始 JPG（可选，保留原图品质）
  if should_upload "jpg"; then
    local orig_jpg="$TMP_DIR/${safe_name}.jpg"
    magick "$file" -auto-orient -strip -resize "${MAX_WIDTH}x>" -quality 92 "$orig_jpg" 2>/dev/null
    upload_s3 "$orig_jpg" "${r2_path}/${safe_name}.jpg"
  fi

  # Step 2: 统一转 JPG（中间格式，用于压缩）
  jpg_file="$TMP_DIR/${safe_name}_ intermediate.jpg"
  magick "$file" -auto-orient -strip -resize "${MAX_WIDTH}x>" -quality "$JPG_QUALITY" "$jpg_file" 2>/dev/null

  # Step 3: WebP
  if should_upload "webp"; then
    local webp_file="$TMP_DIR/${safe_name}.webp"
    if cwebp -q "$WEBP_QUALITY" -m 6 "$jpg_file" -o "$webp_file" 2>/dev/null; then
      upload_s3 "$webp_file" "${r2_path}/${safe_name}.webp"
    else
      echo "    ⚠️ WebP failed: $base"
    fi
  fi

  # Step 4: AVIF（极致压缩）
  if should_upload "avif"; then
    local avif_file="$TMP_DIR/${safe_name}.avif"
    if avifenc -q "$AVIF_QUALITY" --min 20 --max 60 --speed 6 "$jpg_file" -o "$avif_file" 2>/dev/null; then
      upload_s3 "$avif_file" "${r2_path}/${safe_name}.avif"
    else
      echo "    ⚠️ AVIF failed: $base"
    fi
  fi

  rm -f "$jpg_file"
  [[ -d "$TMP_DIR" ]] && rm -f "$TMP_DIR"/*.jpg "$TMP_DIR"/*.webp "$TMP_DIR"/*.avif 2>/dev/null
}

# ---- Main ----
echo "🚀 Start: $SOURCE_DIR → R2 /${ROOT_FOLDER}/${CATEGORY}"
echo "Format: $FORMAT | Threads: $THREADS | Max: ${MAX_WIDTH}px"
echo ""

[[ -z "$R2_ACCOUNT_ID" ]] && { echo "❌ R2_ACCOUNT_ID required"; exit 1; }
[[ ! -d "$SOURCE_DIR" ]] && { echo "❌ Not found: $SOURCE_DIR"; exit 1; }

# Check for required tools
missing=()
for cmd in magick cwebp avifenc; do
  command -v "$cmd" >/dev/null 2>&1 || missing+=("$cmd")
done
[[ ${#missing[@]} -gt 0 ]] && { echo "❌ Missing: ${missing[*]}"; exit 1; }

COUNT=0
while IFS= read -r file; do
  process_image "$file"
  COUNT=$((COUNT + 1))
done < <(find "$SOURCE_DIR" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \))

rm -rf "$TMP_DIR"

echo ""
echo "✅ Done! $COUNT files processed"