import { Header } from "~/components/header";
import { SwapWidget } from "~/components/swap-widget";
import { EscrowInteraction } from "~/components/escrow-interaction";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-cyan-900/20">
        <div className="absolute left-0 top-0 h-[500px] w-[500px] animate-pulse rounded-full bg-purple-600/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[600px] w-[600px] animate-pulse rounded-full bg-cyan-600/10 blur-3xl [animation-delay:2s]" />
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-green-600/10 blur-3xl [animation-delay:4s]" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <Header />
        
        <main className="container mx-auto px-4 py-12">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <SwapWidget />
            </div>
            <div>
              <EscrowInteraction />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
