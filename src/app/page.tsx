// app/page.tsx
import Game from "@/components/Game";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <Game />
    </main>
  );
}