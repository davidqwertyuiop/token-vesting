"use client";

export function CreateMint() {
  const TEST_MINT = "FYJessLHYk4cwFWPEgUMkUtVqrxrwboYaNw1XoHukLmQ";

  return (
    <div className="space-y-4 rounded-2xl border border-border-low bg-card p-6 shadow-sm">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Test Token Mint</h3>
        <p className="text-sm text-muted">Use this pre-created devnet token mint for testing the vesting program.</p>
      </div>

      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <p className="text-xs font-bold uppercase text-green-700 mb-2">Devnet Test Mint Address</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-gray-900 text-green-400 px-3 py-2 rounded text-xs break-all font-mono">{TEST_MINT}</code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(TEST_MINT);
              alert("Mint address copied!");
            }}
            className="px-3 py-2 text-xs font-bold bg-green-600 text-white rounded hover:bg-green-700 transition"
          >
            Copy
          </button>
        </div>
        <p className="text-xs text-green-600 mt-2">✓ Copy this address to use in "Create Vesting Account" below</p>
      </div>
    </div>
  );
}
