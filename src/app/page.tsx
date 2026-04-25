import Link from 'next/link'

export default function Home() {
  return (
    <div className="container">
      <div className="hero">
        <h1>Random Pic API</h1>
        <p className="subtitle">Image Service API</p>
        <div className="api-preview">
          <Link href="/api/random" className="demo-link" target="_blank">
            Random Image →
          </Link>
        </div>
      </div>

      <div className="cards">
        <div className="card">
          <h2>📡 Core API</h2>
          <ul>
            <li>
              <code>/api/random</code>
              <span>Random image</span>
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
              <code>/api/pic/path/to/image.webp</code>
              <span>Proxy image</span>
            </li>
          </ul>
        </div>

        <div className="card">
          <h2>🔗 JSON Response</h2>
          <div className="code-block">
            <pre>{`# JSON response (hides storage domain)
/api/random?format=json
-> {"url": "/api/pic/xxx.webp"}`}</pre>
          </div>
        </div>

        <div className="card">
          <h2>🎯 Features</h2>
          <ul className="features">
            <li>✅ Category Management</li>
            <li>✅ Referer Hotlink Protection</li>
            <li>✅ CORS Support</li>
            <li>✅ Hidden Storage Domain</li>
          </ul>
        </div>

        <div className="card">
          <h2>💡 Usage Examples</h2>
          <div className="code-block">
            <pre>{`# Markdown
![random](https://your-domain.com/api/random)

# HTML
<img src="/api/random" />

# With category
/api/random?category=landscape

# JSON response
/api/random?format=json`}</pre>
          </div>
        </div>
      </div>

      <footer>
        <p>Powered by Next.js</p>
      </footer>
    </div>
  )
}
