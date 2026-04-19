#!/bin/bash
# -------------------------------
# Sync image list from R2 to local data/images.json
# -------------------------------

set -e

# -------- Config --------
# Load environment variables
if [[ -f .env ]]; then
    set -a
    source .env
    set +a
fi

R2_ACCOUNT_ID="${R2_ACCOUNT_ID:-YOUR_ACCOUNT_ID}"
R2_BUCKET="${R2_BUCKET:-pic}"
R2_ACCESS_KEY="${R2_ACCESS_KEY}"
R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

# Image base URL
IMAGE_BASE_URL="${IMAGE_BASE_URL:-}"

# Output file
OUTPUT_FILE="${1:-data/images.json}"

# -------- Verify Token --------
echo "📥 Fetching image list from R2..."

# Verify token first
TOKEN_CHECK=$(curl -s -w "\n%{http_code}" "https://api.cloudflare.com/client/v4/user/tokens/verify" \
    -H "Authorization: Bearer ${R2_ACCESS_KEY}")

HTTP_CODE=$(echo "$TOKEN_CHECK" | tail -1)
TOKEN_BODY=$(echo "$TOKEN_CHECK" | sed '$d')

if [[ "$HTTP_CODE" != "200" ]]; then
    echo "❌ Token verification failed: $TOKEN_BODY"
    exit 1
fi

echo "✅ Token verified"

# List objects via Cloudflare API
LIST_RESPONSE=$(curl -s "https://api.cloudflare.com/client/v4/accounts/${R2_ACCOUNT_ID}/r2/buckets/${R2_BUCKET}/objects" \
    -H "Authorization: Bearer ${R2_ACCESS_KEY}")

# Check if request succeeded
if ! echo "$LIST_RESPONSE" | grep -q '"success":true'; then
    echo "❌ Failed to list objects: $LIST_RESPONSE"
    exit 1
fi

echo "✅ Retrieved object list"

# -------- Generate JSON --------
echo "[" > "$OUTPUT_FILE"

# Extract object keys from JSON response
# Cloudflare API returns: {"success":true,"result":{"objects":[{"key":"path/to/image.webp",...}]}}
OBJECT_KEYS=$(echo "$LIST_RESPONSE" | grep -o '"key":"[^"]*"' | grep -o '[^"]*$' || true)

if [[ -z "$OBJECT_KEYS" ]]; then
    echo "❌ No objects found in bucket"
    exit 1
fi

ID=1
FIRST=true

while IFS= read -r KEY; do
    # Only process image files
    if [[ "$KEY" =~ \.(webp|jpg|jpeg|png)$ ]]; then
        # Build URL
        if [[ -n "$IMAGE_BASE_URL" ]]; then
            URL="https://$IMAGE_BASE_URL/$KEY"
        else
            URL="/$KEY"
        fi

        # Extract category from path
        CATEGORY=$(echo "$KEY" | cut -d'/' -f1)
        if [[ -z "$CATEGORY" || "$CATEGORY" == "$KEY" ]]; then
            CATEGORY="default"
        fi

        # Generate JSON entry
        if [[ "$FIRST" == "true" ]]; then
            FIRST=false
        else
            echo "," >> "$OUTPUT_FILE"
        fi

        cat >> "$OUTPUT_FILE" <<EOF
  {
    "id": "$ID",
    "url": "$URL",
    "category": "$CATEGORY",
    "enabled": true,
    "weight": 1,
    "tags": []
  }
EOF

        ID=$((ID + 1))
    fi
done <<< "$OBJECT_KEYS"

echo "]" >> "$OUTPUT_FILE"

echo "✅ Generated $OUTPUT_FILE, $((ID - 1)) images"