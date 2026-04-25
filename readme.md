# Random Pic API

Random Image Service API using Cloudflare Workers + R2

## Tech Stack

- **Cloudflare Workers** - API Server
- **Cloudflare R2** - Image Storage
- **Cloudflare KV** - Image Index Storage
- **TypeScript** - Full type safety

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/MIFSH/random-pic.git
cd random-pic
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

| Variable              | Description              | Required |
| --------------------- | ------------------------ | -------- |
| `R2_ACCOUNT_ID`      | Cloudflare R2 Account ID | Yes      |
| `AWS_ACCESS_KEY_ID`   | R2 S3 Access Key        | Yes      |
| `AWS_SECRET_ACCESS_KEY` | R2 S3 Secret Key      | Yes      |
| `R2_BUCKET`           | R2 bucket name         | Yes      |

Optional:

| Variable            | Description          | Default |
| ----------------- | -------------------- | ------- |
| `REFERER_WHITELIST` | Allowed referers     | -       |
| `IMAGE_BASE_URL`    | R2 custom domain    | -       |

### 3. Deploy Worker

```bash
npx wrangler deploy
```

## API Endpoints

| Endpoint                   | Description          |
| ------------------------ | -------------------- |
| `/api/random`            | Random image stream   |
| `/api/random?format=json`| JSON response       |
| `/api/random?category=xxx`| By category         |
| `/api/pic/path`         | Image proxy         |
| `/api/categories`       | List categories    |
| `/api/health`          | Health check      |

## Usage Examples

```bash
# HTML - Random Image
<img src="https://your-domain.com/api/random" />

# JSON Response
curl "https://your-domain.com/api/random?format=json"
# {"success":true,"data":{"url":"/api/pic/...","category":"landscape"}}

# By Category
curl "https://your-domain.com/api/random?category=landscape"

# Direct Image URL
<img src="/api/pic/meitu/landscape/xxx.jpg" />

# Skip Referer Check (for background images)
<img src="/api/random?bg=true" />
```

## Features

- [x] Category Management
- [x] Weighted Random Selection
- [x] Background Image Mode (`?bg=true`)
- [x] Referer Hotlink Protection
- [x] Format Negotiation (AVIF/WebP/JPG)
- [x] Hidden Storage Domain

## Scripts

### Upload Images

```bash
# Upload images from local directory
./scripts/sync-images.sh ./images meitu landscape jpg,avif,webp
```

Options: `jpg`, `avif`, `webp` (comma separated)

### Fetch Image Index

```bash
# Generate images.json from R2
./scripts/fetch-images.sh
```

### Sync to KV

```bash
# Sync images.json to KV
pnpm sync:kv
```

## Deployment

### Cloudflare Dashboard

1. **Workers** → Create Worker
2. **KV** → Create namespace `images`
3. **R2** → Create bucket
4. **Settings** → Add bindings:
   - KV: `IMAGES`
   - R2: `R2`
5. Deploy with `wrangler deploy`

### Environment Variables

In Dashboard **Settings** → **Environment Variables**:

```
REFERER_WHITELIST=example.com,localhost
IMAGE_BASE_URL=your-bucket.example.com
```

## Data Format

```json
{
  "id": 1,
  "name": "xxx",
  "hash": "abc12345",
  "url": "/meitu/landscape/xxx-abc12345",
  "category": "landscape",
  "enabled": true,
  "weight": 1
}
```

## Security

- Images are proxied through Worker (R2 URL hidden)
- Referer whitelist protection
- Immutable cache headers

## License

MIT