import { Tendermint37Client } from '@cosmjs/tendermint-rpc';
import colors from 'picocolors';
import { BaseChainAdapter } from '../core/adapter.js';
import { ChainId, NormalizedSignal } from '../core/types.js';

/**
 * CosmosAdapter monitors Tendermint-based chains (via RPC) for new blocks 
 * and emits metrics signals.
 */
export class CosmosAdapter extends BaseChainAdapter {
    private client?: Tendermint37Client;

    constructor(
        public chainId: ChainId,
        private rpcUrl: string
    ) {
        super();
    }

    /**
     * Connects to the Cosmos node and subscribes to new blocks.
     */
    async start(): Promise<void> {
        console.log(`${colors.cyan('[Cosmos Adapter]')} Initializing ${this.chainId} at ${this.rpcUrl}...`);

        try {
            this.client = await Tendermint37Client.connect(this.rpcUrl);

            // Tendermint subscription loop
            const stream = this.client.subscribeNewBlock();
            stream.subscribe({
                next: (block: any) => {
                    const height = block.header.height;
                    const blockHash = block.header.lastBlockId?.hash
                        ? Buffer.from(block.header.lastBlockId.hash).toString('hex').toUpperCase()
                        : 'UNKNOWN';

                    this.emitSignal({
                        id: blockHash,
                        chain: this.chainId,
                        type: 'metric',
                        timestamp: Math.floor(Date.now() / 1000),
                        blockNumber: BigInt(height),
                        content: `Cosmos Block ${height} | Hash: ${blockHash.slice(0, 16)}...`,
                        metadata: {
                            height,
                            chainId: block.header.chainId,
                            timestamp: block.header.time
                        },
                        tags: [
                            ['block', height.toString()],
                            ['hash', blockHash],
                            ['cosmos_chain', block.header.chainId]
                        ]
                    });
                },
                error: (err: Error) => console.error(`${colors.red('[Cosmos Adapter]')} Stream Error:`, err.message)
            });

            console.log(`${colors.cyan('[Cosmos Adapter]')} ${this.chainId} is active.`);
        } catch (err: any) {
            console.error(`${colors.red('[Cosmos Adapter]')} Connection Failed:`, err.message);
        }
    }

    /**
     * Gracefully disconnects from the Cosmos node.
     */
    async stop(): Promise<void> {
        this.client?.disconnect();
        console.log(`${colors.cyan('[Cosmos Adapter]')} Stopped ${this.chainId}.`);
    }
}
