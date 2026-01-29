
import * as anchor from '@coral-xyz/anchor';
import { BankrunProvider} from "anchor-bankrun";
import { Keypair, PublicKey} from "@solana/web3.js";
import { BanksClient, ProgramTestContext, startAnchor, } from 'solana-bankrun';

import  IDL  from "./fixtures/vesting.json";
import { describe, before, it } from 'mocha';
import { Program } from "@coral-xyz/anchor";
import { program, SYSTEM_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/native/system';
import { Vesting } from '../target/types/vesting';
import { createMint } from 'spl-token-bankrun';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

let vestingAccountKey: PublicKey;

describe("Vesting Smart Contract Tests", () => {
   const companyName = 'company name'; //for testing Purposes
   let beneficiary: Keypair;
   let context: ProgramTestContext;
   let provider: BankrunProvider;
   let program: Program<Vesting>;
   let banksClient: BanksClient;
   let employer: Keypair;
   let mint: PublicKey; 
   let beneficiaryProvider: BankrunProvider;
   let program2: Program<Vesting>;
   let treasuryTokenAccountKey: PublicKey;
   let employeeAccount: PublicKey;

    before(async () => {
    beneficiary = new anchor.web3.Keypair();

    context = await startAnchor('.',
      [{name: 'vesting', programId: new PublicKey(IDL.address)}],
      [{
         address: beneficiary.publicKey,
         info: {
            lamports: 1_000_000_000,
            data: Buffer.alloc(0),
            owner: SYSTEM_PROGRAM_ID,
            executable: false,
         },
         //Array to show which extra is to be deployed to the account

      }]
    );
    provider = new BankrunProvider(context);

    anchor.setProvider(provider);

    program = new Program<Vesting>(IDL as Vesting, provider)
    
    banksClient = context.banksClient;

   employer = provider.wallet.payer;

   mint = await createMint(banksClient, employer, employer.publicKey, null, 2 )

   beneficiaryProvider = new BankrunProvider(context);
   beneficiaryProvider.wallet = new NodeWallet(beneficiary);

   program2 = new Program<Vesting>(IDL as Vesting, beneficiaryProvider);

   //Derive PDAs
   [vestingAccountKey]= PublicKey.findProgramAddressSync(
      [Buffer.from(companyName)],
      program.programId
   );

   [treasuryTokenAccountKey] = PublicKey.findProgramAddressSync(
      [Buffer.from("vesting_treasury"), Buffer.from(companyName)],
      program.programId
   );

   [employeeAccount] = PublicKey.findProgramAddressSync(
      [
         Buffer.from("emplyee_vesting"),  
         beneficiary.publicKey.toBuffer(), 
         vestingAccountKey.toBuffer()
      ],
      program.programId
   );


   })

   it("Should create a vesting account", async () => {
 const tx = await program.methods.createVestingAccount(companyName).accounts({
   signer: employer.publicKey,
   mint, 
   tokenProgram: TOKEN_PROGRAM_ID,
 }).rpc({commitment: 'confirmed'});
   const vestingAccountData = 
   await program.account.vestingAccount.fetch(
      vestingAccountKey, 
      'confirmed'
   );
  

   console.log("Vesting Account Data:", vestingAccountData, null, 2);
   console.log("Transaction signature:", tx);

});
});
