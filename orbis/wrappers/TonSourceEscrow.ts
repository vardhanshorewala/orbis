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
    secretHash: string;
    timelockDuration: number;
    finalityTimelock: number;
    merkleRoot: string;
};

export function tonSourceEscrowConfigToCell(config: TonSourceEscrowConfig): Cell {
    return beginCell()
        .storeAddress(config.makerAddress)
        .storeAddress(config.resolverAddress)
        .storeAddress(config.targetAddress)
        .storeAddress(config.refundAddress)
        .storeUint(config.assetType, 8)
        .storeAddress(config.jettonMaster)
        .storeCoins(config.amount)
        .storeCoins(config.safetyDeposit)
        .storeBuffer(Buffer.from(config.secretHash.replace('0x', ''), 'hex'))
        .storeUint(config.timelockDuration, 32)
        .storeUint(config.finalityTimelock, 32)
        .storeBuffer(Buffer.from(config.merkleRoot.replace('0x', ''), 'hex'))
        .endCell();
}

export const Opcodes = {
    CREATE_ESCROW: 0x1,
    WITHDRAW: 0x2,
    REFUND: 0x3,
    UPDATE_STATUS: 0x4,
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
            body: beginCell()
                .storeUint(Opcodes.CREATE_ESCROW, 32)
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
            merkleProof?: Buffer;
            withdrawAmount?: bigint;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.WITHDRAW, 32)
                .storeUint(0, 64) // query_id
                .storeBuffer(Buffer.from(opts.secret.replace('0x', ''), 'hex'))
                .storeUint(opts.withdrawAmount || 0n, 64)
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
            amount: result.stack.readBigNumber(),
            safetyDeposit: result.stack.readBigNumber(),
            secretHash: result.stack.readBuffer(),
            timelockDuration: result.stack.readNumber(),
            finalityTimelock: result.stack.readNumber(),
            merkleRoot: result.stack.readBuffer(),
        };
    }

    async canWithdraw(
        provider: ContractProvider,
        secret: string,
        merkleProof?: Buffer,
        withdrawAmount?: bigint
    ): Promise<boolean> {
        try {
            const result = await provider.get('can_withdraw', [
                { type: 'slice', cell: beginCell().storeBuffer(Buffer.from(secret.replace('0x', ''), 'hex')).endCell() },
                { type: 'slice', cell: beginCell().storeBuffer(merkleProof || Buffer.alloc(0)).endCell() },
                { type: 'int', value: withdrawAmount || 0n },
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