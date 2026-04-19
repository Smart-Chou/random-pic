export const config = {
  // Data file path relative to project root
  dataFilePath: 'data/images.json',

  // S3 bucket URL for images
  // 设置为你的 S3 bucket 域名，如 https://your-bucket.s3.region.amazonaws.com
  baseUrl: process.env.IMAGE_BASE_URL || '',

  // API configuration
  api: {
    // Default redirect status code (302 or 307)
    redirectStatusCode: 302 as 302 | 307,
  },

  // Referer whitelist for security
  refererWhitelist: (process.env.REFERER_WHITELIST || 'marxchou.com,localhost,127.0.0.1,mcc.im')
    .split(',')
    .map(d => d.trim()),
} as const;

export type Config = typeof config;