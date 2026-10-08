import { http, createConfig, cookieStorage, createStorage } from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { mainnet } from 'wagmi/chains';
import { metaMaskWallet, rainbowWallet, walletConnectWallet, coinbaseWallet } from '@rainbow-me/rainbowkit/wallets';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "00000000000000000000000000000000";

if (!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID && typeof window !== 'undefined') {
  console.warn("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set — WalletConnect-based wallets will fail to connect.");
}

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [metaMaskWallet, rainbowWallet, coinbaseWallet, walletConnectWallet],
    },
  ],
  {
    appName: 'Surge Finance',
    projectId,
  }
);

export const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors,
  ssr: false,
  storage: createStorage({
    storage: cookieStorage,
  }),
  transports: {
    // All reads go through the same-origin proxy (src/pages/api/rpc.ts), so the RPC
    // provider key stays on the server and is never shipped in the browser bundle.
    [mainnet.id]: http('/api/rpc'),
  },
});

// waitForTransactionReceipt resolves for reverted transactions too, so check the status.
export async function waitForSuccess(hash: `0x${string}`) {
  const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
  if (receipt.status !== 'success') throw new Error("Transaction reverted on-chain.");
  return receipt;
}

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}
