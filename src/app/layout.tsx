import type {Metadata} from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Random Pic API',
  description:
    'Random image API service - provides random image redirect, JSON output, category filtering, and more',
  keywords: 'random image api, random wallpaper, wallpaper api, image api',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
