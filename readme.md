# Random Pic API

Random Image Service API using Cloudflare Workers + R2

## Tech Stack

- **Cloudflare Workers** - API Server
- **Cloudflare R2** - Image Storage (optional)
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
| `IMAGE_BASE_URL`    | Image domain        | -       |

### 3. Update Image Data

Images are stored in `data/images.json`. To update:

```bash
# Regenerate from local images
./scripts/fetch-images.sh ./images
```

This generates `worker/src/data/images.ts` automatically.

### 4. Deploy Worker

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
| `/nico.gif`           | Not found image (404) |

## Usage Examples

```bash
# HTML - Random Image
<img src="https://your-domain.com/api/random" />

# JSON Response
curl "https://your-domain.com/api/random?format=json"
# {"success":true,"data":{"url":"/api/pic/...","category":"anime"}}

# By Category
curl "https://your-domain.com/api/random?category=anime"

# Direct Image URL
<img src="/api/pic/meitu/anime/xxx.jpg" />
```

## Features

- [x] Category Management
- [x] Weighted Random Selection
- [x] Format Negotiation (AVIF/WebP/JPG)
- [x] Referer Hotlink Protection
- [x] Embedded Image Index (no KV required)

## Data Format

```json
{
  "id": 1,
  "name": "xxx",
  "hash": "abc12345",
  "url": "/meitu/anime/xxx-abc12345",
  "category": "anime",
  "enabled": true,
  "weight": 1,
  "tags": []
}
```

## Storage Priority

1. **R2 Bucket** - Checked first
2. **External URL** - Falls back to `IMAGE_BASE_URL`

## Security

- Images can be proxied through Worker (R2 URL hidden)
- Referer whitelist protection
- Immutable cache headers

## License

MIT
