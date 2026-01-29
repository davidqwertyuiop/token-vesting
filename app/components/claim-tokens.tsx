"use client";

import { useState, useCallback, useMemo } from "react";
import { useWalletConnection, useSendTransaction } from "@solana/react-hooks";
import { getProgramDerivedAddress, getUtf8Encoder, getAddressEncoder, type TransactionSigner, type Address } from "@solana/kit";
import { getClaimTokensInstructionAsync, fetchMaybeVestingAccount, fetchMaybeEmployeeAccount, VESTING_PROGRAM_ADDRESS, type EmployeeAccount } from "../generated/vesting";
import { rpc } from "../config/solana";
import { formatSolanaError } from "../utils/error-handler";

export function ClaimTokens() {
  const { wallet, status } = useWalletConnection();
  const { send, isSending } = useSendTransaction();
  const [companyName, setCompanyName] = useState("");
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [employeeData, setEmployeeData] = useState<{ address: string; data: EmployeeAccount; vestingAddress: string } | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const calculateVested = useCallback((data: EmployeeAccount) => {
    const now = Math.floor(Date.now() / 1000);
    const start = Number(data.startTime);
    const end = Number(data.endTime);
    const cliff = Number(data.cliffTime);
    const total = Number(data.totalAmount);

    if (now < cliff) return 0;
    if (now >= end) return total;
    
    const elapsed = now - start;
    const duration = end - start;
    return Math.floor((total * elapsed) / duration);
  }, []);

  const checkStatus = useCallback(async () => {
    const trimmed = companyName.trim();
    if (!wallet || !trimmed) return;

    setIsChecking(true);
    setTxStatus("Checking blockchain...");
    setEmployeeData(null);

    try {
      const [vestingAccountAddress] = await getProgramDerivedAddress({
        programAddress: VESTING_PROGRAM_ADDRESS,
        seeds: [getUtf8Encoder().encode(trimmed)],
      });

      const vestingAccount = await fetchMaybeVestingAccount(rpc, vestingAccountAddress);
      if (!vestingAccount.exists) {
        setTxStatus("❌ Company not found. Check the name (case-sensitive).");
        return;
      }

      const [employeeAccountAddress] = await getProgramDerivedAddress({
        programAddress: VESTING_PROGRAM_ADDRESS,
        seeds: [
          getUtf8Encoder().encode("emplyee_vesting"),
          getAddressEncoder().encode(wallet.account.address as Address),
          getAddressEncoder().encode(vestingAccountAddress),
        ],
      });

      const employeeAccount = await fetchMaybeEmployeeAccount(rpc, employeeAccountAddress);
      if (!employeeAccount.exists) {
        setTxStatus("⚠️ No schedule found. Wait 5 seconds if just created, or verify company name and wallet.");
        return;
      }

      setEmployeeData({
        address: employeeAccountAddress,
        data: employeeAccount.data,
        vestingAddress: vestingAccountAddress
      });
      setTxStatus(null);
    } catch (err: any) {
      console.error("Status check failed:", err);
      setTxStatus(formatSolanaError(err));
    } finally {
      setIsChecking(false);
    }
  }, [companyName, wallet]);

  const handleClaim = useCallback(async () => {
    if (!wallet || !employeeData) return;

    try {
      setTxStatus("Building claim transaction...");

      const vestingAccount = await fetchMaybeVestingAccount(rpc, employeeData.vestingAddress as Address);
      if (!vestingAccount.exists) throw new Error("Vesting account disappeared.");

      const instruction = await getClaimTokensInstructionAsync({
        beneficiary: wallet.account as any as TransactionSigner,
        companyName: companyName.trim(),
        mint: vestingAccount.data.mint,
        treasuryTokenAccount: vestingAccount.data.treasuryTokenAccount,
        vestingAccount: employeeData.vestingAddress as Address,
        employeeAccount: employeeData.address as Address,
      });

      setTxStatus("Awaiting signature...");
      const signature = await send({ instructions: [instruction] });

      setTxStatus(`✅ Tokens claimed! Signature: ${signature.slice(0, 16)}...`);
      setTimeout(checkStatus, 3000);
    } catch (err: any) {
      setTxStatus(formatSolanaError(err));
    }
  }, [wallet, employeeData, companyName, send, checkStatus]);

  const claimableAmount = useMemo(() => {
    if (!employeeData) return 0;
    return calculateVested(employeeData.data) - Number(employeeData.data.totalWithdrawn);
  }, [employeeData, calculateVested]);

  return (
    <div className="space-y-4 rounded-2xl border border-border-low bg-card p-6 shadow-sm">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Claim Tokens</h3>
        <p className="text-sm text-muted">View your vesting progress and claim available tokens.</p>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter Company Name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && checkStatus()}
            className="flex-1 rounded-lg border border-border-low bg-card px-4 py-2 text-sm outline-none transition focus:border-foreground/30"
          />
          <button
            onClick={checkStatus}
            disabled={isChecking || !companyName.trim() || status !== "connected"}
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-bold text-background transition hover:opacity-90 disabled:opacity-40"
          >
            {isChecking ? "Checking..." : "Check Status"}
          </button>
        </div>

        {employeeData && (
          <div className="rounded-xl border border-border-low bg-foreground/[0.02] p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-border-low pb-2">
              <span className="text-xs font-bold text-muted uppercase">Employee</span>
              <span className="text-sm font-semibold">{employeeData.data.name}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-muted font-medium uppercase">Total Vested</p>
                <p className="text-xl font-bold">{calculateVested(employeeData.data)}</p>
              </div>
              <div>
                <p className="text-muted font-medium uppercase">Claimed</p>
                <p className="text-xl font-bold text-green-600">{employeeData.data.totalWithdrawn.toString()}</p>
              </div>
            </div>

            {Number(employeeData.data.cliffTime) * 1000 > Date.now() ? (
              <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800">
                <p className="font-bold uppercase mb-1">⏰ Cliff Period Active</p>
                <p>Unlock Date: {new Date(Number(employeeData.data.cliffTime) * 1000).toLocaleString()}</p>
              </div>
            ) : claimableAmount > 0 ? (
              <button
                onClick={handleClaim}
                disabled={isSending}
                className="w-full rounded-lg bg-green-600 px-5 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-40"
              >
                {isSending ? "Processing..." : `Claim ${claimableAmount} Tokens`}
              </button>
            ) : (
              <div className="rounded-lg bg-green-50 border border-green-100 p-3 text-xs text-green-800 text-center font-medium">
                ✓ All vested tokens claimed!
              </div>
            )}
          </div>
        )}

        {txStatus && (
          <div className={`rounded-lg border px-4 py-3 text-sm whitespace-pre-line ${
            txStatus.includes("✅") || txStatus.includes("✓") 
              ? "border-green-200 bg-green-50 text-green-800" 
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}>
            {txStatus}
          </div>
        )}
      </div>
    </div>
  );
}
