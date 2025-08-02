'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { TonConnectButton } from '@tonconnect/ui-react';

export function Header() {
  return (
    <header className="w-full border-b border-gray-800 bg-black/50 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <h1 className="gradient-primary text-gradient text-3xl font-bold">
            Orbis Swap
          </h1>
          <span className="gradient-accent rounded-full px-3 py-1 text-xs font-bold text-black">
            TESTNET
          </span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs font-medium text-purple-400">Ethereum</span>
            <div className="rounded-lg bg-gray-900/50 p-1">
              <ConnectButton />
            </div>
          </div>
          <div className="h-12 w-px bg-gradient-to-b from-transparent via-gray-600 to-transparent" />
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs font-medium text-cyan-400">TON</span>
            <div className="rounded-lg bg-gray-900/50 p-1">
              <TonConnectButton />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
} 