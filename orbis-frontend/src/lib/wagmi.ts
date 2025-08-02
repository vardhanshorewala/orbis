import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';
import { env } from '~/env';

export const config = getDefaultConfig({
  appName: 'Orbis Swap',
  projectId: env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  chains: [sepolia],
  ssr: true,
}); 