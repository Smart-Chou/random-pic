#!/usr/bin/env pnpm tsx
/**
 * Sync image data to Cloudflare KV
 *
 * Usage:
 *   KV_NAMESPACE_ID=xxx pnpm tsx scripts/sync-kv.ts
 */

import {readFile} from 'node:fs/promises'
import {join} from 'node:path'

interface ImageMeta {
  id: number
  name: string
  hash: string
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
    console.error('Error: KV_NAMESPACE_ID is required')
    console.log('\nUsage:')
    console.log('  KV_NAMESPACE_ID=xxx pnpm tsx scripts/sync-kv.ts')
    process.exit(1)
  }

  console.log(`📥 Reading: ${DATA_FILE}`)
  const content = await readFile(DATA_FILE, 'utf-8')
  const images: ImageMeta[] = JSON.parse(content)

  console.log(`📷 Found ${images.length} images`)
  console.log(`🏭 KV Namespace: ${KV_NAMESPACE_ID}`)
  console.log('\nSyncing to KV...\n')

  // Use wrangler to sync
  const { execSync } = await import('node:child_process')

  for (const img of images) {
    const key = String(img.id)
    const value = JSON.stringify(img)

    try {
      execSync(
        `wrangler kv:key put "${key}" --namespace-id="${KV_NAMESPACE_ID}" --value='${value}'`,
        { encoding: 'utf-8' }
      )
      console.log(`  ✅ Synced: ${key} (${img.category}/${img.name})`)
    } catch (err) {
      console.log(`  ❌ Failed: ${key}`)
    }
  }

  console.log(`\n✅ Done! ${images.length} images synced`)
}

main().catch(console.error)