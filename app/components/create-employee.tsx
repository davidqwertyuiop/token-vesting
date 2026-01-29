"use client";

import { useState, useCallback } from "react";
import { useWalletConnection, useSendTransaction } from "@solana/react-hooks";
import { getProgramDerivedAddress, getUtf8Encoder, type Address, type TransactionSigner, isAddress, getAddressEncoder } from "@solana/kit";
import {
  getCreateEmployeeAccountInstructionAsync,
  VESTING_PROGRAM_ADDRESS,
  fetchMaybeVestingAccount,
} from "../generated/vesting";
import { rpc } from "../config/solana";
import { formatSolanaError } from "../utils/error-handler";

interface Employee {
  id: string;
  name: string;
  beneficiary: string;
  startTime: string;
  endTime: string;
  cliffTime: string;
  totalAmount: string;
}

export function CreateEmployeeAccount() {
  const { wallet, status } = useWalletConnection();
  const { send, isSending } = useSendTransaction();
  const [companyName, setCompanyName] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([
    { id: crypto.randomUUID(), name: "", beneficiary: "", startTime: "", endTime: "", cliffTime: "", totalAmount: "" }
  ]);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [companyVerify, setCompanyVerify] = useState<{ status: "idle" | "loading" | "found" | "not_found"; owner?: string }>({ status: "idle" });

  const verifyCompany = useCallback(async (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setCompanyVerify({ status: "idle" });
      return;
    }

    setCompanyVerify({ status: "loading" });
    try {
      const [address] = await getProgramDerivedAddress({
        programAddress: VESTING_PROGRAM_ADDRESS,
        seeds: [getUtf8Encoder().encode(trimmedName)],
      });

      const account = await fetchMaybeVestingAccount(rpc, address);
      if (account.exists) {
        setCompanyVerify({ 
          status: "found", 
          owner: account.data.owner.toString() 
        });
      } else {
        setCompanyVerify({ status: "not_found" });
      }
    } catch (err) {
      console.error("Verification failed:", err);
      setCompanyVerify({ status: "not_found" });
    }
  }, []);

  const addEmployeeRow = () => {
    setEmployees([...employees, { id: crypto.randomUUID(), name: "", beneficiary: "", startTime: "", endTime: "", cliffTime: "", totalAmount: "" }]);
  };

  const removeEmployeeRow = (id: string) => {
    if (employees.length > 1) {
      setEmployees(employees.filter(e => e.id !== id));
    }
  };

  const updateEmployee = (id: string, field: keyof Employee, value: string) => {
    setEmployees(employees.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const handleCreateBatch = async () => {
    const trimmedCompany = companyName.trim();
    if (!wallet || !trimmedCompany || employees.some(e => !e.beneficiary.trim() || !e.totalAmount)) {
      setTxStatus("Please fill in all fields (Company Name, Beneficiary, Dates, and Amount).");
      return;
    }

    // Strict Validation
    for (const emp of employees) {
      const trimmedBeneficiary = emp.beneficiary.trim();
      if (!isAddress(trimmedBeneficiary)) {
        setTxStatus(`Invalid wallet address for ${emp.name || 'employee'}: ${trimmedBeneficiary.slice(0, 10)}...`);
        return;
      }
      if (!emp.startTime || !emp.endTime || !emp.cliffTime) {
        setTxStatus(`Please select all 3 dates for ${emp.name || 'employee'}.`);
        return;
      }
      if (isNaN(Number(emp.totalAmount)) || Number(emp.totalAmount) <= 0) {
        setTxStatus("Token amount must be a positive number.");
        return;
      }
    }

    try {
      setTxStatus("Preparing transactions...");

      const [vestingAccountAddress] = await getProgramDerivedAddress({
        programAddress: VESTING_PROGRAM_ADDRESS,
        seeds: [getUtf8Encoder().encode(trimmedCompany)],
      });

      const instructions = await Promise.all(employees.map(async (emp) => {
        const startTimestamp = Math.floor(new Date(emp.startTime).getTime() / 1000);
        const endTimestamp = Math.floor(new Date(emp.endTime).getTime() / 1000);
        const cliffTimestamp = Math.floor(new Date(emp.cliffTime).getTime() / 1000);
        
        // Manual PDA derivation
        const [employeeAccountAddress] = await getProgramDerivedAddress({
          programAddress: VESTING_PROGRAM_ADDRESS,
          seeds: [
            getUtf8Encoder().encode("emplyee_vesting"),
            getAddressEncoder().encode(emp.beneficiary.trim() as Address),
            getAddressEncoder().encode(vestingAccountAddress),
          ],
        });

        return await getCreateEmployeeAccountInstructionAsync({
          owner: wallet.account as any as TransactionSigner,
          beneficiary: emp.beneficiary.trim() as Address,
          vestingAccount: vestingAccountAddress,
          employeeAccount: employeeAccountAddress,
          startTime: BigInt(startTimestamp),
          endTime: BigInt(endTimestamp),
          cliffTime: BigInt(cliffTimestamp),
          totalAmount: BigInt(emp.totalAmount),
          totalWithdrawn: 0n,
          name: emp.name || "Employee",
        });
      }));

      setTxStatus(`Awaiting signature for ${employees.length} employees...`);
      const signature = await send({
        instructions,
      });

      setTxStatus(`Success! Added ${employees.length} employees. Signature: ${signature.slice(0, 16)}...`);
      setEmployees([{ id: crypto.randomUUID(), name: "", beneficiary: "", startTime: "", endTime: "", cliffTime: "", totalAmount: "" }]);
    } catch (err: any) {
      setTxStatus(formatSolanaError(err));
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border-low bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Multiple Employee Vesting</h3>
          <p className="text-sm text-muted">Add one or more beneficiaries with names for easy tracking.</p>
        </div>
        <button
          onClick={addEmployeeRow}
          className="text-xs font-bold uppercase tracking-widest text-foreground bg-foreground/5 px-3 py-1.5 rounded-lg hover:bg-foreground/10 transition"
        >
          + Add Row
        </button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-muted">Company Name (Must match exactly)</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Ex. Acme Corp"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              onBlur={() => verifyCompany(companyName)}
              className={`w-full rounded-lg border bg-card px-4 py-2.5 text-sm outline-none transition focus:border-foreground/30 ${
                companyVerify.status === 'found' ? 'border-green-300' : 'border-border-low'
              }`}
            />
            <div className="mt-1 flex flex-col gap-1 text-[11px]">
              {companyVerify.status === 'loading' && <span className="text-muted italic">Checking blockchain...</span>}
              {companyVerify.status === 'found' && (
                <>
                  <span className="text-green-600 font-medium">✓ Company Found</span>
                  {wallet && companyVerify.owner !== wallet.account.address && (
                    <span className="text-amber-600 font-bold uppercase italic bg-amber-50 p-1.5 rounded border border-amber-200">
                      ⚠ WARNING: This company belongs to a different wallet ({companyVerify.owner?.slice(0, 6)}...). You cannot add employees!
                    </span>
                  )}
                </>
              )}
              {companyVerify.status === 'not_found' && (
                <span className="text-amber-600 font-medium">⚠ Company not found! Please create it in the Admin tab first.</span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {employees.map((emp, index) => (
            <div key={emp.id} className="relative space-y-3 rounded-xl border border-border-low p-4 bg-foreground/[0.02]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-muted uppercase tracking-widest">Employee #{index + 1}</span>
                {employees.length > 1 && (
                  <button onClick={() => removeEmployeeRow(emp.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">
                    Remove
                  </button>
                )}
              </div>
              
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <label className="mb-1 block text-[11px] font-bold text-muted uppercase">Employee Name</label>
                  <input
                    type="text"
                    placeholder="Ex. John Doe"
                    value={emp.name}
                    onChange={(e) => updateEmployee(emp.id, "name", e.target.value)}
                    className="w-full rounded-lg border border-border-low bg-background px-3 py-2 text-sm outline-none"
                  />
                </div>
                
                <div className="sm:col-span-1">
                  <label className="mb-1 block text-[11px] font-bold text-muted uppercase">Beneficiary Address</label>
                  <input
                    type="text"
                    placeholder="Recipient Wallet Address"
                    value={emp.beneficiary}
                    onChange={(e) => updateEmployee(emp.id, "beneficiary", e.target.value)}
                    className="w-full rounded-lg border border-border-low bg-background px-3 py-2 text-sm outline-none"
                  />
                </div>
                
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-muted uppercase">Start Time</label>
                  <input
                    type="datetime-local"
                    value={emp.startTime}
                    onChange={(e) => updateEmployee(emp.id, "startTime", e.target.value)}
                    className="w-full rounded-lg border border-border-low bg-background px-3 py-2 text-sm text-foreground [color-scheme:light]"
                  />
                </div>
                
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-muted uppercase">End Time</label>
                  <input
                    type="datetime-local"
                    value={emp.endTime}
                    onChange={(e) => updateEmployee(emp.id, "endTime", e.target.value)}
                    className="w-full rounded-lg border border-border-low bg-background px-3 py-2 text-sm text-foreground [color-scheme:light]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold text-muted uppercase">Cliff Time</label>
                  <input
                    type="datetime-local"
                    value={emp.cliffTime}
                    onChange={(e) => updateEmployee(emp.id, "cliffTime", e.target.value)}
                    className="w-full rounded-lg border border-border-low bg-background px-3 py-2 text-sm text-foreground [color-scheme:light]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold text-muted uppercase">Total Tokens</label>
                  <input
                    type="number"
                    placeholder="Ex. 100"
                    value={emp.totalAmount}
                    onChange={(e) => updateEmployee(emp.id, "totalAmount", e.target.value)}
                    className="w-full rounded-lg border border-border-low bg-background px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleCreateBatch}
          disabled={isSending || status !== "connected" || !companyName}
          className="w-full rounded-lg bg-foreground px-5 py-3 text-sm font-bold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSending ? "Processing..." : `Create ${employees.length} Employee Schedule${employees.length > 1 ? 's' : ''}`}
        </button>
      </div>

      {txStatus && (
        <div className={`rounded-lg border px-4 py-3 text-sm animate-in fade-in slide-in-from-top-2 break-all ${
          txStatus.toLowerCase().includes("success") 
            ? "border-green-200 bg-green-50 text-green-800" 
            : "border-amber-200 bg-amber-50 text-amber-800"
        }`}>
          {txStatus}
        </div>
      )}
    </div>
  );
}
