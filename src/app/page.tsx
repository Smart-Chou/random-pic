import Link from 'next/link'

export default function Home() {
  return (
    <div className="container">
      <div className="hero">
        <h1>Random Pic API</h1>
        <p className="subtitle">Random Image API Service</p>
        <div className="api-preview">
          <Link href="/api/random" className="demo-link" target="_blank">
            Try it →
          </Link>
        </div>
      </div>

      <div className="cards">
        <div className="card">
          <h2>📡 API Endpoints</h2>
          <ul>
            <li>
              <code>/api/random</code>
              <span>Random redirect</span>
            </li>
            <li>
              <code>/api/random?format=json</code>
              <span>JSON response</span>
            </li>
            <li>
              <code>/api/random?category=xxx</code>
              <span>By category</span>
            </li>
            <li>
              <code>/api/categories</code>
              <span>List categories</span>
            </li>
            <li>
              <code>/api/img</code>
              <span>Image proxy (with compression)</span>
            </li>
            <li>
              <code>/api/health</code>
              <span>Health check</span>
            </li>
          </ul>
        </div>

        <div className="card">
          <h2>🖼️ Image Compression Params</h2>
          <div className="code-block">
            <pre>{`# Using Vercel Image Optimization
/api/img?width=400&quality=80&format=webp
/api/img?id=xxx&width=800&format=avif

# Params
width   - Width (px)
quality - Quality (1-100)
format  - Format (webp, avif, jpg, png)`}</pre>
          </div>
        </div>

        <div className="card">
          <h2>💡 Usage Examples</h2>
          <div className="code-block">
            <pre>{`# Direct reference (Markdown)
![Random Image](https://your-domain.com/api/random)

# HTML usage
<img src="https://your-domain.com/api/random" />

# With cache-busting param
<img src="https://your-domain.com/api/random?r=${Math.random().toString(36).slice(2)}" />`}</pre>
          </div>
        </div>

        <div className="card">
          <h2>🎯 Features</h2>
          <ul className="features">
            <li>✅ Simple REST API</li>
            <li>✅ Category filtering</li>
            <li>✅ JSON / Redirect modes</li>
            <li>✅ Image proxy support</li>
            <li>✅ Real-time compression (WebP/AVIF)</li>
            <li>✅ S3-compatible storage</li>
            <li>✅ Referer whitelist protection</li>
          </ul>
        </div>
      </div>

      <footer>
        <p>Powered by Next.js</p>
      </footer>
    </div>
  )
}
