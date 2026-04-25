#!/usr/bin/env bash
# ============================================================
# 从 R2 拉取图片索引
# ============================================================
set -euo pipefail

[[ -f .env ]] && { set -a; source .env; set +a; }

R2_BUCKET="${R2_BUCKET:-blog-all}"
ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
OUTPUT_FILE="data/images.json"

[[ -z "$R2_ACCOUNT_ID" ]] && { echo "❌ R2_ACCOUNT_ID required"; exit 1; }
[[ -z "$AWS_ACCESS_KEY_ID" ]] && { echo "❌ AWS_ACCESS_KEY_ID required"; exit 1; }
[[ -z "$AWS_SECRET_ACCESS_KEY" ]] && { echo "❌ AWS_SECRET_ACCESS_KEY required"; exit 1; }

echo "📥 Fetching images from R2..."

# 临时文件
MEITU_TMP="/tmp/meitu_$$.json"
TRAVEL_TMP="/tmp/travel_$$.json"
trap 'rm -f $MEITU_TMP $TRAVEL_TMP' EXIT

# 拉取数据
aws s3api list-objects-v2 \
  --bucket "$R2_BUCKET" \
  --endpoint-url "$ENDPOINT" \
  --prefix "meitu/" \
  --output json > "$MEITU_TMP" 2>/dev/null

aws s3api list-objects-v2 \
  --bucket "$R2_BUCKET" \
  --endpoint-url "$ENDPOINT" \
  --prefix "travel/" \
  --output json > "$TRAVEL_TMP" 2>/dev/null

python3 << 'PYEOF'
import json
import re
import glob

groups = {}

for tmp_file in glob.glob('/tmp/meitu_*.json') + glob.glob('/tmp/travel_*.json'):
    with open(tmp_file) as f:
        data = json.load(f)
        for obj in data.get('Contents', []):
            key = obj.get('Key', '')
            if not re.match(r'.*\.(jpg|webp|avif)$', key):
                continue

            size = int(obj.get('Size', 0))
            ext = key.split('.')[-1]
            parts = key.split('/')
            prefix = parts[0]  # meitu 或 travel
            folder = parts[1] if len(parts) > 1 else ''

            basename = parts[-1]
            match = re.match(r'^(.+)-(\w{8})\.(jpg|webp|avif)$', basename)
            if match:
                name = match.group(1)
            else:
                name = re.sub(r'\.(jpg|webp|avif)$', '', basename)

            # 用 R2 key 构建 group_key 和 r2_url_path
            group_key = f"{prefix}/{folder}/{name}"
            r2_url_path = f"{prefix}/{folder}/{name}"
            if group_key not in groups:
                groups[group_key] = {
                    'name': name,
                    'folder': folder,
                    'prefix': prefix,
                    'r2_url_path': r2_url_path,
                    'formats': {}
                }

            groups[group_key]['formats'][ext] = {
                'url': f"https://s3.marxchou.com/{key}",
                'size': size
            }

# 排序
sorted_keys = sorted(groups.keys())

images = []
for i, key in enumerate(sorted_keys, 1):
    g = groups[key]
    webp_url = g['formats'].get('webp', {}).get('url', '')
    hash_str = ''
    if webp_url:
        match = re.search(r'-(\w{8})\.', webp_url)
        if match:
            hash_str = match.group(1)

    images.append({
        'id': i,
        'name': g['name'],
        'hash': hash_str,
        'url': '/' + g['r2_url_path'] + '-' + hash_str,
        'category': g['folder'],
        'enabled': True,
        'weight': 1,
        'tags': []
    })

output = images  # 直接输出数组

with open('data/images.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"✅ Generated: data/images.json ({len(images)} images)")
PYEOF