import Link from 'next/link';

export default function Home() {
  return (
    <div className="container">
      <div className="hero">
        <h1>Random Pic API</h1>
        <p className="subtitle">随机图片 API 服务</p>
        <div className="api-preview">
          <Link href="/api/random" className="demo-link" target="_blank">
            试试看 →
          </Link>
        </div>
      </div>

      <div className="cards">
        <div className="card">
          <h2>📡 API 端点</h2>
          <ul>
            <li>
              <code>/api/random</code>
              <span>随机跳转图片</span>
            </li>
            <li>
              <code>/api/random?format=json</code>
              <span>JSON 响应</span>
            </li>
            <li>
              <code>/api/random?category=xxx</code>
              <span>指定分类</span>
            </li>
            <li>
              <code>/api/categories</code>
              <span>获取分类列表</span>
            </li>
            <li>
              <code>/api/img</code>
              <span>图片 Proxy（支持压缩）</span>
            </li>
            <li>
              <code>/api/health</code>
              <span>健康检查</span>
            </li>
          </ul>
        </div>

        <div className="card">
          <h2>🖼️ 图片压缩参数</h2>
          <div className="code-block">
            <pre>{`# 使用 Vercel 图片优化
/api/img?width=400&quality=80&format=webp
/api/img?id=xxx&width=800&format=avif

# 参数说明
width   - 宽度 (px)
quality - 质量 (1-100)
format  - 格式 (webp, avif, jpg, png)`}</pre>
          </div>
        </div>

        <div className="card">
          <h2>💡 使用示例</h2>
          <div className="code-block">
            <pre>{`# 直接引用（Markdown）
![随机图片](https://your-domain.com/api/random)

# HTML 使用
<img src="https://your-domain.com/api/random" />

# 带随机参数（避免缓存）
<img src="https://your-domain.com/api/random?r=${Math.random().toString(36).slice(2)}" />`}</pre>
          </div>
        </div>

        <div className="card">
          <h2>🎯 功能特性</h2>
          <ul className="features">
            <li>✅ 简单易用的 REST API</li>
            <li>✅ 支持分类筛选</li>
            <li>✅ JSON / 重定向 双模式</li>
            <li>✅ 图片 Proxy 支持</li>
            <li>✅ 实时图片压缩 (WebP/AVIF)</li>
            <li>✅ S3 存储桶兼容</li>
            <li>✅ Referer 白名单保护</li>
          </ul>
        </div>
      </div>

      <footer>
        <p>Powered by Next.js</p>
      </footer>
    </div>
  );
}