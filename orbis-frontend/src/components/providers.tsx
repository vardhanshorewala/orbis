'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { TonConnectUIProvider, THEME } from '@tonconnect/ui-react';
import { config } from '~/lib/wagmi';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#7c3aed',
            accentColorForeground: 'white',
            borderRadius: 'large',
            fontStack: 'system',
            overlayBlur: 'small',
          })}
        >
          <TonConnectUIProvider
            manifestUrl="https://raw.githubusercontent.com/ton-connect/demo-dapp-with-react-ui/master/public/tonconnect-manifest.json"
            uiPreferences={{
              theme: THEME.DARK,
            }}
            actionsConfiguration={{
              twaReturnUrl: 'https://t.me/orbis_swap_bot',
              skipRedirectToWallet: 'never'
            }}
            enableAndroidBackHandler={false}
          >
            {children}
          </TonConnectUIProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
} 