# Random Pic API

A modern random image API built with Next.js 15, TypeScript, and Zod.

## Tech Stack

- **Next.js 15** - App Router, Route Handlers
- **TypeScript** - Full type safety
- **Zod** - Schema validation
- **Vitest** - Testing
- **Cloudflare R2** - Image storage
- **AWS CLI** - S3-compatible R2 access
- **WebP** - Image compression

## Prerequisites

```bash
# macOS
brew install awscli cwebp

# Verify
aws --version
cwebp -version
```

## Quick Start

### 1. Setup Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

| Variable         | Description      | How to get                             |
| ---------------- | ---------------- | -------------------------------------- |
| `R2_ACCOUNT_ID`  | R2 Account ID    | Cloudflare Dashboard -> R2 -> Overview |
| `R2_BUCKET`      | Bucket name      | Set when creating bucket               |
| `R2_ACCESS_KEY`  | R2 API Token     | R2 -> Manage API Tokens -> Create      |
| `R2_SECRET_KEY`  | API Token Secret | Same as above                          |
| `IMAGE_BASE_URL` | R2 custom domain | R2 -> Custom domains                   |

### 2. Local Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev
```

Visit http://localhost:3000/api/random

### 3. Build for Deployment

```bash
pnpm build
```

## Workflow

### Upload Images

```bash
# 1. Put images in ./images directory (supports jpg/jpeg/png)

# 2. Compress and upload to R2
./scripts/sync-images.sh

# 3. Sync image list from R2 to local
./scripts/fetch-images.sh
```

After config, you can use:

```bash
# Compress and upload (custom directory)
./scripts/sync-images.sh ./my-images
```

### Image Directory Structure

```
images/
├── landscape/
│   ├── mountain.jpg
│   └── sea.jpg
└── portrait/
    └── person.png
```

The script automatically extracts category from path (landscape/portrait).

## Features

- `GET /api/random` - Get random image (proxy/redirect)
- `GET /api/random?category=xxx` - Get random image from specific category
- `GET /api/random?format=json` - Get JSON response
- `GET /api/img` - Image proxy with compression support
- `GET /api/categories` - List available categories
- `GET /api/health` - Health check

## Deployment

### Option 1: Vercel + Cloudflare R2

Frontend & API on Vercel, images stored in Cloudflare R2.

**Architecture:**

- Frontend (Next.js) deployed on Vercel
- Images stored in Cloudflare R2
- CORS and referrer protection configured on R2/Cloudflare side

**Setup:**

1. Create R2 bucket `pic`
2. Configure R2 custom domain (e.g., `pic-api.example.com`)
3. Configure in R2/Cloudflare Dashboard:
   - **CORS**: Allow cross-origin requests from Vercel domain
   - **Referrer Policy**: Only allow requests from Vercel domain
4. Set environment variable:

```
IMAGE_BASE_URL=pic-api.example.com
```

**Upload images to R2:**

```bash
# Upload image file
wrangler r2 object upload BUCKET --file path/to/image.webp

# Or use S3-compatible client
aws s3 cp image.webp s3://pic/images/landscape/webp/xxx.webp \
  --endpoint-url https://ACCOUNT_ID.r2.cloudflarestorage.com \
  --access-key-id KEY \
  --secret-access-key SECRET
```

### Option 2: Cloudflare Workers + R2

Both frontend and backend deployed on Cloudflare Workers, images stored in R2.

**Architecture:**

- Frontend static assets + API deployed on Cloudflare Workers
- Images stored in Cloudflare R2
- CORS and referrer protection handled in Workers middleware

**Setup:**

```bash
# Install dependencies
pnpm install

# Develop Worker
pnpm dev:worker

# Deploy Worker
pnpm deploy:worker
```

Requires:

- R2 bucket `pic`
- KV namespace `IMAGES`

## Data File

Images are stored in `data/images.json`:

```json
[
  {
    "id": "1",
    "url": "/images/landscape/webp/xxx.webp",
    "category": "landscape",
    "enabled": true,
    "weight": 1,
    "tags": []
  }
]
```

## API Examples

### Get random image (redirect)

```http
GET /api/random
```

Response: `302 Found` redirect to image URL

### Get random image (JSON)

```http
GET /api/random?format=json
```

```json
{
  "success": true,
  "data": {
    "id": "1",
    "url": "/images/landscape/webp/xxx.webp",
    "category": "landscape",
    "tags": []
  }
}
```

### Get random from category

```http
GET /api/random?category=landscape
```

### List categories

```http
GET /api/categories
```

## Environment Variables

| Variable            | Description      | Required   |
| ------------------- | ---------------- | ---------- |
| `IMAGE_BASE_URL`    | R2 custom domain | Option 2/3 |
| `REFERER_WHITELIST` | Allowed referers | No         |

## License

MIT
