# TON Fusion+ Escrow Contracts

This directory contains the TON smart contracts for the 1inch Fusion+ cross-chain swap implementation.

## Project structure

-   `contracts` - source code of all the smart contracts of the project and their dependencies.
    - `ton_source_escrow.fc` - Source chain escrow for locking maker's assets
    - `ton_destination_escrow.fc` - Destination chain escrow for resolver's assets
-   `wrappers` - wrapper classes (implementing `Contract` from ton-core) for the contracts, including any [de]serialization primitives and compilation functions.
-   `tests` - tests for the contracts.
-   `scripts` - scripts used by the project, mainly the deployment scripts.

## How to use

### Build

`npx blueprint build` or `yarn blueprint build`

### Test

`npx blueprint test` or `yarn blueprint test`

### Deploy or run another script

`npx blueprint run` or `yarn blueprint run`

You can also use specific scripts:
- Deploy source escrow: `npx blueprint run deployTonSourceEscrow`
- Deploy destination escrow: `npx blueprint run deployTonDestinationEscrow`
- Get compiled code: `npx blueprint run getCompiledCode`

### Get Compiled Code for Resolver

To use these contracts with the resolver, you need the base64 encoded compiled code:

```bash
npx blueprint run getCompiledCode
```

This will output base64 strings to add to your resolver's `.env` file:
- `TON_SOURCE_ESCROW_TEMPLATE=<base64_code>`
- `TON_DESTINATION_ESCROW_TEMPLATE=<base64_code>`

### Add a new contract

`npx blueprint create ContractName` or `yarn blueprint create ContractName`

## Contract Architecture

### Source Escrow
- Locks maker's assets with hashlock and timelock
- Resolver can withdraw with correct secret after finality period
- Maker can refund after timeout

### Destination Escrow  
- Locks resolver's assets for maker
- Maker can withdraw with secret (revealed by resolver)
- Resolver can refund after timeout with exclusive period

## Integration with Resolver

1. Compile contracts: `npx blueprint build`
2. Get base64 code: `npx blueprint run getCompiledCode`
3. Add the base64 strings to resolver's `.env`
4. The resolver's TON adapter will use these compiled contracts for deployment
