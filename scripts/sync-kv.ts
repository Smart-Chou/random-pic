#!/usr/bin/env pnpm tsx
/**
 * Sync image data to Cloudflare KV
 *
 * Usage:
 *   pnpm run sync:kv
 *
 * Environment:
 *   KV_NAMESPACE_ID - Cloudflare KV namespace ID
 */

import {readFile} from 'node:fs/promises'
import {join} from 'node:path'

interface ImageMeta {
  id: string
  url: string
  category: string
  enabled: boolean
  weight: number
  tags: string[]
}

const KV_NAMESPACE_ID = process.env.KV_NAMESPACE_ID
const DATA_FILE = join(process.cwd(), 'data', 'images.json')

async function main() {
  if (!KV_NAMESPACE_ID) {
    console.error('Error: KV_NAMESPACE_ID environment variable is required')
    console.log('\nUsage:')
    console.log('  KV_NAMESPACE_ID=xxx pnpm tsx scripts/sync-kv.ts')
    console.log('\nOr add to package.json scripts:')
    console.log('  "sync:kv": "KV_NAMESPACE_ID=xxx pnpm tsx scripts/sync-kv.ts"')
    process.exit(1)
  }

  console.log(`📥 Reading: ${DATA_FILE}`)
  const content = await readFile(DATA_FILE, 'utf-8')
  const images: ImageMeta[] = JSON.parse(content)

  console.log(`📷 Found ${images.length} images`)
  console.log(`🏭 KV Namespace: ${KV_NAMESPACE_ID}`)
  console.log('\nRun the following command to sync:\n')

  console.log(`wrangler kv:namespace create --name IMAGES  # if not exists`)
  console.log(`wrangler kv:batch put ${KV_NAMESPACE_ID} --path=${DATA_FILE}\n`)

  console.log('Or for each image:')
  for (const img of images.slice(0, 3)) {
    console.log(
      `echo '${JSON.stringify(img)}' | wrangler kv:key put ${img.id} --namespace-id=${KV_NAMESPACE_ID}`
    )
  }
  if (images.length > 3) {
    console.log(`  ... and ${images.length - 3} more`)
  }
}

main().catch(console.error)
