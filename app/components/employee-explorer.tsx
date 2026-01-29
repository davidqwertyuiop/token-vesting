"use client";

import { useState, useCallback } from "react";
import { useWalletConnection } from "@solana/react-hooks";
import { getProgramDerivedAddress, getUtf8Encoder } from "@solana/kit";
import {
  VESTING_PROGRAM_ADDRESS,
  decodeEmployeeAccount,
  type EmployeeAccount,
} from "../generated/vesting";
import { rpc } from "../config/solana";

export function EmployeeExplorer() {
  const { status } = useWalletConnection();
  const [companyName, setCompanyName] = useState("");
  const [employees, setEmployees] = useState<{ address: string; data: EmployeeAccount }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    const trimmed = companyName.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setError(null);
    try {
      // 1. Derive Company PDA
      const [vestingAccountAddress] = await getProgramDerivedAddress({
        programAddress: VESTING_PROGRAM_ADDRESS,
        seeds: [getUtf8Encoder().encode(trimmed)],
      });

      // 2. Fetch all EmployeeAccounts using getProgramAccounts with filters
      // Offset 64 is the vestingAccount field in EmployeeAccount (8 discriminator + 32 beneficiary + 8 start + 8 end + 8 cliff)
      const response = await rpc.getProgramAccounts(VESTING_PROGRAM_ADDRESS, {
        filters: [
          { memcmp: { offset: 64n, bytes: vestingAccountAddress as any, encoding: 'base58' } }
        ],
        encoding: 'base64'
      }).send();

      // In Kit v2, response is often the array itself or .value depending on how it's called
      // Given the lint error 'Property value does not exist', let's fix it by checking the actual return
      const rawAccounts = (response as any).value || response;

      const decoded = (rawAccounts as any[]).map(acc => {
        try {
          return {
            address: acc.pubkey,
            data: decodeEmployeeAccount(acc.account as any).data
          };
        } catch (e) {
          console.warn("Legacy account found at", acc.pubkey);
          return null;
        }
      }).filter(item => item !== null) as { address: string; data: EmployeeAccount }[];

      // Sort by Name
      decoded.sort((a, b) => a.data.name.localeCompare(b.data.name));

      setEmployees(decoded);
      if (decoded.length === 0) setError("No employees found (or all existing accounts are from an older version). Please create a new company/employee.");
    } catch (err: any) {
      console.error("Fetch failed:", err);
      if (err.message?.includes("decode")) {
         setError("Version Mismatch: Some accounts use an old format. Please create a new company for testing.");
      } else {
         setError("Could not load employee list. check the company name.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [companyName]);

  return (
    <div className="space-y-4 rounded-2xl border border-border-low bg-card p-6 shadow-sm">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Employee Registry</h3>
        <p className="text-sm text-muted">View all beneficiaries and their claiming status.</p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Enter Company Name"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchEmployees()}
          className="flex-1 rounded-lg border border-border-low bg-card px-4 py-2 text-sm outline-none transition focus:border-foreground/30"
        />
        <button
          onClick={fetchEmployees}
          disabled={isLoading || !companyName.trim()}
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-bold text-background transition hover:opacity-90 disabled:opacity-40"
        >
          {isLoading ? "Loading..." : "Refresh List"}
        </button>
      </div>

      {error && <p className="text-xs text-amber-600 font-medium">{error}</p>}

      <div className="overflow-x-auto min-h-[100px]">
        {employees.length > 0 ? (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border-low">
                <th className="pb-2 font-bold uppercase tracking-wider text-muted">Name</th>
                <th className="pb-2 font-bold uppercase tracking-wider text-muted">Address</th>
                <th className="pb-2 font-bold uppercase tracking-wider text-muted text-right">Total</th>
                <th className="pb-2 font-bold uppercase tracking-wider text-muted text-right">Claimed</th>
                <th className="pb-2 font-bold uppercase tracking-wider text-muted text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-low">
              {employees.map((emp) => {
                const isFullyClaimed = emp.data.totalWithdrawn >= emp.data.totalAmount;
                const hasReachedCliff = Number(emp.data.cliffTime) * 1000 < Date.now();
                
                return (
                  <tr key={emp.address} className="group hover:bg-foreground/[0.01]">
                    <td className="py-3 font-medium text-foreground">{emp.data.name}</td>
                    <td className="py-3 font-mono text-muted">{emp.data.beneficiary.slice(0, 4)}...{emp.data.beneficiary.slice(-4)}</td>
                    <td className="py-3 font-medium text-right">{emp.data.totalAmount.toString()}</td>
                    <td className="py-3 text-green-600 font-medium text-right">{emp.data.totalWithdrawn.toString()}</td>
                    <td className="py-3 text-center">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                        isFullyClaimed ? "bg-green-100 text-green-700" : 
                        !hasReachedCliff ? "bg-amber-100 text-amber-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>
                        {isFullyClaimed ? "Complete" : !hasReachedCliff ? "Locked (Cliff)" : "Vesting"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : !isLoading && !error && (
          <div className="py-10 text-center text-muted italic">Enter a company name and click Refresh to see employees.</div>
        )}
      </div>
    </div>
  );
}
