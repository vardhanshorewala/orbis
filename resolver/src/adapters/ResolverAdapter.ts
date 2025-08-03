import {
    JsonRpcProvider,
    Wallet,
    TransactionRequest,
    Interface,
    toBigInt,
    solidityPacked,
} from "ethers";

// Resolver contract ABI
const RESOLVER_ABI = [
    {
        type: "function",
        name: "deploySrc",
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
            {
                name: "order",
                type: "tuple",
                components: [
                    { name: "salt", type: "uint256" },
                    { name: "maker", type: "uint256" },
                    { name: "receiver", type: "uint256" },
                    { name: "makerAsset", type: "uint256" },
                    { name: "takerAsset", type: "uint256" },
                    { name: "makingAmount", type: "uint256" },
                    { name: "takingAmount", type: "uint256" },
                    { name: "makerTraits", type: "uint256" },
                ],
            },
            { name: "r", type: "bytes32" },
            { name: "vs", type: "bytes32" },
            { name: "amount", type: "uint256" },
            { name: "takerTraits", type: "uint256" },
            { name: "args", type: "bytes" },
        ],
        outputs: [],
        stateMutability: "payable",
    },
    {
        type: "function",
        name: "deployDst",
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
        name: "withdraw",
        inputs: [
            { name: "escrow", type: "address" },
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
            { name: "escrow", type: "address" },
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
        name: "arbitraryCalls",
        inputs: [
            { name: "targets", type: "address[]" },
            { name: "arguments", type: "bytes[]" },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
];

export interface LimitOrder {
    salt: bigint;
    maker: bigint;
    receiver: bigint;
    makerAsset: bigint;
    takerAsset: bigint;
    makingAmount: bigint;
    takingAmount: bigint;
    makerTraits: bigint;
}

export interface ResolverConfig {
    resolverAddress: string;
    escrowFactoryAddress: string;
    lopAddress: string;
}

export class ResolverAdapter {
    private resolverInterface = new Interface(RESOLVER_ABI);

    constructor(
        private provider: JsonRpcProvider,
        private config: ResolverConfig
    ) { }

    /**
     * Deploy source escrow through resolver
     */
    async deploySrcEscrow(
        wallet: Wallet,
        immutables: {
            orderHash: string;
            hashlock: string;
            maker: bigint;
            taker: bigint;
            token: bigint;
            amount: bigint;
            safetyDeposit: bigint;
            timelocks: bigint;
            parameters?: string;
        },
        order: LimitOrder,
        signature: { r: string; vs: string },
        fillAmount: bigint,
        takerTraits: bigint,
        args: string = "0x"
    ): Promise<{
        transactionHash: string;
        blockTimestamp: number;
    }> {
        const tx: TransactionRequest = {
            to: this.config.resolverAddress,
            data: this.resolverInterface.encodeFunctionData("deploySrc", [
                {
                    ...immutables,
                    parameters: immutables.parameters || "0x",
                },
                order,
                signature.r,
                signature.vs,
                fillAmount,
                takerTraits,
                args,
            ]),
            value: immutables.safetyDeposit,
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
     * Deploy destination escrow through resolver
     */
    async deployDstEscrow(
        wallet: Wallet,
        immutables: {
            orderHash: string;
            hashlock: string;
            maker: bigint;
            taker: bigint;
            token: bigint;
            amount: bigint;
            safetyDeposit: bigint;
            timelocks: bigint;
            parameters?: string;
        },
        srcCancellationTimestamp: bigint
    ): Promise<{
        transactionHash: string;
        blockTimestamp: number;
    }> {
        // Calculate native amount
        const isNativeToken = immutables.token === 0n;
        const nativeAmount = isNativeToken
            ? immutables.safetyDeposit + immutables.amount
            : immutables.safetyDeposit;

        const tx: TransactionRequest = {
            to: this.config.resolverAddress,
            data: this.resolverInterface.encodeFunctionData("deployDst", [
                {
                    ...immutables,
                    parameters: immutables.parameters || "0x",
                },
                srcCancellationTimestamp,
            ]),
            value: nativeAmount,
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
     * Withdraw from escrow through resolver
     */
    async withdraw(
        wallet: Wallet,
        escrowAddress: string,
        secret: string,
        immutables: {
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
    ): Promise<{
        transactionHash: string;
        blockTimestamp: number;
    }> {
        const tx: TransactionRequest = {
            to: this.config.resolverAddress,
            data: this.resolverInterface.encodeFunctionData("withdraw", [
                escrowAddress,
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
     * Cancel escrow through resolver
     */
    async cancel(
        wallet: Wallet,
        escrowAddress: string,
        immutables: {
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
    ): Promise<{
        transactionHash: string;
        blockTimestamp: number;
    }> {
        const tx: TransactionRequest = {
            to: this.config.resolverAddress,
            data: this.resolverInterface.encodeFunctionData("cancel", [
                escrowAddress,
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
     * Execute arbitrary calls through resolver
     */
    async arbitraryCalls(
        wallet: Wallet,
        targets: string[],
        calldata: string[]
    ): Promise<{
        transactionHash: string;
        blockTimestamp: number;
    }> {
        if (targets.length !== calldata.length) {
            throw new Error("Targets and calldata arrays must have same length");
        }

        const tx: TransactionRequest = {
            to: this.config.resolverAddress,
            data: this.resolverInterface.encodeFunctionData("arbitraryCalls", [
                targets,
                calldata,
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
}