"use client";

import { useState, useCallback } from "react";
import { useWalletConnection } from "@solana/react-hooks";
import { getProgramDerivedAddress, getUtf8Encoder } from "@solana/kit";
import { VESTING_PROGRAM_ADDRESS, decodeEmployeeAccount, type EmployeeAccount } from "../generated/vesting";
import { rpc } from "../config/solana";

export function ClaimTracker() {
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
      const [vestingAccountAddress] = await getProgramDerivedAddress({
        programAddress: VESTING_PROGRAM_ADDRESS,
        seeds: [getUtf8Encoder().encode(trimmed)],
      });

      const response = await rpc.getProgramAccounts(VESTING_PROGRAM_ADDRESS, {
        filters: [
          { memcmp: { offset: 64n, bytes: vestingAccountAddress as any, encoding: 'base58' } }
        ],
        encoding: 'base64'
      }).send();

      const rawAccounts = (response as any).value || response;

      const decoded = (rawAccounts as any[]).map(acc => {
        try {
          return {
            address: acc.pubkey,
            data: decodeEmployeeAccount(acc.account as any).data
          };
        } catch (e) {
          return null;
        }
      }).filter(item => item !== null) as { address: string; data: EmployeeAccount }[];

      decoded.sort((a, b) => a.data.name.localeCompare(b.data.name));

      setEmployees(decoded);
      if (decoded.length === 0) setError("No employees found for this company.");
    } catch (err: any) {
      console.error("Fetch failed:", err);
      setError("Could not load employee list. Check the company name.");
    } finally {
      setIsLoading(false);
    }
  }, [companyName]);

  const calculateClaimRate = (emp: { data: EmployeeAccount }) => {
    const claimed = Number(emp.data.totalWithdrawn);
    const total = Number(emp.data.totalAmount);
    return total > 0 ? Math.round((claimed / total) * 100) : 0;
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border-low bg-card p-6 shadow-sm">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Claim Tracker</h3>
        <p className="text-sm text-muted">View all employees and their claim status (Admin view).</p>
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
          {isLoading ? "Loading..." : "Load Employees"}
        </button>
      </div>

      {error && <p className="text-xs text-amber-600 font-medium">{error}</p>}

      <div className="overflow-x-auto min-h-[100px]">
        {employees.length > 0 ? (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border-low">
                <th className="pb-2 font-bold uppercase text-muted">Name</th>
                <th className="pb-2 font-bold uppercase text-muted">Address</th>
                <th className="pb-2 font-bold uppercase text-muted text-right">Total</th>
                <th className="pb-2 font-bold uppercase text-muted text-right">Claimed</th>
                <th className="pb-2 font-bold uppercase text-muted text-center">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-low">
              {employees.map((emp) => {
                const claimRate = calculateClaimRate(emp);
                const isFullyClaimed = emp.data.totalWithdrawn >= emp.data.totalAmount;
                
                return (
                  <tr key={emp.address} className="hover:bg-foreground/[0.01]">
                    <td className="py-3 font-medium">{emp.data.name}</td>
                    <td className="py-3 font-mono text-muted">{emp.data.beneficiary.slice(0, 4)}...{emp.data.beneficiary.slice(-4)}</td>
                    <td className="py-3 text-right">{emp.data.totalAmount.toString()}</td>
                    <td className="py-3 text-green-600 font-medium text-right">{emp.data.totalWithdrawn.toString()}</td>
                    <td className="py-3 text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${isFullyClaimed ? 'bg-green-600' : 'bg-blue-600'}`}
                            style={{ width: `${claimRate}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold">{claimRate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : !isLoading && !error && (
          <div className="py-10 text-center text-muted italic">Enter a company name and click Load to see employees.</div>
        )}
      </div>
    </div>
  );
}
