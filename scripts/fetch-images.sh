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
R2_SECRET_KEY="${R2_SECRET_KEY}"
R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

# Image base URL
IMAGE_BASE_URL="${IMAGE_BASE_URL:-}"

# Output file
OUTPUT_FILE="${1:-data/images.json}"

# -------- AWS CLI Config --------
if [[ -n "$R2_ACCESS_KEY" && -n "$R2_SECRET_KEY" ]]; then
    AWS_PROFILE="r2_sync"
    aws configure set aws_access_key_id "$R2_ACCESS_KEY" --profile "$AWS_PROFILE"
    aws configure set aws_secret_access_key "$R2_SECRET_KEY" --profile "$AWS_PROFILE"
    aws configure set region "auto" --profile "$AWS_PROFILE"
fi

# -------- Fetch Image List --------
echo "📥 Fetching image list from R2..."

# List all images in R2
IMAGES=$(aws s3 ls "s3://$R2_BUCKET/" --recursive --profile "$AWS_PROFILE" --endpoint-url "$R2_ENDPOINT" 2>/dev/null || echo "")

if [[ -z "$IMAGES" ]]; then
    echo "❌ Cannot fetch image list or bucket is empty"
    exit 1
fi

# -------- Generate JSON --------
echo "[" > "$OUTPUT_FILE"

ID=1
FIRST=true

echo "$IMAGES" | while read -r line; do
    # Parse date and filename
    DATE=$(echo "$line" | awk '{print $1" "$2}')
    SIZE=$(echo "$line" | awk '{print $3}')
    KEY=$(echo "$line" | awk '{print $4}')

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
done

echo "]" >> "$OUTPUT_FILE"

echo "✅ Generated $OUTPUT_FILE, $((ID - 1)) images"