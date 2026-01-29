use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token_interface::*};

#[cfg(test)]
mod tests;

declare_id!("FyoRGcMWzvNwuRSLFnecpVGG1L1R5YkHZ21v46ddvv32");

#[program]
pub mod vesting {
    use super::*;

    pub fn create_vesting_account(
        ctx: Context<CreateVestingAccount>,
        company_name: String,
    ) -> Result<()> {
        (*ctx.accounts.vesting_account) = VestingAccount {
            //Dereferenced because you want to work with the action data and modify
            owner: ctx.accounts.signer.key(),
            mint: ctx.accounts.mint.key(),
            treasury_token_account: ctx.accounts.treasury_token_account.key(),
            company_name,
            treasury_bump: ctx.bumps.treasury_token_account,
            bump: ctx.bumps.vesting_account,
        };
        Ok(())
    }

    pub fn create_employee_account(
        ctx: Context<CreateEmployeeAccount>,
        start_time: i64,
        end_time: i64,
        cliff_time: i64,
        total_amount: u64,
        total_withdrawn: u64,
    ) -> Result<()> {
        (*ctx.accounts.employee_account) = EmployeeAccount {
            beneficiary: ctx.accounts.beneficiary.key(),
            start_time,
            end_time,
            cliff_time,
            vesting_account: ctx.accounts.vesting_account.key(),
            total_amount,
            total_withdrawn,
            bump: ctx.bumps.employee_account,
        };
        Ok(())
    }
//Differnce between referencing and dereferencing
    1. dereferencing is used when you want to manipulate the data stored in the data operation
    2. Referencing is used when you want to access the data stored in the data operation/borrowing
    pub fn claim_tokens(ctx: Context<ClaimTokens>, company_name: String) -> Result<()> {
       let employee_account =&mut ctx.accounts.employee_account;
       let now = Clock::get()?.unix_timestamp; // to get the current time of the token transsaction
    to check if the current time is less than the cliff time else no token 
    can be claimed 

    if now < employee_account.cliff_time {
        return Err(ErrorCode::CliffNotReached.into());
    }
       
        let time_since_start = now.saturating_sub(employee_account.start_time);
        let total_vesting_time = employee_account.end_time.saturating_sub(employee_account.start_time);
        let amount_to_release = (employee_account.total_amount * time_since_start) / total_vesting_time;
        //For Underflow error use saturated sub to not subtract lesser than 0 

            if total_vesting_time == 0 {
            return Err(ErrorCode::InvalidVestingPeriod.into());
        }
          let _vested_amount = if now >= employee_account.end_time {
            employee_account.total_amount
        } else {
            match employee_account
                .total_amount
                .checked_mul(time_since_start as u64)
            {
                Some(product) => product / total_vesting_time as u64,
                None => return Err(ErrorCode::CalculationOverflow.into()),
            }
        }; //to check for overflow and underflow errors
           let claimable_amount = vested_amount.saturating_sub(employee_account.total_withdrawn);
        if claimable_amount == 0 {
            return Err(ErrorCode::NoTokensToClaim.into());
        }
        Now we make a cross program identification to transfer the tokens from the treasury account to the employee account
        cpi call basically
          //Transfer
        let transfer_cpi_accounts = TransferChecked {
            from: ctx.accounts.treasury_token_account.to_account_info(),
            to: ctx.accounts.employee_token_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            authority: ctx.accounts.vesting_account.to_account_info(),
        };
        let transfer_cpi_program = ctx.accounts.token_program.to_account_info();

        let signer_seeds: &[&[&[u8]]] = &[&[
            b"vesting_treasury",
            ctx.accounts.vesting_account.company_name.as_ref(),
            &[ctx.accounts.vesting_account.treasury_bump],
        ]];
        let cpi_context =
            CpiContext::new(transfer_cpi_program, transfer_cpi_accounts).with_signer(signer_seeds);
        let decimals = ctx.accounts.mint.decimals;
        token_interface::transfer_checked(cpi_context, claimable_amount, decimals);
       //Transferring from one account to another one 
        Ok(())
    }
}

//Vesting Account
#[derive(Accounts)]
#[instruction(company_name: String)]
pub struct CreateVestingAccount<'info> {
    #[account(mut)]
    pub signer: Signer<'info>, //To be paying rent, so it changes
    #[account(
        init,
        payer = signer,
        seeds = [company_name.as_ref()],
        space = 8 + VestingAccount::INIT_SPACE,
        bump
    )]
    pub vesting_account: Account<'info, VestingAccount>,
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        token::mint = mint,
        token::authority = treasury_token_account,
        payer = signer,
        seeds = [ b"vesting_treasury", company_name.as_bytes(),],
        bump
    )]
    pub treasury_token_account: InterfaceAccount<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

