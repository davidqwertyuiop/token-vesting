"use client";
import { useWalletConnection } from "@solana/react-hooks";
import { VestingDashboard } from "./components/dashboard";

export default function Home() {
  const { connectors, connect, disconnect, wallet, status } =
    useWalletConnection();

  const address = wallet?.account.address.toString();

  return (
    <div className="relative min-h-screen overflow-x-clip bg-bg1 text-foreground">
      <main className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col gap-10 border-x border-border-low px-6 py-16">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.18em] text-muted">
            Solana Vesting App
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Token Vesting Dashboard
          </h1>
          <p className="max-w-3xl text-base leading-relaxed text-muted">
            Create vesting schedules for employees and claim tokens easily.
          </p>
        </header>

        <section className="w-full max-w-3xl space-y-4 rounded-2xl border border-border-low bg-card p-6 shadow-[0_20px_80px_-50px_rgba(0,0,0,0.35)]">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-lg font-semibold">Wallet connection</p>
              <p className="text-sm text-muted">
                Connect your wallet to interact with the vesting program.
              </p>
            </div>
            <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground/80">
              {status === "connected" ? "Connected" : "Not connected"}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {connectors.length > 0 ? (
              connectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => connect(connector.id)}
                  disabled={status === "connecting"}
                  className="group flex items-center justify-between rounded-xl border border-border-low bg-card px-4 py-3 text-left text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex flex-col">
                    <span className="text-base">{connector.name}</span>
                    <span className="text-xs text-muted">
                      {status === "connecting"
                        ? "Connecting…"
                        : status === "connected" &&
                          wallet?.connector.id === connector.id
                        ? "Active"
                        : "Tap to connect"}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 rounded-full bg-border-low transition group-hover:bg-primary/80"
                  />
                </button>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border-low p-8 text-center">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">No wallets detected</p>
                  <p className="text-sm text-muted">
                    Please install a Solana wallet like{" "}
                    <a
                      href="https://phantom.app/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Phantom
                    </a>{" "}
                    or{" "}
                    <a
                      href="https://solflare.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Solflare
                    </a>
                  </p>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
                >
                  Refresh Page
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-border-low pt-4 text-sm">
            <span className="rounded-lg border border-border-low bg-cream px-3 py-2 font-mono text-xs">
              {address ?? "No wallet connected"}
            </span>
            <button
              onClick={() => disconnect()}
              disabled={status !== "connected"}
              className="inline-flex items-center gap-2 rounded-lg border border-border-low bg-card px-3 py-2 font-medium transition hover:-translate-y-0.5 hover:shadow-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              Disconnect
            </button>
          </div>
        </section>

        {/* Vesting Dashboard Section */}
        {status === "connected" ? (
             <VestingDashboard />
        ) : (
            <div className="text-center text-muted py-10">
                Please connect your wallet to continue.
            </div>
        )}
      </main>
    </div>
  );
}

