import {
    JsonRpcProvider,
    Wallet,
    TransactionRequest,
    Interface,
    toBigInt,
    toBeHex,
    zeroPadValue,
    solidityPackedKeccak256,
    getAddress,
} from "ethers";

// Minimal ABI definitions for factory and escrow contracts
const ESCROW_FACTORY_ABI = [
    {
        type: "function",
        name: "createDstEscrow",
        inputs: [
            {
                name: "dstImmutables",
                type: "tuple",
                components: [
                    { name: "orderHash", type: "bytes32" },
                    { name: "hashlock", type: "bytes32" },
                    { name: "maker", type: "uint256" },
                    { name: "taker", type: "uint256" },
                    { name: "token", type: "uint256" },
                    { name: "amount", type: "uint256" },
                    { name: "safetyDeposit", type: "uint256" },
                    { name: "timelocks", type: "uint256" },
                    { name: "parameters", type: "bytes" },
                ],
            },
            { name: "srcCancellationTimestamp", type: "uint256" },
        ],
        outputs: [],
        stateMutability: "payable",
    },
    {
        type: "function",
        name: "addressOfEscrowSrc",
        inputs: [
            {
                name: "immutables",
                type: "tuple",
                components: [
                    { name: "orderHash", type: "bytes32" },
                    { name: "hashlock", type: "bytes32" },
                    { name: "maker", type: "uint256" },
                    { name: "taker", type: "uint256" },
                    { name: "token", type: "uint256" },
                    { name: "amount", type: "uint256" },
                    { name: "safetyDeposit", type: "uint256" },
                    { name: "timelocks", type: "uint256" },
                    { name: "parameters", type: "bytes" },
                ],
            },
        ],
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "addressOfEscrowDst",
        inputs: [
            {
                name: "immutables",
                type: "tuple",
                components: [
                    { name: "orderHash", type: "bytes32" },
                    { name: "hashlock", type: "bytes32" },
                    { name: "maker", type: "uint256" },
                    { name: "taker", type: "uint256" },
                    { name: "token", type: "uint256" },
                    { name: "amount", type: "uint256" },
                    { name: "safetyDeposit", type: "uint256" },
                    { name: "timelocks", type: "uint256" },
                    { name: "parameters", type: "bytes" },
                ],
            },
        ],
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "event",
        name: "SrcEscrowCreated",
        inputs: [
            {
                name: "srcImmutables",
                type: "tuple",
                indexed: false,
                components: [
                    { name: "orderHash", type: "bytes32" },
                    { name: "hashlock", type: "bytes32" },
                    { name: "maker", type: "uint256" },
                    { name: "taker", type: "uint256" },
                    { name: "token", type: "uint256" },
                    { name: "amount", type: "uint256" },
                    { name: "safetyDeposit", type: "uint256" },
                    { name: "timelocks", type: "uint256" },
                ],
            },
            {
                name: "dstImmutablesComplement",
                type: "tuple",
                indexed: false,
                components: [
                    { name: "maker", type: "uint256" },
                    { name: "amount", type: "uint256" },
                    { name: "token", type: "uint256" },
                    { name: "safetyDeposit", type: "uint256" },
                    { name: "chainId", type: "uint256" },
                    { name: "parameters", type: "bytes" },
                ],
            },
        ],
    },
    {
        type: "event",
        name: "DstEscrowCreated",
        inputs: [
            { name: "escrow", type: "address", indexed: false },
            { name: "hashlock", type: "bytes32", indexed: false },
            { name: "taker", type: "uint256", indexed: false },
        ],
    },
];

