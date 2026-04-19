# Random Pic API

A modern random image API built with Next.js 15, TypeScript, and Zod.

## Tech Stack

- **Next.js 15** - App Router, Route Handlers
- **TypeScript** - Full type safety
- **Zod** - Schema validation
- **Vitest** - Testing

## Features

- `GET /api/random` - Redirect to random image URL
- `GET /api/random?category=xxx` - Get random image from specific category
- `GET /api/random?format=json` - Get JSON response
- `GET /api/img` - Image proxy with compression support
- `GET /api/categories` - List available categories
- `GET /api/health` - Health check

## Getting Started

### Install dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Start production

```bash
npm run start
```

### Test

```bash
npm run test
```

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

Response:

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

Response:

```json
{
  "success": true,
  "data": {
    "categories": ["landscape"],
    "total": 1
  }
}
```

### Health check

```http
GET /api/health
```

## Deployment

### Vercel (Recommended)

```bash
npm i -g vercel
vercel
```

Or connect your GitHub repository to Vercel.

### Environment Variables

- `IMAGE_BASE_URL` - Base URL for images (optional, for relative URLs)

## Future Extensibility

The codebase is structured to support future expansions:

- **Database**: Prisma + PostgreSQL ready (replace `image-repository.ts`)
- **Weighted random**: Already implemented in `image-service.ts`
- **Upload/management**: API routes organized for easy extension
- **Authentication**: Route handlers ready for middleware

## License

MIT
