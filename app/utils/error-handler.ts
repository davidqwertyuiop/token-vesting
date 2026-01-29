export const formatSolanaError = (err: any): string => {
  const message = (err.message || "").toLowerCase();
  const cause = (err.cause?.message || "").toLowerCase();
  const logs = err.transactionPlanResult?.simulationResponse?.logs || [];
  const logString = logs.join("\n").toLowerCase();
  
  // Log for debugging
  console.error("ERROR DETAILS:", {
    name: err.name,
    message: err.message,
    cause: err.cause,
    logs: logs
  });

  // Anchor program errors
  if (logString.includes("0x1770")) {
    return "⏰ Cliff period not reached yet. You must wait until the cliff date to claim tokens.";
  }
  if (logString.includes("0x1773")) {
    return "✓ All available tokens have been claimed. Check back later as more tokens vest.";
  }
  if (logString.includes("0x7d1")) {
    return "🔒 Permission denied. You don't own this vesting account.";
  }
  if (logString.includes("0x7d6") || logString.includes("already in use")) {
    return "⚠️ This account already exists. Try a different company name or employee.";
  }

  // Insufficient funds
  if (logString.includes("insufficient funds") || logString.includes("0x1") || message.includes("insufficient")) {
    return "💰 Insufficient SOL for transaction fees. Get devnet SOL from: https://faucet.solana.com";
  }

  // Account not found
  if (message.includes("accountnotfound") || message.includes("does not exist") || message.includes("not found")) {
    return "❌ Account not found. Double-check the company name (case-sensitive) and ensure it was created.";
  }

  // User rejected
  if (cause.includes("user rejected") || message.includes("rejected") || message.includes("cancelled")) {
    return "🚫 Transaction cancelled by user.";
  }

  // Network/RPC issues
  if (message.includes("429") || cause.includes("429")) {
    return "🌐 Network rate limit. Try again in 30 seconds or switch RPC endpoint.";
  }
  if (message.includes("fetch") || message.includes("network") || cause.includes("fetch")) {
    return "📡 Network error. Check your internet connection or try a different RPC.";
  }

  // Transaction simulation failed
  if (message.includes("simulation failed") || message.includes("transaction plan failed")) {
    const detail = logs.length > 0 ? `\n\nLogs: ${logs.slice(-2).join(" | ")}` : "";
    return `⚠️ Transaction would fail. Common causes:\n• Wrong token mint address\n• Account already exists\n• Insufficient token balance in treasury${detail}`;
  }

  // Generic fallback
  const shortMsg = err.message?.slice(0, 150) || "Unknown error";
  return `❌ Error: ${shortMsg}${err.cause ? `\n\nCause: ${err.cause.message}` : ""}`;
};
