import { Header } from "~/components/header";
import { SwapWidget } from "~/components/swap-widget";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-cyan-900/20">
        <div className="absolute left-0 top-0 h-[500px] w-[500px] animate-pulse rounded-full bg-purple-600/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[600px] w-[600px] animate-pulse rounded-full bg-cyan-600/10 blur-3xl [animation-delay:2s]" />
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-pink-600/10 blur-3xl [animation-delay:4s]" />
      </div>

      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 60 0 L 0 0 0 60' fill='none' stroke='rgba(255,255,255,0.1)' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)' /%3E%3C/svg%3E")`
        }}
      />

      <div className="relative z-10">
        <Header />
        <main className="flex min-h-[calc(100vh-73px)] flex-col items-center justify-center px-4 py-12">
          <div className="mb-12 text-center">
            <h1 className="mb-6 text-5xl font-black md:text-7xl">
              <span className="gradient-primary text-gradient">Cross-Chain</span>
              <br />
              <span className="text-white">Token Bridge</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-gray-400 md:text-xl">
              Seamlessly swap between TON and ETH with our secure, decentralized bridge.
              Experience the future of cross-chain interoperability.
            </p>
          </div>

          <SwapWidget />

          <div className="mt-16 grid max-w-4xl gap-8 text-center md:grid-cols-3">
            <div className="group relative overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/30 p-6 backdrop-blur transition-all hover:border-purple-500/50">
              <div className="gradient-primary absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-2xl transition-all group-hover:opacity-30" />
              <div className="relative">
                <div className="gradient-primary text-gradient mb-4 text-4xl font-bold">
                  ⚡
                </div>
                <h3 className="mb-2 text-xl font-bold text-white">Lightning Fast</h3>
                <p className="text-sm text-gray-400">
                  Cross-chain swaps in minutes, not hours
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/30 p-6 backdrop-blur transition-all hover:border-cyan-500/50">
              <div className="gradient-accent absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-2xl transition-all group-hover:opacity-30" />
              <div className="relative">
                <div className="gradient-accent text-gradient mb-4 text-4xl font-bold">
                  🔒
                </div>
                <h3 className="mb-2 text-xl font-bold text-white">Secure & Trustless</h3>
                <p className="text-sm text-gray-400">
                  Decentralized escrow contracts ensure safety
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/30 p-6 backdrop-blur transition-all hover:border-pink-500/50">
              <div className="gradient-secondary absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-2xl transition-all group-hover:opacity-30" />
              <div className="relative">
                <div className="gradient-secondary text-gradient mb-4 text-4xl font-bold">
                  💎
                </div>
                <h3 className="mb-2 text-xl font-bold text-white">Best Rates</h3>
                <p className="text-sm text-gray-400">
                  Competitive exchange rates with minimal fees
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
