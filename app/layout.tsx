import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ГШХ Систем — Газрын Шуурхай Хурал',
  description: 'Газрын албаны үүрэг даалгаварын удирдлагын систем',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
