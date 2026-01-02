import { createPublicClient, http, Chain, parseAbiItem, formatUnits } from 'viem';
import { watchBlocks, watchEvent } from 'viem/actions';
import colors from 'picocolors';
import { BaseChainAdapter } from '../core/adapter.js';
import { ChainId, NormalizedSignal } from '../core/types.js';

const ERC20_TRANSFER_ABI = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');
const UNISWAP_V3_SWAP_ABI = parseAbiItem('event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)');

const ERC20_MINIMAL_ABI = [
    { type: 'function', name: 'symbol', inputs: [], outputs: [{ type: 'string' }], stateMutability: 'view' },
    { type: 'function', name: 'decimals', inputs: [], outputs: [{ type: 'uint8' }], stateMutability: 'view' },
] as const;

/**
 * EvmAdapter monitors Ethereum-compatible chains for blocks, ERC-20 transfers, 
 * and Uniswap v3 swaps.
 */
export class EvmAdapter extends BaseChainAdapter {
    private client: any;
    private unwatchBlocks?: () => void;
    private unwatchEvents?: () => void;
    private unwatchSwaps?: () => void;
    private tokenCache: Map<string, { symbol: string; decimals: number }> = new Map();

    constructor(
        public chainId: ChainId,
        private rpcUrl: string,
        private chainParams?: Chain
    ) {
        super();
        this.client = createPublicClient({
            chain: this.chainParams,
            transport: http(this.rpcUrl)
        });
    }

    private async getTokenMetadata(address: `0x${string}`) {
        if (this.tokenCache.has(address)) return this.tokenCache.get(address);

        try {
            const [symbol, decimals] = await Promise.all([
                this.client.readContract({ address, abi: ERC20_MINIMAL_ABI, functionName: 'symbol' }),
                this.client.readContract({ address, abi: ERC20_MINIMAL_ABI, functionName: 'decimals' }),
            ]);

            const metadata = { symbol: symbol as string, decimals: decimals as number };
            this.tokenCache.set(address, metadata);
            return metadata;
        } catch (err) {
            return { symbol: 'TOKEN', decimals: 18 }; // Fallback for unknown tokens
        }
    }

    /**
     * Starts monitoring the EVM chain.
     */
    async start(): Promise<void> {
        console.log(`${colors.blue('[EVM Adapter]')} Initializing ${this.chainId} at ${this.rpcUrl}...`);

        // 1. Watch Blocks for Metrics
        this.unwatchBlocks = watchBlocks(this.client, {
            onBlock: (block) => {
                this.emitSignal({
                    id: block.hash!,
                    chain: this.chainId,
                    type: 'metric',
                    timestamp: Number(block.timestamp),
                    blockNumber: block.number!,
                    content: `New Block ${block.number} on ${this.chainId}`,
                    metadata: {
                        hash: block.hash,
                        gasUsed: block.gasUsed.toString(),
                        txCount: block.transactions.length
                    },
                    tags: [
                        ['block', block.number!.toString()],
                        ['hash', block.hash!]
                    ]
                });
            },
            onError: (error) => console.error(`${colors.red('[EVM Adapter]')} Block Watch Error (${this.chainId}):`, error.message)
        });

        // 2. Watch for ERC-20 Transfers
        this.unwatchEvents = watchEvent(this.client, {
            event: ERC20_TRANSFER_ABI,
            onLogs: async (logs) => {
                for (const log of logs) {
                    const { from, to, value } = log.args;
                    if (!from || !to || value === undefined) continue;

                    const metadata = await this.getTokenMetadata(log.address);
                    const formattedValue = formatUnits(value, metadata!.decimals);

                    this.emitSignal({
                        id: log.transactionHash!,
                        chain: this.chainId,
                        type: 'transfer',
                        timestamp: Math.floor(Date.now() / 1000),
                        blockNumber: log.blockNumber,
                        content: `Transfer: ${formattedValue} ${metadata!.symbol} from ${from} to ${to}`,
                        metadata: {
                            contract: log.address,
                            from,
                            to,
                            value: value.toString(),
                            symbol: metadata!.symbol,
                            decimals: metadata!.decimals
                        },
                        tags: [
                            ['contract', log.address],
                            ['symbol', metadata!.symbol],
                            ['from', from],
                            ['to', to],
                            ['value', value.toString()],
                            ['txid', log.transactionHash!]
                        ]
                    });
                }
            },
            onError: (error) => console.error(`${colors.red('[EVM Adapter]')} Event Watch Error (${this.chainId}):`, error.message)
        });

        // 3. Watch for Uniswap v3 Swaps
        this.unwatchSwaps = watchEvent(this.client, {
            event: UNISWAP_V3_SWAP_ABI,
            onLogs: (logs) => {
                for (const log of logs) {
                    const { sender, recipient, amount0, amount1, tick } = log.args;

                    this.emitSignal({
                        id: log.transactionHash!,
                        chain: this.chainId,
                        type: 'swap',
                        timestamp: Math.floor(Date.now() / 1000),
                        blockNumber: log.blockNumber,
                        content: `Uniswap v3 Swap: ${amount0} / ${amount1} at tick ${tick}`,
                        metadata: {
                            pool: log.address,
                            sender,
                            recipient,
                            amount0: amount0?.toString(),
                            amount1: amount1?.toString(),
                            tick: tick?.toString()
                        },
                        tags: [
                            ['pool', log.address],
                            ['sender', sender!],
                            ['recipient', recipient!],
                            ['tick', tick!.toString()],
                            ['txid', log.transactionHash!]
                        ]
                    });
                }
            },
            onError: (error) => console.error(`${colors.red('[EVM Adapter]')} Swap Watch Error (${this.chainId}):`, error.message)
        });

        console.log(`${colors.blue('[EVM Adapter]')} ${this.chainId} is active.`);
    }

    /**
     * Gracefully stops the EVM monitoring.
     */
    async stop(): Promise<void> {
        this.unwatchBlocks?.();
        this.unwatchEvents?.();
        this.unwatchSwaps?.();
        console.log(`${colors.blue('[EVM Adapter]')} Stopped ${this.chainId}.`);
    }
}
