import './globals.css';

export const metadata = { title: 'Wits & Wagers Online', description: 'ตอบคำถามตัวเลขและเดิมพัน เล่นผ่านทีวีและมือถือ' };
export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Prompt:wght@500;600;800&family=Noto+Sans+Thai:wght@400;600&display=swap" />
      </head>
      <body>
        <div className="bg" aria-hidden="true"><i /><i /><i /><i /></div>
        {children}
      </body>
    </html>
  );
}