const ESCROW_SRC_ABI = [
    {
        type: "function",
        name: "withdraw",
        inputs: [
            { name: "secret", type: "bytes32" },
            {
                name: "immutables",
                type: "tuple",
                components: [
                    { name: "orderHash", type: "bytes32" },
                    { name: "hashlock", type: "bytes32" },
                    { name: "maker", type: "uint256" },
                    { name: "taker", type: "uint256" },
                    { name: "token", type: "uint256" },
                    { name: "amount", type: "uint256" },
                    { name: "safetyDeposit", type: "uint256" },
                    { name: "timelocks", type: "uint256" },
                    { name: "parameters", type: "bytes" },
                ],
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "withdrawTo",
        inputs: [
            { name: "secret", type: "bytes32" },
            { name: "target", type: "address" },
            {
                name: "immutables",
                type: "tuple",
                components: [
                    { name: "orderHash", type: "bytes32" },
                    { name: "hashlock", type: "bytes32" },
                    { name: "maker", type: "uint256" },
                    { name: "taker", type: "uint256" },
                    { name: "token", type: "uint256" },
                    { name: "amount", type: "uint256" },
                    { name: "safetyDeposit", type: "uint256" },
                    { name: "timelocks", type: "uint256" },
                    { name: "parameters", type: "bytes" },
                ],
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "cancel",
        inputs: [
            {
                name: "immutables",
                type: "tuple",
                components: [
                    { name: "orderHash", type: "bytes32" },
                    { name: "hashlock", type: "bytes32" },
                    { name: "maker", type: "uint256" },
                    { name: "taker", type: "uint256" },
                    { name: "token", type: "uint256" },
                    { name: "amount", type: "uint256" },
                    { name: "safetyDeposit", type: "uint256" },
                    { name: "timelocks", type: "uint256" },
                    { name: "parameters", type: "bytes" },
                ],
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
];

const ESCROW_DST_ABI = [
    {
        type: "function",
        name: "withdraw",
        inputs: [
            { name: "secret", type: "bytes32" },
            {
                name: "immutables",
                type: "tuple",
                components: [
                    { name: "orderHash", type: "bytes32" },
                    { name: "hashlock", type: "bytes32" },
                    { name: "maker", type: "uint256" },
                    { name: "taker", type: "uint256" },
                    { name: "token", type: "uint256" },
                    { name: "amount", type: "uint256" },
                    { name: "safetyDeposit", type: "uint256" },
                    { name: "timelocks", type: "uint256" },
                    { name: "parameters", type: "bytes" },
                ],
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "cancel",
        inputs: [
            {
                name: "immutables",
                type: "tuple",
                components: [
                    { name: "orderHash", type: "bytes32" },
                    { name: "hashlock", type: "bytes32" },
                    { name: "maker", type: "uint256" },
                    { name: "taker", type: "uint256" },
                    { name: "token", type: "uint256" },
                    { name: "amount", type: "uint256" },
                    { name: "safetyDeposit", type: "uint256" },
                    { name: "timelocks", type: "uint256" },
                    { name: "parameters", type: "bytes" },
                ],
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
];

export interface EscrowImmutables {
    orderHash: string;
    hashlock: string;
    maker: bigint;
    taker: bigint;
    token: bigint;
    amount: bigint;
    safetyDeposit: bigint;
    timelocks: bigint;
    parameters?: string;
}

export interface DstImmutablesComplement {
    maker: bigint;
    amount: bigint;
    token: bigint;
    safetyDeposit: bigint;
    chainId: bigint;
    parameters: string;
}

export interface CrossChainSwapConfig {
    escrowFactoryAddress: string;
    sourceChainId: number;
    destinationChainId: number;
}

export class EvmAdapter {
    public factoryInterface = new Interface(ESCROW_FACTORY_ABI);
    private srcEscrowInterface = new Interface(ESCROW_SRC_ABI);
    private dstEscrowInterface = new Interface(ESCROW_DST_ABI);

    constructor(
        private provider: JsonRpcProvider,
        private config: CrossChainSwapConfig
    ) { }

    /**
     * Create destination escrow
     */
    async createDestinationEscrow(
        wallet: Wallet,
        immutables: EscrowImmutables,
        srcCancellationTimestamp: bigint
    ): Promise<{
        transactionHash: string;
        escrowAddress: string;
        blockTimestamp: number;
    }> {
        // Calculate native amount needed
        const isNativeToken = immutables.token === 0n;
        const nativeAmount = isNativeToken
            ? immutables.safetyDeposit + immutables.amount
            : immutables.safetyDeposit;

        // Build transaction
        const tx: TransactionRequest = {
            to: this.config.escrowFactoryAddress,
            data: this.factoryInterface.encodeFunctionData("createDstEscrow", [
                {
                    ...immutables,
                    parameters: immutables.parameters || "0x",
                },
                srcCancellationTimestamp,
            ]),
            value: nativeAmount,
        };

        // Execute transaction
        const response = await wallet.sendTransaction(tx);
        const receipt = await response.wait();
        if (!receipt) throw new Error("Transaction failed");

        // Get block info
        const block = await this.provider.getBlock(receipt.blockNumber);
        if (!block) throw new Error("Block not found");

        // Parse DstEscrowCreated event to get escrow address
        const escrowAddress = await this.getEscrowAddressFromReceipt(
            receipt.hash,
            immutables.hashlock
        );

        return {
            transactionHash: receipt.hash,
            escrowAddress,
            blockTimestamp: block.timestamp,
        };
    }

    /**
     * Get source escrow address (computed deterministically)
     */
    async getSourceEscrowAddress(
        immutables: EscrowImmutables
    ): Promise<string> {
        const address = await this.provider.call({
            to: this.config.escrowFactoryAddress,
            data: this.factoryInterface.encodeFunctionData("addressOfEscrowSrc", [
                {
                    ...immutables,
                    parameters: immutables.parameters || "0x",
                },
            ]),
        });

        return getAddress("0x" + address.slice(-40));
    }

    /**
     * Get destination escrow address (computed deterministically)
     */
    async getDestinationEscrowAddress(
        immutables: EscrowImmutables
    ): Promise<string> {
        const address = await this.provider.call({
            to: this.config.escrowFactoryAddress,
            data: this.factoryInterface.encodeFunctionData("addressOfEscrowDst", [
                {
                    ...immutables,
                    parameters: immutables.parameters || "0x",
                },
            ]),
        });

        return getAddress("0x" + address.slice(-40));
    }

    /**
     * Withdraw from source escrow
     */
    async withdrawFromSourceEscrow(
        wallet: Wallet,
        escrowAddress: string,
        secret: string,
        immutables: EscrowImmutables,
        target?: string
    ): Promise<{
        transactionHash: string;
        blockTimestamp: number;
    }> {
        const data = target
            ? this.srcEscrowInterface.encodeFunctionData("withdrawTo", [
                secret,
                target,
                {
                    ...immutables,
                    parameters: immutables.parameters || "0x",
                },
            ])
            : this.srcEscrowInterface.encodeFunctionData("withdraw", [
                secret,
                {
                    ...immutables,
                    parameters: immutables.parameters || "0x",
                },
            ]);

        const tx: TransactionRequest = {
            to: escrowAddress,
            data,
        };

        const response = await wallet.sendTransaction(tx);
        const receipt = await response.wait();
        if (!receipt) throw new Error("Transaction failed");

        const block = await this.provider.getBlock(receipt.blockNumber);
        if (!block) throw new Error("Block not found");

        return {
            transactionHash: receipt.hash,
            blockTimestamp: block.timestamp,
        };
    }

    /**
 * Withdraw from destination escrow  
 */
    async withdrawFromDestinationEscrow(
        wallet: Wallet,
        escrowAddress: string,
        secret: string,
        immutables: EscrowImmutables
    ): Promise<{
        transactionHash: string;
        blockTimestamp: number;
    }> {
        // For destination escrows, the maker withdraws directly
        const tx: TransactionRequest = {
            to: escrowAddress,
            data: this.dstEscrowInterface.encodeFunctionData("withdraw", [
                secret,
                {
                    ...immutables,
                    parameters: immutables.parameters || "0x",
                },
            ]),
        };

        const response = await wallet.sendTransaction(tx);
        const receipt = await response.wait();
        if (!receipt) throw new Error("Transaction failed");

        const block = await this.provider.getBlock(receipt.blockNumber);
        if (!block) throw new Error("Block not found");

        return {
            transactionHash: receipt.hash,
            blockTimestamp: block.timestamp,
        };
    }

    /**
     * Cancel source escrow
     */
    async cancelSourceEscrow(
        wallet: Wallet,
        escrowAddress: string,
        immutables: EscrowImmutables
    ): Promise<{
        transactionHash: string;
        blockTimestamp: number;
    }> {
        const tx: TransactionRequest = {
            to: escrowAddress,
            data: this.srcEscrowInterface.encodeFunctionData("cancel", [
                {
                    ...immutables,
                    parameters: immutables.parameters || "0x",
                },
            ]),
        };

        const response = await wallet.sendTransaction(tx);
        const receipt = await response.wait();
        if (!receipt) throw new Error("Transaction failed");

        const block = await this.provider.getBlock(receipt.blockNumber);
        if (!block) throw new Error("Block not found");

        return {
            transactionHash: receipt.hash,
            blockTimestamp: block.timestamp,
        };
    }

    /**
     * Cancel destination escrow
     */
    async cancelDestinationEscrow(
        wallet: Wallet,
        escrowAddress: string,
        immutables: EscrowImmutables
    ): Promise<{
        transactionHash: string;
        blockTimestamp: number;
    }> {
        const tx: TransactionRequest = {
            to: escrowAddress,
            data: this.dstEscrowInterface.encodeFunctionData("cancel", [
                {
                    ...immutables,
                    parameters: immutables.parameters || "0x",
                },
            ]),
        };

        const response = await wallet.sendTransaction(tx);
        const receipt = await response.wait();
        if (!receipt) throw new Error("Transaction failed");

        const block = await this.provider.getBlock(receipt.blockNumber);
        if (!block) throw new Error("Block not found");

        return {
            transactionHash: receipt.hash,
            blockTimestamp: block.timestamp,
        };
    }

    /**
     * Get SrcEscrowCreated event from transaction
     */
    async getSrcEscrowCreatedEvent(
        blockHash: string,
        orderHash?: string
    ): Promise<{
        srcImmutables: EscrowImmutables;
        dstImmutablesComplement: DstImmutablesComplement;
    }> {
        const logs = await this.provider.getLogs({
            blockHash,
            address: this.config.escrowFactoryAddress,
            topics: [this.factoryInterface.getEvent("SrcEscrowCreated")!.topicHash],
        });

        for (const log of logs) {
            const decoded = this.factoryInterface.decodeEventLog(
                "SrcEscrowCreated",
                log.data,
                log.topics
            );

            if (!orderHash || decoded.srcImmutables.orderHash === orderHash) {
                return {
                    srcImmutables: {
                        orderHash: decoded.srcImmutables.orderHash,
                        hashlock: decoded.srcImmutables.hashlock,
                        maker: decoded.srcImmutables.maker,
                        taker: decoded.srcImmutables.taker,
                        token: decoded.srcImmutables.token,
                        amount: decoded.srcImmutables.amount,
                        safetyDeposit: decoded.srcImmutables.safetyDeposit,
                        timelocks: decoded.srcImmutables.timelocks,
                    },
                    dstImmutablesComplement: {
                        maker: decoded.dstImmutablesComplement.maker,
                        amount: decoded.dstImmutablesComplement.amount,
                        token: decoded.dstImmutablesComplement.token,
                        safetyDeposit: decoded.dstImmutablesComplement.safetyDeposit,
                        chainId: decoded.dstImmutablesComplement.chainId,
                        parameters: decoded.dstImmutablesComplement.parameters,
                    },
                };
            }
        }

        throw new Error("SrcEscrowCreated event not found");
    }

    /**
     * Get escrow address from DstEscrowCreated event
     */
    private async getEscrowAddressFromReceipt(
        txHash: string,
        hashlock: string
    ): Promise<string> {
        const receipt = await this.provider.getTransactionReceipt(txHash);
        if (!receipt) throw new Error("Transaction receipt not found");

        const logs = receipt.logs.filter(
            (log) =>
                log.address.toLowerCase() ===
                this.config.escrowFactoryAddress.toLowerCase() &&
                log.topics[0] ===
                this.factoryInterface.getEvent("DstEscrowCreated")!.topicHash
        );

        for (const log of logs) {
            const decoded = this.factoryInterface.decodeEventLog(
                "DstEscrowCreated",
                log.data,
                log.topics
            );

            if (decoded.hashlock.toLowerCase() === hashlock.toLowerCase()) {
                return decoded.escrow;
            }
        }

        throw new Error("DstEscrowCreated event not found");
    }

    /**
     * Helper to calculate immutables hash (for validation)
     */
    calculateImmutablesHash(immutables: EscrowImmutables): string {
        return solidityPackedKeccak256(
            ["bytes32", "bytes32", "uint256", "uint256", "uint256", "uint256", "uint256", "uint256"],
            [
                immutables.orderHash,
                immutables.hashlock,
                immutables.maker,
                immutables.taker,
                immutables.token,
                immutables.amount,
                immutables.safetyDeposit,
                immutables.timelocks,
            ]
        );
    }
}