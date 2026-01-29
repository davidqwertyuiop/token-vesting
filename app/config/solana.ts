import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import { autoDiscover, createClient } from "@solana/client";

// Detect if we are running in a browser environment
const isBrowser = typeof window !== "undefined";

export const SOLANA_NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";
export const IS_LOCALNET = SOLANA_NETWORK === "localnet";

export const DEVNET_RPCS = [
  "https://api.devnet.solana.com",
  "https://devnet.helius-rpc.com",
  "https://api.devnet.rpcpool.com"
];

// Simple persistence for RPC choice
const getInitialRpc = () => {
  if (!isBrowser) return DEVNET_RPCS[0];
  return localStorage.getItem("solana_rpc_choice") || DEVNET_RPCS[0];
};

export const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_URL || (
  IS_LOCALNET 
    ? "http://127.0.0.1:8899" 
    : getInitialRpc()
);

export const WSS_ENDPOINT = process.env.NEXT_PUBLIC_WSS_URL || (
  IS_LOCALNET
    ? "ws://127.0.0.1:8900"
    : "wss://api.devnet.solana.com"
);

// We export these as 'let' so we can update them if the user switches RPC
export let rpc = createSolanaRpc(RPC_ENDPOINT);
export let rpcSubscriptions = createSolanaRpcSubscriptions(WSS_ENDPOINT);

export let client = createClient({
  endpoint: RPC_ENDPOINT,
  walletConnectors: autoDiscover(),
});

// Function to switch RPC at runtime
export const switchRpc = (newEndpoint: string) => {
  if (isBrowser) localStorage.setItem("solana_rpc_choice", newEndpoint);
  rpc = createSolanaRpc(newEndpoint);
  client = createClient({
    endpoint: newEndpoint,
    walletConnectors: autoDiscover(),
  });
  // Note: App might need a refresh to pick up the new RPC in all components
  // but we export it directly so it should work in most places.
  if (isBrowser) window.location.reload();
};
