// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "World Idle",
  description: "Un juego idle para el ecosistema Worldcoin.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} bg-stone-950 text-slate-50`}
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #3f3f46 1px, transparent 0)',
          backgroundSize: '2rem 2rem'
        }}
      >
        {children}
      </body>
    </html>
  );
}