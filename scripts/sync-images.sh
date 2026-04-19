#!/bin/bash
# -------------------------------
# Compress and upload images to R2
# Scans local image directory, converts to WebP, and uploads to Cloudflare R2
# -------------------------------

set -e

# -------- Config --------
# Load environment variables
if [[ -f .env ]]; then
    set -a
    source .env
    set +a
fi

# R2 Config
R2_ACCOUNT_ID="${R2_ACCOUNT_ID:-YOUR_ACCOUNT_ID}"
R2_BUCKET="${R2_BUCKET:-pic}"
R2_ACCESS_KEY="${R2_ACCESS_KEY}"

# Compression Config
WEBP_QUALITY=80
MAX_WIDTH=1920
MIN_SIZE_KB=50

# Image source directory
SOURCE_DIR="${1:-./images}"

# API endpoint
R2_API="https://api.cloudflare.com/client/v4/accounts/${R2_ACCOUNT_ID}/r2/buckets/${R2_BUCKET}/objects"

# -------- Functions --------
upload_file() {
    local FILE_PATH="$1"
    local KEY="$2"
    echo "⬆️  $FILE_PATH -> $KEY"

    local RESPONSE
    RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "${R2_API}/${KEY}" \
        -H "Authorization: Bearer ${R2_ACCESS_KEY}" \
        -H "Content-Type: application/octet-stream" \
        --data-binary "@${FILE_PATH}")

    local HTTP_CODE
    HTTP_CODE=$(echo "$RESPONSE" | tail -1)

    if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "201" ]]; then
        echo "  ✅ Uploaded: $KEY"
    else
        echo "  ⚠️  Upload failed: $KEY"
    fi
}

process_image() {
    local FILE="$1"
    local DIR BASENAME EXT WEBP_FILE

    DIR=$(dirname "$FILE")
    BASENAME=$(basename "$FILE")
    EXT="${FILE##*.}"

    # Skip files smaller than minimum size threshold
    local SIZE_KB
    SIZE_KB=$(($(stat -f%z "$FILE") / 1024))
    if [[ "$SIZE_KB" -lt "$MIN_SIZE_KB" ]]; then
        echo "⏭️  Skip small file (${SIZE_KB}KB): $BASENAME"
        return 0
    fi

    # Resize if needed
    local WIDTH
    WIDTH=$(sips -g pixelWidth "$FILE" 2>/dev/null | tail -1 | awk '{print $2}')
    if [[ -n "$WIDTH" && "$WIDTH" -gt "$MAX_WIDTH" ]]; then
        echo "📐 Resize: ${WIDTH}px -> ${MAX_WIDTH}px"
        sips -Z "$MAX_WIDTH" "$FILE" >/dev/null 2>&1
    fi

    # Convert to WebP
    WEBP_FILE="${FILE%.*}.webp"
    echo "🔵 Convert to WebP: $BASENAME (${SIZE_KB}KB)"

    if cwebp -q "$WEBP_QUALITY" "$FILE" -o "$WEBP_FILE" 2>/dev/null; then
        local SIZE_AFTER
        SIZE_AFTER=$(($(stat -f%z "$WEBP_FILE") / 1024))
        local SAVED=$((SIZE_KB - SIZE_AFTER))
        local PERCENT=$((SAVED * 100 / SIZE_KB))
        echo "  ✅ ${SIZE_AFTER}KB (saved ${PERCENT}%)"

        # Upload
        upload_file "$WEBP_FILE" "$(basename "$WEBP_FILE")"

        # Cleanup
        rm "$FILE" "$WEBP_FILE"
    else
        echo "  ⚠️  Conversion failed: $BASENAME"
    fi
}

# -------- Main --------
echo "🚀 Starting: $SOURCE_DIR"
echo "Quality: ${WEBP_QUALITY}%, Max width: ${MAX_WIDTH}px, Min size: ${MIN_SIZE_KB}KB"
echo ""

if [[ ! -d "$SOURCE_DIR" ]]; then
    echo "❌ Directory not found: $SOURCE_DIR"
    exit 1
fi

# Stats
TOTAL_BEFORE=0
TOTAL_AFTER=0
COUNT=0

# Iterate
find "$SOURCE_DIR" -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" \) | while read -r file; do
    SIZE_BEFORE=$(stat -f%z "$file")
    TOTAL_BEFORE=$((TOTAL_BEFORE + SIZE_BEFORE))

    process_image "$file"

    SIZE_AFTER=0
    if [[ -f "${file%.*}.webp" ]]; then
        SIZE_AFTER=$(stat -f%z "${file%.*}.webp")
    fi
    TOTAL_AFTER=$((TOTAL_AFTER + SIZE_AFTER))

    COUNT=$((COUNT + 1))
done

echo ""
echo "✅ Done!"
echo "Files processed: $COUNT"
echo "Before: $(($TOTAL_BEFORE / 1024 / 1024))MB"
echo "After: $(($TOTAL_AFTER / 1024 / 1024))MB"
echo "Saved: $(($(($TOTAL_BEFORE - $TOTAL_AFTER)) / 1024 / 1024))MB"