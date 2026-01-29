export function TesterGuide() {
  const publicMint = "2TUrCthPTKoAQBh2vG933U2sKAjC7MQih9uxcA2SeepX";

  return (
    <div className="space-y-6 rounded-2xl border border-border-low bg-card p-6 shadow-sm overflow-hidden text-sm">
      <div className="space-y-2">
        <h3 className="text-xl font-bold tracking-tight">How to Test this DApp</h3>
        <p className="text-muted leading-relaxed">
          Follow these steps to experience the full token vesting lifecycle on the Solana Devnet.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-3 rounded-xl bg-foreground/5 p-4 border border-border-low">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background text-xs font-bold">1</span>
            <h4 className="font-semibold">Setup Wallet</h4>
          </div>
          <p className="text-muted text-xs leading-relaxed">
            Switch your Phantom/Solflare wallet to <strong>Devnet</strong> in settings. Click the <strong>Airdrop</strong> button above to get test SOL.
          </p>
        </div>

        <div className="space-y-3 rounded-xl bg-foreground/5 p-4 border border-border-low">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background text-xs font-bold">2</span>
            <h4 className="font-semibold">Company Setup</h4>
          </div>
          <div className="space-y-2">
            <p className="text-muted text-xs">Use our official Test Mint Address in the Admin tab:</p>
            <code className="block bg-background p-2 rounded border border-border-low text-[10px] break-all font-mono select-all cursor-copy hover:bg-foreground/5 transition">
              {publicMint}
            </code>
          </div>
        </div>

        <div className="space-y-3 rounded-xl bg-foreground/5 p-4 border border-border-low">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background text-xs font-bold">3</span>
            <h4 className="font-semibold">Fund Treasury</h4>
          </div>
          <p className="text-muted text-xs leading-relaxed">
            After creating a company, copy the <strong>Treasury Address</strong> and send some test tokens to it from your wallet.
          </p>
        </div>

        <div className="space-y-3 rounded-xl bg-foreground/5 p-4 border border-border-low">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background text-xs font-bold">4</span>
            <h4 className="font-semibold">Add Employees</h4>
          </div>
          <p className="text-muted text-xs leading-relaxed">
            Add one or more beneficiaries in the Employee tab. Set the <strong>Start Date</strong> in the past for instant claiming!
          </p>
        </div>

      </div>

      <div className="rounded-xl bg-amber-50 p-4 border border-amber-200">
        <p className="text-amber-800 text-xs font-medium">
          <strong>Note:</strong> Since this is a public demo, every company name must be unique on the blockchain! If "Deepmind" is taken, try "Deepmind-1".
        </p>
      </div>
    </div>
  );
}
