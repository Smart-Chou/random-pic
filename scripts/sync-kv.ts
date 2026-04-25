#!/usr/bin/env pnpm tsx
/**
 * Sync images to KV
 */

import { readFile } from 'node:fs/promises'

interface Image {
  id: number
  name: string
  hash: string
  url: string
  category: string
  enabled: boolean
  weight: number
  tags: string[]
}

const KV_NAMESPACE_ID = 'f38bb246bea84f4199c8e3a9ceea6f24'
const DATA_FILE = 'data/images.json'

async function main() {
  console.log(`📥 Reading: ${DATA_FILE}`)
  const content = await readFile(DATA_FILE, 'utf-8')
  const images: Image[] = JSON.parse(content)

  console.log(`📷 Found ${images.length} images`)
  console.log(`🏭 KV Namespace: ${KV_NAMESPACE_ID}`)
  console.log('')

  for (const img of images) {
    const key = String(img.id)
    const value = JSON.stringify(img)

    const { execSync } = await import('node:child_process')

    try {
      execSync(
        `npx wrangler kv key put "${key}" '${value}' --namespace-id "${KV_NAMESPACE_ID}" --remote`,
        { encoding: 'utf-8' }
      )
      console.log(`  ✅ Synced: ${key} (${img.category}/${img.name})`)
    } catch (err) {
      console.log(`  ❌ Failed: ${key}`)
    }
  }

  console.log(`\n✅ Done! ${images.length} images synced to KV`)
}

main().catch(console.error)