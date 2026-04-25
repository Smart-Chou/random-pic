# Random Pic API

Image Service API

## Tech Stack

- **Next.js 15** - App Router, Route Handlers
- **TypeScript** - Full type safety
- **Cloudflare R2** - Image storage (hidden behind proxy)

## Quick Start

### 1. Setup Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

| Variable         | Description           | Required |
| ---------------- | --------------------- | -------- |
| `IMAGE_BASE_URL` | R2 custom domain      | Yes      |

Optional variables:

| Variable              | Description              | Default |
| --------------------- | ------------------------ | ------- |
| `REFERER_WHITELIST`   | Allowed referers         | -       |
| `R2_ACCOUNT_ID`      | Cloudflare R2 Account ID| -       |
| `R2_BUCKET`          | R2 bucket name           | -       |
| `R2_ACCESS_KEY`      | R2 Access Key            | -       |
| `R2_SECRET_KEY`      | R2 Secret Key            | -       |

### 2. Start

```bash
pnpm install
pnpm dev
```

Visit http://localhost:3000

## API Endpoints

| Endpoint                   | Description     |
| -------------------------- | --------------- |
| `/api/random`              | Random image    |
| `/api/random?format=json`  | JSON response   |
| `/api/random?category=xxx` | By category     |
| `/api/categories`          | List categories |
| `/api/pic/[path]`          | Proxy image     |

## Usage Examples

### Random Image

```bash
# HTML (recommended)
<img src="https://your-domain.com/api/random" />

# JSON response
curl "https://your-domain.com/api/random?format=json"

# With category
curl "https://your-domain.com/api/random?category=landscape"
```

## Features

- [x] Category Management
- [x] Weighted Random Selection
- [x] Background Image Mode (?bg=true)
- [x] Referer Hotlink Protection
- [x] CORS Support
- [x] Hidden Storage Domain (all traffic through proxy)

### Weighted Random Selection

Images can have a `weight` field to control selection probability. Higher weight = higher chance:

```json
{
  "id": "1",
  "url": "/path/to/image.webp",
  "weight": 10
}
```

### Background Image Mode

Use `?bg=true` to skip referer validation for CSS background images:

```html
<img src="https://your-domain.com/api/random?bg=true" />
```

## Testing

```bash
pnpm test
```

## Deployment

### Vercel

```bash
pnpm build
vercel deploy
```

### Cloudflare Workers

```bash
cd worker
pnpm build
wrangler deploy
```

### Local

```bash
pnpm dev
```

## Environment Variables

```bash
# R2 Configuration
R2_ACCOUNT_ID=your_account_id
R2_BUCKET=blog-all
R2_ACCESS_KEY=your_access_key

# R2 Custom Domain (used internally, not exposed)
IMAGE_BASE_URL=your-bucket.example.com

# Referer Whitelist
REFERER_WHITELIST=example.com,localhost
```

## Security

All image URLs are proxied through the application domain. The storage bucket domain is never exposed to end users.

- `/api/random` → streams image (no URL visible)
- `/api/random?format=json` → returns `/api/pic/...` path
- `/api/pic/[path]` → streams from storage

## License

MIT
