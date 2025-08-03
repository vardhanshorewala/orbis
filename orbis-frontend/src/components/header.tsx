'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { TonConnectButton } from '@tonconnect/ui-react';
import { env } from '~/env';
import { useEffect } from 'react';

export function Header() {
  useEffect(() => {
    console.log('TON Manifest URL:', env.NEXT_PUBLIC_TON_MANIFEST_URL);
  }, []);

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
          <div className="flex flex-col items-end gap-2">
            <ConnectButton showBalance={false} chainStatus="icon" />
            <TonConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
} 