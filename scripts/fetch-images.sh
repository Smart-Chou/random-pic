#!/usr/bin/env bash
# ============================================================
# 从 R2 拉取图片索引
# ============================================================
set -euo pipefail

export AWS_ACCESS_KEY_ID="0221a17ba89e61a67e7303e499274a3c"
export AWS_SECRET_ACCESS_KEY="7f2881bfa613350ea1fa47069242a32c884773f8b987a8dbe07db2a50131d16d"

R2_ACCOUNT_ID="06096af32bcdfc655f5076b224b32c00"
R2_BUCKET="blog-all"
ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
OUTPUT_FILE="data/images.json"

echo "📥 Fetching images from R2..."

# List .jpg files and convert tab-separated to newlines
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