//Employee Account
#[derive(Accounts)]
pub struct CreateEmployeeAccount<'info> {
    #[account(mut)]
    //The owner is not the employee but the employer who has access to the account
    pub owner: Signer<'info>, //To be paying rent, so it changes
    pub beneficiary: SystemAccount<'info>, //To be paying rent, so it changes

    #[account(has_one = owner)]
    pub vesting_account: Account<'info, VestingAccount>,

    #[account(
        init,
        space = 8 + EmployeeAccount::INIT_SPACE,
        payer = owner,
        seeds = [ b"emplyee_vesting", 
        beneficiary.key().as_ref(), vesting_account.key().as_ref()],
        bump
    )]
    pub employee_account: Account<'info, EmployeeAccount>,
    pub system_program: Program<'info, System>,
}

//Claim Tokens
#[derive(Accounts)]
#[instruction(company_name: String)]
pub struct ClaimTokens<'info> {
    #[account(mut)]
    pub beneficiary: Signer<'info>, //To be paying rent, so it changes
    #[account(
        mut,
        seeds = [ b"emplyee_vesting", 
        beneficiary.key().as_ref(), vesting_account.key().as_ref()],
        bump = employee_account.bump,
        has_one = beneficiary,
        has_one = vesting_account,
    )]
    pub employee_account: Account<'info, EmployeeAccount>,

    //Ensure Vesting Account is passed
    #[account(
        mut,
        seeds = [company_name.as_ref()],
        bump = vesting_account.bump,
        has_one = treasury_token_account,
        has_one = mint,
    )]
    pub vesting_account: Account<'info, VestingAccount>,
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub treasury_token_account: InterfaceAccount<'info, TokenAccount>,

    //Associate token account, for some users who have their tokens initialized
    //using init if needed
    #[account(
        init,
        payer = beneficiary,
        associated_token::mint = mint,
        associated_token::authority = beneficiary,
        associated_token::token_program = token_program,
    )]
    pub employee_token_account: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

//On solana all accounts are stateless, so now we are creating a struct to store the data
#[account]
#[derive(InitSpace)]
pub struct VestingAccount {
    pub owner: Pubkey, //whoevver has permissions for vesting
    //distributing spl  tokens
    pub mint: Pubkey, //TO store the SpL tokens
    //To store employer's SPL tokens that they used to add another employee
    //and recieving vested tokens
    pub treasury_token_account: Pubkey,
    #[max_len(50)]
    pub company_name: String, //To store the company name
    pub treasury_bump: u8,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct EmployeeAccount {
    pub beneficiary: Pubkey,     //whoever is recieving the tokens
    pub start_time: i64,         //when the vesting starts
    pub end_time: i64,           //when the vesting ends
    pub cliff_time: i64, //How long the employee has to wait before they can withdraw any tokens
    pub vesting_account: Pubkey, //To store the vesting account
    pub total_amount: u64, //Total amount of tokens to be vested
    pub total_withdrawn: u64, //Amount of tokens already released
    pub bump: u8,
}


#[error_code]
pub enum ErrorCode {
    #[msg("Claim not available yet")]
    ClaimNotAvailableYet,
    #[msg("Invalid vesting period")]
    InvalidVestingPeriod,
}


Tyoes of errors : 
Underflow and overflow errors 
Underflow errors are errors that occur when a calculation occurs less than the minimum value of the data type
Overflow errors are errors that occur when a calculation occurs greater than the maximum value of the data type





use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token_interface::*};

declare_id!("EfARhmvRtpzbuGCBHBtnFxLtYFbH2FnBcKKmKVg31Ucs");

#[program]
pub mod vesting {
    use anchor_spl::token_interface;

    use super::*;

    pub fn create_vesting_account(
        ctx: Context<CreateVestingAccount>,
        company_name: String,
    ) -> Result<()> {
        (*ctx.accounts.vesting_account) = VestingAccount {
            owner: ctx.accounts.signer.key(),
            mint: ctx.accounts.mint.key(),
            treasury_token_account: ctx.accounts.treasury_token_account.key(),
            company_name,
            treasury_bump: ctx.bumps.treasury_token_account,
            bump: ctx.bumps.vesting_account,
        };
        Ok(())
    }

    pub fn create_employee_account(
        ctx: Context<CreateEmployeeAccount>,
        start_time: i64,
        end_time: i64,
        cliff_time: i64,
        total_amount: u64,
        total_withdrawn: u64,
    ) -> Result<()> {
        (*ctx.accounts.employee_account) = EmployeeAccount {
            beneficiary: ctx.accounts.beneficiary.key(),
            start_time,
            end_time,
            cliff_time,
            vesting_account: ctx.accounts.vesting_account.key(),
            total_amount,
            total_withdrawn,
            bump: ctx.bumps.employee_account,
        };
        Ok(())
    }

