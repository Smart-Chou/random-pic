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
AVIF_QUALITY=65
MAX_WIDTH=1920
MIN_SIZE_KB=50

# Image source directory
SOURCE_DIR="${1:-./images}"

# R2 path config
ROOT_FOLDER="${2:-meitu}"
CATEGORY="${3:-landscape}"

# API endpoint
R2_API="https://api.cloudflare.com/client/v4/accounts/${R2_ACCOUNT_ID}/r2/buckets/${R2_BUCKET}/objects"

# -------- Functions --------
upload_file() {
    local FILE_PATH="$1"
    local KEY="$2"

    local RESPONSE
    RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "${R2_API}/${KEY}" \
        -H "Authorization: Bearer ${R2_ACCESS_KEY}" \
        -H "Content-Type: application/octet-stream" \
        --data-binary "@${FILE_PATH}")

    local HTTP_CODE
    HTTP_CODE=$(echo "$RESPONSE" | tail -1)

    if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "201" ]]; then
        echo "    ✅ Uploaded: $KEY"
    else
        echo "    ⚠️  Upload failed: $KEY"
    fi
}

process_image() {
    local FILE="$1"
    local BASENAME EXT ORIGINAL_FILE
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
        SIZE_KB=$(($(stat -f%z "$FILE") / 1024))
    fi

    # Generate unique ID from timestamp
    local ID
    ID=$(date +"%Y%m%d_%H%M%S")
    local R2_PATH="/${ROOT_FOLDER}/${CATEGORY}"

    echo "🔄 Processing: $BASENAME (${SIZE_KB}KB)"
    echo "    📁 ID: $ID"

    # Keep original JPG
    ORIGINAL_FILE="${FILE%.*}.jpg"
    if [[ "$EXT" != "jpg" ]]; then
        sips -s format jpeg -s formatOptions 90 "$FILE" --out "$ORIGINAL_FILE" >/dev/null 2>&1
        local ORIG_SIZE
        ORIG_SIZE=$(($(stat -f%z "$ORIGINAL_FILE") / 1024))
        echo "    🟡 JPG: ${ORIG_SIZE}KB"
        upload_file "$ORIGINAL_FILE" "${R2_PATH}/jpg/${ID}.jpg"
        rm -f "$ORIGINAL_FILE"
    else
        echo "    🟡 JPG: ${SIZE_KB}KB"
        upload_file "$FILE" "${R2_PATH}/jpg/${ID}.jpg"
    fi

    # Convert to WebP
    local WEBP_FILE="/tmp/${ID}.webp"
    if cwebp -q "$WEBP_QUALITY" "$FILE" -o "$WEBP_FILE" 2>/dev/null; then
        local WEBP_SIZE
        WEBP_SIZE=$(($(stat -f%z "$WEBP_FILE") / 1024))
        local WEBP_SAVED=$((SIZE_KB - WEBP_SIZE))
        local WEBP_PERCENT=$((WEBP_SAVED * 100 / SIZE_KB))
        echo "    🔵 WebP: ${WEBP_SIZE}KB (saved ${WEBP_PERCENT}%)"
        upload_file "$WEBP_FILE" "${R2_PATH}/webp/${ID}.webp"
        rm -f "$WEBP_FILE"
    else
        echo "    ⚠️  WebP conversion failed"
    fi

    # Convert to AVIF
    local AVIF_FILE="/tmp/${ID}.avif"
    if avifenc -q "$AVIF_QUALITY" --min 10 --max 80 "$FILE" -o "$AVIF_FILE" 2>/dev/null; then
        local AVIF_SIZE
        AVIF_SIZE=$(($(stat -f%z "$AVIF_FILE") / 1024))
        local AVIF_SAVED=$((SIZE_KB - AVIF_SIZE))
        local AVIF_PERCENT=$((AVIF_SAVED * 100 / SIZE_KB))
        echo "    🟣 AVIF: ${AVIF_SIZE}KB (saved ${AVIF_PERCENT}%)"
        upload_file "$AVIF_FILE" "${R2_PATH}/avif/${ID}.avif"
        rm -f "$AVIF_FILE"
    else
        echo "    ⚠️  AVIF conversion failed (might need libavif)"
    fi
}

# -------- Main --------
echo "🚀 Starting: $SOURCE_DIR -> R2 /${ROOT_FOLDER}/${CATEGORY}"
echo "Quality: WebP ${WEBP_QUALITY}%, AVIF ${AVIF_QUALITY}%"
echo "Max width: ${MAX_WIDTH}px, Min size: ${MIN_SIZE_KB}KB"
echo ""

if [[ ! -d "$SOURCE_DIR" ]]; then
    echo "❌ Directory not found: $SOURCE_DIR"
    exit 1
fi

# Stats
COUNT=0

# Iterate
find "$SOURCE_DIR" -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" \) | while read -r file; do
    process_image "$file"
    COUNT=$((COUNT + 1))
done

echo ""
echo "✅ Done! Processed: $COUNT files (3 formats each)"