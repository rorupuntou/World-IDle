"use client";

import { MiniKitProvider } from "@worldcoin/minikit-js/minikit-provider";
import { WagmiProvider, createConfig, http } from 'wagmi';
import { world, mainnet } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

// Define World Chain as a custom chain for wagmi
const worldChain = {
  ...world, // Inherits properties from the base 'world' chain definition if available
  id: 480,
  name: 'World Chain',
  nativeCurrency: { name: 'Worldcoin', symbol: 'WRLD', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://worldchain-mainnet.g.alchemy.com/v2/kodVkLaxHvuF3CErQP3aK'] },
  },
  blockExplorers: {
    default: { name: 'Worldscan', url: 'https://worldscan.org' },
  },
};

const config = createConfig({
  chains: [worldChain, mainnet],
  transports: {
    [worldChain.id]: http(),
    [mainnet.id]: http(),
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <MiniKitProvider>{children}</MiniKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
