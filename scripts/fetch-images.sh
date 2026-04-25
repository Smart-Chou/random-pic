#!/usr/bin/env bash
# ============================================================
# 从 R2 拉取图片索引（适配新结构：hash 命名）
# ============================================================
set -euo pipefail

[[ -f .env ]] && { set -a; source .env; set +a; }

R2_ACCOUNT_ID="${R2_ACCOUNT_ID:-}"
R2_BUCKET="${R2_BUCKET:-pic}"
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-}"
ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
IMAGE_BASE_URL="${IMAGE_BASE_URL:-}"
OUTPUT_FILE="${1:-data/images.json}"

echo "📥 Fetching images from R2..."

# List only .jpg files as primary index (original quality)
JPG_KEYS=$(aws s3api list-objects \
  --bucket "$R2_BUCKET" \
  --endpoint-url "$ENDPOINT" \
  --prefix "meitu/" \
  --query "Contents[?ends_with(Key, '.jpg')].Key" \
  --output text 2>/dev/null) || true

[[ -z "$JPG_KEYS" ]] && { echo "❌ No images found"; exit 1; }

echo "[" > "$OUTPUT_FILE"
FIRST=true
ID=1

echo "$JPG_KEYS" | while read -r KEY; do
  [[ -z "$KEY" ]] && continue

  # Extract parts: meitu/category/name-hash.jpg
  local category name hash
  category=$(echo "$KEY" | cut -d'/' -f2)
  local basename
  basename=$(basename "$KEY" .jpg)

  # Split name and hash: last 8 chars is hash
  name="${basename%????????}"
  hash="${basename##*-}"

  # Build URL (use jpg as main format)
  if [[ -n "$IMAGE_BASE_URL" ]]; then
    url="https://${IMAGE_BASE_URL}/${KEY%.jpg}"
  else
    url="/${KEY%.jpg}"
  fi

  [[ "$FIRST" == "true" ]] || echo "," >> "$OUTPUT_FILE"
  FIRST=false

  cat >> "$OUTPUT_FILE" <<JSON
  {
    "id": $ID,
    "name": "$name",
    "hash": "$hash",
    "url": "$url",
    "category": "$category",
    "enabled": true,
    "weight": 1,
    "tags": []
  }
JSON

  ID=$((ID + 1))
done

echo "]" >> "$OUTPUT_FILE"
echo "✅ Generated: $OUTPUT_FILE ($((ID - 1)) images)"