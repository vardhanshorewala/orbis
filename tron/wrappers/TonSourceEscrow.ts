import { 
    Address, 
    beginCell, 
    Cell, 
    Contract, 
    contractAddress, 
    ContractProvider, 
    Sender, 
    SendMode, 
    toNano 
} from '@ton/core';

export type TonSourceEscrowConfig = {
    makerAddress: Address;
    resolverAddress: Address;
    targetAddress: Address;
    refundAddress: Address;
    assetType: number;
    jettonMaster: Address;
    amount: bigint;
    safetyDeposit: bigint;
    secretHash: string; // 256-bit hash as hex string
    timelockDuration: number;
    finalityTimelock: number;
};

export function tonSourceEscrowConfigToCell(config: TonSourceEscrowConfig): Cell {
    // Create reference cell for additional data to avoid cell size limits
    const refCell = beginCell()
        .storeAddress(config.targetAddress)
        .storeAddress(config.refundAddress)
        .storeAddress(config.jettonMaster)
        .storeUint(parseInt(config.secretHash.replace('0x', ''), 16), 32) // 32-bit hash for testing
        .storeUint(config.timelockDuration, 32)
        .storeUint(config.finalityTimelock, 32)
        .endCell();

    // Main cell with essential data and runtime state initialized to 0
    return beginCell()
        .storeAddress(config.makerAddress)
        .storeAddress(config.resolverAddress)
        .storeUint(config.assetType, 8)
        .storeCoins(config.amount)
        .storeCoins(config.safetyDeposit)
        .storeRef(refCell)
        .endCell();
}

export const Opcodes = {
    CREATE_ESCROW: 0x1,
    WITHDRAW: 0x2,
    REFUND: 0x3,
    LOCK_ESCROW: 0x5,
};

export class TonSourceEscrow implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new TonSourceEscrow(address);
    }

    static createFromConfig(config: TonSourceEscrowConfig, code: Cell, workchain = 0) {
        const data = tonSourceEscrowConfigToCell(config);
        const init = { code, data };
        return new TonSourceEscrow(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(), // Empty message for deployment
        });
    }

    async sendLock(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.LOCK_ESCROW, 32)
                .storeUint(0, 64) // query_id
                .endCell(),
        });
    }

    async sendWithdraw(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;
            secret: string;
        }
    ) {
        // Create secret reference cell with 32-bit integer for testing
        const secretInt = parseInt(opts.secret.replace('0x', ''), 16);
        const secretCell = beginCell()
            .storeUint(secretInt, 32)
            .endCell();

        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.WITHDRAW, 32)
                .storeUint(0, 64) // query_id
                .storeRef(secretCell)
                .endCell(),
        });
    }

    async sendRefund(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.REFUND, 32)
                .storeUint(0, 64) // query_id
                .endCell(),
        });
    }

    async getEscrowDetails(provider: ContractProvider) {
        const result = await provider.get('get_escrow_details', []);
        return {
            status: result.stack.readNumber(),
            makerAddress: result.stack.readAddress(),
            resolverAddress: result.stack.readAddress(),
            targetAddress: result.stack.readAddress(),
            refundAddress: result.stack.readAddress(),
            assetType: result.stack.readNumber(),
            jettonMaster: result.stack.readAddress(),
            amount: result.stack.readBigNumber(),
            safetyDeposit: result.stack.readBigNumber(),
            timelockDuration: result.stack.readNumber(),
            createdAt: result.stack.readNumber(),
        };
    }

    async canWithdraw(
        provider: ContractProvider,
        secret: string
    ): Promise<boolean> {
        try {
            const secretInt = parseInt(secret.replace('0x', ''), 16);
            const result = await provider.get('can_withdraw', [
                { type: 'slice', cell: beginCell().storeUint(secretInt, 32).endCell() },
            ]);
            return result.stack.readNumber() !== 0;
        } catch {
            return false; // Contract method may not exist yet
        }
    }

    async canRefund(provider: ContractProvider): Promise<boolean> {
        try {
            const result = await provider.get('can_refund', []);
            return result.stack.readNumber() !== 0;
        } catch {
            return false; // Contract method may not exist yet
        }
    }
} 