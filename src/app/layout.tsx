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
        className={`${inter.className} pt-safe-top pb-safe-bottom`}
        style={{
          backgroundColor: '#16a34a',
          color: '#ffffff',
        }}
      >
        <LanguageProvider>
          <Providers>
            {children}
            {/* Small build stamp for verifying deployed preview builds. Set NEXT_PUBLIC_BUILD_ID in Vercel Preview env to show a custom value. */}
            <div className="fixed bottom-2 left-2 z-50 text-[10px] text-slate-400 bg-black/40 px-2 py-1 rounded">
              build: {process.env.NEXT_PUBLIC_BUILD_ID ?? "(unset)"}
            </div>
          </Providers>
        </LanguageProvider>
      </body>
    </html>
  );
}