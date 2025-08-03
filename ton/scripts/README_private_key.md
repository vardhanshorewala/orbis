# Escrow Interaction Script with Private Key/Mnemonic

This script allows you to interact with TON escrow contracts without requiring manual transaction approval each time. Instead, it uses your private key or mnemonic phrase to automatically sign transactions.

## Usage

### Option 1: Using Environment Variable (Recommended for automation)

Set your mnemonic phrase as an environment variable:

```bash
export WALLET_MNEMONIC="your 24 word mnemonic phrase goes here"
```

Then run the script:

```bash
npx blueprint run interactWithEscrowPrivateKey
```

### Option 2: Manual Input

If you don't set the environment variable, the script will prompt you to enter your 24-word mnemonic phrase when you run it:

```bash
npx blueprint run interactWithEscrowPrivateKey
```

### With Contract Address

You can also pass the contract address as an argument:

```bash
npx blueprint run interactWithEscrowPrivateKey EQC...your_contract_address
```

## Features

The script provides the same functionality as the original `interactWithEscrow.ts` but with automatic transaction signing:

### For Source Escrow:
- Get Escrow Details
- Check Can Withdraw
- Check Can Refund
- Send Lock (automatically signed)
- Send Withdraw (automatically signed)
- Send Refund (automatically signed)

### For Destination Escrow:
- Get Escrow Details
- Check Can Withdraw
- Check Can Refund
- Check In Exclusive Period
- Send Lock (automatically signed)
- Send Withdraw (automatically signed)
- Send Refund (automatically signed)

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit your mnemonic phrase to version control**
2. **Use environment variables for automation scripts**
3. **Make sure your mnemonic phrase is for a testnet wallet when testing**
4. **Consider using a dedicated wallet for testing/automation**
5. **Always verify the contract address before interacting**

## Requirements

- Your wallet must have sufficient TON balance to pay for transaction fees
- The mnemonic phrase must be exactly 24 words
- The script creates a V4 wallet contract from your mnemonic

## Example Usage

```bash
# Set up your mnemonic (use your actual mnemonic)
export WALLET_MNEMONIC="word1 word2 word3 ... word24"

# Run the script
npx blueprint run interactWithEscrowPrivateKey

# Follow the prompts to:
# 1. Choose contract type (Source or Destination Escrow)
# 2. Select action to perform
# 3. Enter any required parameters (like secrets)
```

The script will automatically sign and send transactions using your private key, eliminating the need for manual approval each time. 