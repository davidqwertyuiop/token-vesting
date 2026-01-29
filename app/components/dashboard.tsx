"use client";

import { useState } from "react";
import { useWalletConnection, useBalance } from "@solana/react-hooks";
import { CreateMint } from "./create-mint";
import { CreateVestingAccount } from "./create-vesting";
import { CreateEmployeeAccount } from "./create-employee";
import { ClaimTokens } from "./claim-tokens";
import { ClaimTracker } from "./claim-tracker";
import { TesterGuide } from "./tester-guide";

import { SOLANA_NETWORK, rpc, RPC_ENDPOINT, DEVNET_RPCS, switchRpc } from "../config/solana";
import { lamports } from "@solana/kit";

type Tab = "guide" | "admin" | "employee" | "tracker";

const LAMPORTS_PER_SOL = 1_000_000_000n;

export function VestingDashboard() {
  const { wallet } = useWalletConnection();
  const balance = useBalance(wallet?.account.address);
  
  const solBalance = balance?.lamports !== undefined 
    ? Number(balance.lamports) / Number(LAMPORTS_PER_SOL) 
    : null;
  
  const [activeTab, setActiveTab] = useState<Tab>("guide");
  const [isAirdropping, setIsAirdropping] = useState(false);
  const [showRpcMenu, setShowRpcMenu] = useState(false);

  const handleAirdrop = async () => {
    if (!wallet) return;
    try {
      setIsAirdropping(true);
      const signature = await rpc.requestAirdrop(
        wallet.account.address,
        lamports(1_000_000_000n),
        { commitment: "confirmed" }
      ).send();
      console.log("Airdrop signature:", signature);
      alert("✅ Airdrop successful! Balance will update in a few seconds.");
    } catch (err) {
      console.error("Airdrop failed:", err);
      alert("⚠️ Airdrop failed. Try https://faucet.solana.com/ instead.");
    } finally {
      setIsAirdropping(false);
    }
  };

  return (
    <section className="w-full max-w-3xl space-y-6">
      <div className="flex items-center justify-between border-b border-border-low">
        <div className="flex">
          <button
            onClick={() => setActiveTab("guide")}
            className={`px-6 py-3 text-sm font-medium transition border-b-2 ${
              activeTab === "guide"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted hover:text-foreground/80"
            }`}>
            Guide
          </button>
          <button
            onClick={() => setActiveTab("admin")}
            className={`px-6 py-3 text-sm font-medium transition border-b-2 ${
              activeTab === "admin"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted hover:text-foreground/80"
            }`}>
            Admin
          </button>
          <button
            onClick={() => setActiveTab("employee")}
            className={`px-6 py-3 text-sm font-medium transition border-b-2 ${
              activeTab === "employee"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted hover:text-foreground/80"
            }`}>
            Claim
          </button>
          <button
            onClick={() => setActiveTab("tracker")}
            className={`px-6 py-3 text-sm font-medium transition border-b-2 ${
              activeTab === "tracker"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted hover:text-foreground/80"
            }`}>
            Tracker
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted opacity-60">
              {SOLANA_NETWORK}
            </span>
            <div className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-cream/30 rounded-lg border border-border-low">
              <span className="font-mono">
                {solBalance !== null ? `${solBalance.toFixed(4)} SOL` : "Loading..."}
              </span>
            </div>
          </div>
          
          {SOLANA_NETWORK !== "mainnet" && (
            <div className="relative">
              <button
                onClick={() => setShowRpcMenu(!showRpcMenu)}
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-foreground/5 hover:bg-foreground/10 border border-border-low transition">
                ⚙ RPC
              </button>
              
              {showRpcMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border-low bg-card p-2 shadow-xl z-50">
                   <p className="px-3 py-2 text-[10px] font-bold text-muted uppercase">Switch Node</p>
                   {DEVNET_RPCS.map(node => (
                     <button
                        key={node}
                        onClick={() => switchRpc(node)}
                        className={`w-full text-left px-3 py-2 text-xs rounded-lg transition ${
                          RPC_ENDPOINT === node ? "bg-foreground/10 font-bold" : "hover:bg-foreground/5"
                        }`}>
                       {node.includes("helius") ? "Helius" : node.includes("rpcpool") ? "Pool" : "Default"}
                     </button>
                   ))}
                </div>
              )}
            </div>
          )}

          {SOLANA_NETWORK !== "mainnet" && (
            <button
              onClick={handleAirdrop}
              disabled={isAirdropping || !wallet}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-foreground/5 hover:bg-foreground/10 border border-border-low transition disabled:opacity-50">
              {isAirdropping ? "..." : "Airdrop"}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {activeTab === "guide" && <TesterGuide />}
        
        {activeTab === "admin" && (
          <>
            <CreateMint />
            <div className="h-px bg-border-low" />
            <CreateVestingAccount />
            <div className="h-px bg-border-low" />
            <CreateEmployeeAccount />
          </>
        )}

        {activeTab === "employee" && <ClaimTokens />}
        
        {activeTab === "tracker" && <ClaimTracker />}
      </div>
    </section>
  );
}
