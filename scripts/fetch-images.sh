#!/usr/bin/env bash
# ============================================================
# 从 R2 拉取图片索引
# 使用方法: ./scripts/fetch-images.sh
# 需要配置 .env 文件中的 AWS credentials
# ============================================================
set -euo pipefail

# 加载环境变量
[[ -f .env ]] && { set -a; source .env; set +a; }

R2_ACCOUNT_ID="${R2_ACCOUNT_ID:-}"
R2_BUCKET="${R2_BUCKET:-blog-all}"
ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
OUTPUT_FILE="data/images.json"

# 检查必要变量
[[ -z "$R2_ACCOUNT_ID" ]] && { echo "❌ R2_ACCOUNT_ID required"; exit 1; }
[[ -z "$AWS_ACCESS_KEY_ID" ]] && { echo "❌ AWS_ACCESS_KEY_ID required"; exit 1; }
[[ -z "$AWS_SECRET_ACCESS_KEY" ]] && { echo "❌ AWS_SECRET_ACCESS_KEY required"; exit 1; }

echo "📥 Fetching images from R2..."

# List .jpg files
JPG_KEYS=$(aws s3api list-objects \
  --bucket "$R2_BUCKET" \
  --endpoint-url "$ENDPOINT" \
  --prefix "meitu/" \
  --query "Contents[?ends_with(Key, '.jpg')].Key" \
  --output text 2>/dev/null) || true

if [[ -z "$JPG_KEYS" ]]; then
  echo "❌ No images found"
  exit 1
fi

# Convert tabs to newlines
echo "$JPG_KEYS" | tr '\t' '\n' > /tmp/jpg_keys.txt

echo "[" > "$OUTPUT_FILE"
FIRST=true
ID=1

while read -r KEY; do
  [[ -z "$KEY" ]] && continue
  [[ ! "$KEY" =~ \.jpg$ ]] && continue

  CATEGORY=$(echo "$KEY" | cut -d'/' -f2)
  BASENAME=$(basename "$KEY" .jpg)
  NAME="${BASENAME%????????}"
  HASH="${BASENAME##*-}"
  URL="/${KEY%.jpg}"

  [[ "$FIRST" == "true" ]] || echo "," >> "$OUTPUT_FILE"
  FIRST=false

  cat >> "$OUTPUT_FILE" <<JSON
  {
    "id": $ID,
    "name": "$NAME",
    "hash": "$HASH",
    "url": "$URL",
    "category": "$CATEGORY",
    "enabled": true,
    "weight": 1,
    "tags": []
  }
JSON

  ID=$((ID + 1))
done < /tmp/jpg_keys.txt

echo "]" >> "$OUTPUT_FILE"
echo "✅ Generated: $OUTPUT_FILE ($((ID - 1)) images)"