"use client";

import { SolanaProvider } from "@solana/react-hooks";
import { PropsWithChildren } from "react";

import { client } from "../config/solana";


export function Providers({ children }: PropsWithChildren) {
  console.log("Providers: Rendering SolanaProvider with client", client);
  return <SolanaProvider client={client}>{children}</SolanaProvider>;
}
