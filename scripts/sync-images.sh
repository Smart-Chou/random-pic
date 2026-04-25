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
SOURCE_DIR="${1:-./travel-photography}"

# R2 path config
ROOT_FOLDER="${2:-travel-photography}"
CATEGORY="${3:-guangzhou_guang-zhou-ta_jiao-tang_sha-mian-dao}"

# Upload mode: --avif-only for AVIF only, empty for all formats
UPLOAD_MODE="${4:-}"

# MIME type mapping
get_mime_type() {
    local KEY="$1"
    local EXT="${KEY##*.}"  # extract extension from KEY
    case "${EXT,,}" in  # convert to lowercase
        jpg|jpeg) echo "image/jpeg" ;;
        webp) echo "image/webp" ;;
        avif) echo "image/avif" ;;
        png) echo "image/png" ;;
        *) echo "application/octet-stream" ;;
    esac
}

# API endpoint
R2_API="https://api.cloudflare.com/client/v4/accounts/${R2_ACCOUNT_ID}/r2/buckets/${R2_BUCKET}/objects"

# -------- Functions --------
upload_file() {
    local FILE_PATH="$1"
    local KEY="$2"

    local MIME_TYPE
    MIME_TYPE=$(get_mime_type "$KEY")

    local RESPONSE
    RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "${R2_API}/${KEY}" \
        -H "Authorization: Bearer ${R2_ACCESS_KEY}" \
        -H "Content-Type: ${MIME_TYPE}" \
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

    # Keep original filename
    local R2_PATH="/${ROOT_FOLDER}/${CATEGORY}"

    echo "🔄 Processing: $BASENAME (${SIZE_KB}KB)"

    # Upload JPG only if not AVIF-only mode
    if [[ "$UPLOAD_MODE" != "--avif-only" ]]; then
        ORIGINAL_FILE="${FILE%.*}.jpg"
        if [[ "$EXT" != "jpg" ]]; then
            sips -s format jpeg -s formatOptions 90 "$FILE" --out "$ORIGINAL_FILE" >/dev/null 2>&1
            local ORIG_SIZE
            ORIG_SIZE=$(($(stat -f%z "$ORIGINAL_FILE") / 1024))
            echo "    🟡 JPG: ${ORIG_SIZE}KB"
            upload_file "$ORIGINAL_FILE" "${R2_PATH}/jpg/${BASENAME}"
            rm -f "$ORIGINAL_FILE"
        else
            echo "    🟡 JPG: ${SIZE_KB}KB"
            upload_file "$FILE" "${R2_PATH}/jpg/${BASENAME}"
        fi
    fi

    # Convert to WebP and upload only if not AVIF-only mode
    if [[ "$UPLOAD_MODE" != "--avif-only" ]]; then
        local WEBP_FILE="/tmp/${BASENAME%.jpg}.webp"
        if cwebp -q "$WEBP_QUALITY" "$FILE" -o "$WEBP_FILE" 2>/dev/null; then
            local WEBP_SIZE
            WEBP_SIZE=$(($(stat -f%z "$WEBP_FILE") / 1024))
            local WEBP_SAVED=$((SIZE_KB - WEBP_SIZE))
            local WEBP_PERCENT=$((WEBP_SAVED * 100 / SIZE_KB))
            echo "    🔵 WebP: ${WEBP_SIZE}KB (saved ${WEBP_PERCENT}%)"
            upload_file "$WEBP_FILE" "${R2_PATH}/webp/${BASENAME%.jpg}.webp"
            rm -f "$WEBP_FILE"
        else
            echo "    ⚠️  WebP conversion failed"
        fi
    fi

    # Convert to AVIF
    local AVIF_FILE="/tmp/${BASENAME%.jpg}.avif"
    if avifenc -q "$AVIF_QUALITY" --min 10 --max 80 "$FILE" -o "$AVIF_FILE" 2>/dev/null; then
        local AVIF_SIZE
        AVIF_SIZE=$(($(stat -f%z "$AVIF_FILE") / 1024))
        local AVIF_SAVED=$((SIZE_KB - AVIF_SIZE))
        local AVIF_PERCENT=$((AVIF_SAVED * 100 / SIZE_KB))
        echo "    🟣 AVIF: ${AVIF_SIZE}KB (saved ${AVIF_PERCENT}%)"
        upload_file "$AVIF_FILE" "${R2_PATH}/avif/${BASENAME%.jpg}.avif"
    else
        echo "    ⚠️  AVIF conversion failed"
    fi
}

# -------- Main --------
MODE_DESC="3 formats (JPG + WebP + AVIF)"
[[ "$UPLOAD_MODE" == "--avif-only" ]] && MODE_DESC="AVIF only"

echo "🚀 Starting: $SOURCE_DIR -> R2 /${ROOT_FOLDER}/${CATEGORY}"
echo "Mode: ${MODE_DESC}"
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
echo "✅ Done! Processed: $COUNT files"
