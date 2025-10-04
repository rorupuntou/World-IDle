import { MiniKitProvider } from "@worldcoin/minikit-js/minikit-provider";
import { PrivyProvider } from "@privy-io/react-auth";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId="cmgcvhx6k00z6l50cnm6j4ubw"
      config={{
        loginMethods: ['wallet'],
        embeddedWallets: { createOnLogin: 'users-without-wallets' },
      }}
    >
      <MiniKitProvider>{children}</MiniKitProvider>
    </PrivyProvider>
  );
}
