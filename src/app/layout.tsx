// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/Providers";
import { LanguageProvider } from "@/contexts/LanguageContext";
import "./globals.css";
import "@worldcoin/mini-apps-ui-kit-react/styles.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "World Idle",
  description: "Un juego idle para el ecosistema Worldcoin.",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} bg-stone-950 text-slate-50 pt-safe-top pb-safe-bottom`}
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #3f3f46 1px, transparent 0)',
          backgroundSize: '2rem 2rem'
        }}
      >
        <LanguageProvider>
          <Providers>{children}</Providers>
        </LanguageProvider>
      </body>
    </html>
  );
}