    pub fn claim_tokens(ctx: Context<ClaimTokens>, _company_name: String) -> Result<()> {
        let employee_account = &mut ctx.accounts.employee_account;

        let now = Clock::get()?.unix_timestamp;
        if now < employee_account.cliff_time {
            return Err(ErrorCode::ClaimNotAvailableYet.into());
        }

        let time_since_start = now.saturating_sub(employee_account.start_time);
        let total_vesting_time = employee_account
            .end_time
            .saturating_sub(employee_account.start_time);

        if total_vesting_time == 0 {
            return Err(ErrorCode::InvalidVestingPeriod.into());
        }

        let vested_amount = if now >= employee_account.end_time {
            employee_account.total_amount
        } else {
            match employee_account
                .total_amount
                .checked_mul(time_since_start as u64)
            {
                Some(product) => product / total_vesting_time as u64,
                None => return Err(ErrorCode::CalculationOverflow.into()),
            }
        };

        let claimable_amount = vested_amount.saturating_sub(employee_account.total_withdrawn);
        if claimable_amount == 0 {
            return Err(ErrorCode::NoTokensToClaim.into());
        }

        //Transfer
        let transfer_cpi_accounts = TransferChecked {
            from: ctx.accounts.treasury_token_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.employee_token_account.to_account_info(),
            authority: ctx.accounts.treasury_token_account.to_account_info(),
        };
        let transfer_cpi_program = ctx.accounts.token_program.to_account_info();

        let signer_seeds: &[&[&[u8]]] = &[&[
            b"vesting_treasury",
            ctx.accounts.vesting_account.company_name.as_ref(),
            &[ctx.accounts.vesting_account.treasury_bump],
        ]];
        let cpi_context =
            CpiContext::new(transfer_cpi_program, transfer_cpi_accounts).with_signer(signer_seeds);
        let decimals = ctx.accounts.mint.decimals;
        token_interface::transfer_checked(cpi_context, claimable_amount, decimals)?;

        employee_account.total_withdrawn += claimable_amount;

        Ok(())
    }
}

//Vesting Account
#[derive(Accounts)]
#[instruction(company_name: String)]
pub struct CreateVestingAccount<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        init,
        payer = signer,
        seeds = [company_name.as_ref()],
        space = 8 + VestingAccount::INIT_SPACE,
        bump
    )]
    pub vesting_account: Account<'info, VestingAccount>,
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        token::mint = mint,
        token::authority = treasury_token_account,
        payer = signer,
        seeds = [ b"vesting_treasury", company_name.as_bytes(),],
        bump
    )]
    pub treasury_token_account: InterfaceAccount<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

//Employee Account
#[derive(Accounts)]
pub struct CreateEmployeeAccount<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    pub beneficiary: SystemAccount<'info>,

    #[account(has_one = owner)]
    pub vesting_account: Account<'info, VestingAccount>,

    #[account(
        init,
        space = 8 + EmployeeAccount::INIT_SPACE,
        payer = owner,
        seeds = [ b"emplyee_vesting", 
        beneficiary.key().as_ref(), vesting_account.key().as_ref()],
        bump
    )]
    pub employee_account: Account<'info, EmployeeAccount>,
    pub system_program: Program<'info, System>,
}

//Claim Tokens
#[derive(Accounts)]
#[instruction(company_name: String)]
pub struct ClaimTokens<'info> {
    #[account(mut)]
    pub beneficiary: Signer<'info>,
    #[account(
        mut,
        seeds = [ b"emplyee_vesting", 
        beneficiary.key().as_ref(), vesting_account.key().as_ref()],
        bump = employee_account.bump,
        has_one = beneficiary,
        has_one = vesting_account,
    )]
    pub employee_account: Account<'info, EmployeeAccount>,

    //Ensure Vesting Account is passed
    #[account(
        mut,
        seeds = [company_name.as_ref()],
        bump = vesting_account.bump,
        has_one = treasury_token_account,
        has_one = mint,
    )]
    pub vesting_account: Account<'info, VestingAccount>,
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub treasury_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = beneficiary,
        associated_token::mint = mint,
        associated_token::authority = beneficiary,
        associated_token::token_program = token_program,
    )]
    pub employee_token_account: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct VestingAccount {
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub treasury_token_account: Pubkey,
    #[max_len(50)]
    pub company_name: String,
    pub treasury_bump: u8,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct EmployeeAccount {
    pub beneficiary: Pubkey,
    pub start_time: i64,
    pub end_time: i64,
    pub cliff_time: i64,
    pub vesting_account: Pubkey,
    pub total_amount: u64,
    pub total_withdrawn: u64,
    pub bump: u8,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Claim not available yet")]
    ClaimNotAvailableYet,
    #[msg("Invalid vesting period")]
    InvalidVestingPeriod,
    #[msg("Calculation overflow")]
    CalculationOverflow,
    #[msg("No tokens to claim")]
    NoTokensToClaim,
}
