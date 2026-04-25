import type {Metadata} from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Random Pic API',
  description: 'Image service - upload, compress, convert, edit, batch management',
  keywords: 'image service, image api, image compression, random image',
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
