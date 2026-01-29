"use client";

import { useState, useMemo, useCallback } from "react";
import { useWalletConnection, useSendTransaction } from "@solana/react-hooks";
import { type Address, type TransactionSigner, getProgramDerivedAddress, getUtf8Encoder, isAddress } from "@solana/kit";
import { getCreateVestingAccountInstructionAsync, VESTING_PROGRAM_ADDRESS } from "../generated/vesting";
import { formatSolanaError } from "../utils/error-handler";

export function CreateVestingAccount() {
  const { wallet, status } = useWalletConnection();
  const { send, isSending } = useSendTransaction();
  const [companyName, setCompanyName] = useState("");
  const [mintAddress, setMintAddress] = useState("");
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [createdAddresses, setCreatedAddresses] = useState<{ vesting: string; treasury: string } | null>(null);

  const isValid = useMemo(() => {
    return companyName.trim() && mintAddress.trim() && isAddress(mintAddress.trim());
  }, [companyName, mintAddress]);

  const handleCreate = useCallback(async () => {
    if (!wallet || !isValid) return;

    const trimmedCompany = companyName.trim();
    const trimmedMint = mintAddress.trim();

    try {
      setTxStatus("Building transaction...");
      setCreatedAddresses(null);

      const instruction = await getCreateVestingAccountInstructionAsync({
        signer: wallet.account as any as TransactionSigner,
        mint: trimmedMint as Address,
        companyName: trimmedCompany,
      });

      const [vestingAddress] = await getProgramDerivedAddress({
        programAddress: VESTING_PROGRAM_ADDRESS,
        seeds: [getUtf8Encoder().encode(trimmedCompany)],
      });

      const [treasuryAddress] = await getProgramDerivedAddress({
        programAddress: VESTING_PROGRAM_ADDRESS,
        seeds: [getUtf8Encoder().encode("vesting_treasury"), getUtf8Encoder().encode(trimmedCompany)],
      });

      setTxStatus("Awaiting signature...");
      const signature = await send({ instructions: [instruction] });

      setTxStatus(`✅ Success! Signature: ${signature.slice(0, 20)}...`);
      setCreatedAddresses({ vesting: vestingAddress, treasury: treasuryAddress });
      setMintAddress("");
    } catch (err: any) {
      console.error("Vesting creation error:", err);
      setTxStatus(formatSolanaError(err));
      setCreatedAddresses(null);
    }
  }, [wallet, isValid, companyName, mintAddress, send]);

  return (
    <div className="space-y-4 rounded-2xl border border-border-low bg-card p-6 shadow-sm">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Create Vesting Account</h3>
        <p className="text-sm text-muted">Initialize a company vesting schedule with a token mint.</p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-muted">Company Name</label>
          <input
            type="text"
            placeholder="Ex. Acme Corp"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full rounded-lg border border-border-low bg-card px-4 py-2.5 text-sm outline-none transition focus:border-foreground/30"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-muted">Token Mint Address</label>
          <input
            type="text"
            placeholder="Paste mint address here"
            value={mintAddress}
            onChange={(e) => setMintAddress(e.target.value)}
            className="w-full rounded-lg border border-border-low bg-card px-4 py-2.5 text-sm outline-none transition focus:border-foreground/30"
          />
        </div>

        <button
          onClick={handleCreate}
          disabled={isSending || status !== "connected" || !isValid}
          className="w-full rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSending ? "Creating..." : "Create Vesting Account"}
        </button>
      </div>

      {createdAddresses && (
        <div className="rounded-lg border border-green-500/30 bg-gray-900 p-4 space-y-2">
          <p className="text-xs font-bold uppercase text-green-400">✓ Created Successfully</p>
          <div>
            <span className="text-[10px] font-bold text-gray-400 block mb-1">VESTING ACCOUNT</span>
            <code className="bg-gray-800 text-green-300 px-2 py-1 rounded text-[11px] block break-all">{createdAddresses.vesting}</code>
          </div>
          <div>
            <span className="text-[10px] font-bold text-amber-400 block mb-1">TREASURY (Send tokens here!)</span>
            <code className="bg-gray-800 text-amber-300 px-2 py-1 rounded text-[11px] block break-all font-bold">{createdAddresses.treasury}</code>
          </div>
        </div>
      )}

      {txStatus && !createdAddresses && (
        <div className={`rounded-lg border px-4 py-3 text-sm whitespace-pre-line ${
          txStatus.includes("✅") ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-800"
        }`}>
          {txStatus}
        </div>
      )}
    </div>
  );
}
