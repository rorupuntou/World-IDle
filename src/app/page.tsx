// app/page.tsx
import Game from "@/components/Game";

export default function Home() {
  return (
    // CAMBIO: Usamos las nuevas clases 'pt-[theme(spacing.safe-top)]'
    <main className="flex min-h-screen flex-col items-center justify-center p-4 pt-[theme(spacing.safe-top)] pb-[theme(spacing.safe-bottom)]">
      <Game />
    </main>
  );
}