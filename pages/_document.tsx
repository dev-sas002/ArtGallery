import { Head, Html, Main, NextScript } from 'next/document'

// EB Garamond for titles (a book face suits wall labels and catalogue
// entries) and Source Sans 3 for the interface. Both fall back to the system
// stacks in globals.css when Google Fonts is unreachable.
const FONTS =
  'https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500&family=Source+Sans+3:wght@400;600&display=swap'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTS} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
