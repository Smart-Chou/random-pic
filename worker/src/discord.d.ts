/// <reference types="@cloudflare/workers-types" />

declare module '*' {
  interface Env {
    R2: R2Bucket
    ASSETS: Fetcher
  }
}
