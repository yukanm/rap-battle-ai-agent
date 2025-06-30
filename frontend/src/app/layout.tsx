import type { Metadata, Viewport } from 'next'
import { Noto_Sans_JP, JetBrains_Mono, Bebas_Neue, Permanent_Marker } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from 'react-hot-toast'

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-sans',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
})

const permanentMarker = Permanent_Marker({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-graffiti',
})

export const metadata: Metadata = {
  title: 'AI Agent MC Battle',
  description: '最先端AIエージェントによるリアルタイムMCバトル体験',
  keywords: ['AI', 'Agent', 'MC Battle', 'ヒップホップ', 'リアルタイム', 'Google Cloud', 'Vertex AI'],
  authors: [{ name: 'AI Agent MC Battle Team' }],
  openGraph: {
    title: 'AI Agent MC Battle',
    description: '最先端AIエージェントによるリアルタイムMCバトル体験',
    type: 'website',
    locale: 'ja_JP',
    siteName: 'AI Agent MC Battle',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Agent MC Battle',
    description: '最先端AIエージェントによるリアルタイムMCバトル体験',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body
        className={`${notoSansJP.variable} ${jetbrainsMono.variable} ${bebasNeue.variable} ${permanentMarker.variable} font-sans antialiased bg-black`}
        suppressHydrationWarning
      >
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1a1a1a',
                color: '#ffffff',
                border: '1px solid #333',
                boxShadow: '0 0 20px rgba(147, 51, 234, 0.3)',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}