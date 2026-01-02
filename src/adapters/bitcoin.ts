import colors from 'picocolors';
import { BaseChainAdapter } from '../core/adapter.js';
import { ChainId, NormalizedSignal } from '../core/types.js';

/**
 * BitcoinAdapter monitors the Bitcoin network by polling mempool.space APIs 
 * for new blocks, fee spikes, and general network metrics.
 */
export class BitcoinAdapter extends BaseChainAdapter {
    private timer?: NodeJS.Timeout;
    private lastHash: string = '';

    constructor(
        public chainId: ChainId,
        private apiUrl: string = 'https://mempool.space/api'
    ) {
        super();
    }

    /**
     * Starts the Bitcoin monitoring loop.
     */
    async start(): Promise<void> {
        console.log(`${colors.yellow('[Bitcoin Adapter]')} Starting for ${this.chainId}...`);

        this.timer = setInterval(async () => {
            try {
                // Check for new blocks
                const response = await fetch(`${this.apiUrl}/blocks/tip/hash`);
                const tipHash = await response.text();

                if (tipHash !== this.lastHash) {
                    const blockResponse = await fetch(`${this.apiUrl}/block/${tipHash}`);
                    const block = await blockResponse.json();

                    this.emitSignal({
                        id: tipHash,
                        chain: this.chainId,
                        type: 'metric',
                        timestamp: block.timestamp,
                        blockNumber: BigInt(block.height),
                        content: `New Bitcoin Block ${block.height}`,
                        metadata: {
                            hash: tipHash,
                            txCount: block.tx_count,
                            size: block.size,
                            feeTotal: block.extras?.totalFees || 0
                        },
                        tags: [
                            ['block', block.height.toString()],
                            ['hash', tipHash]
                        ]
                    });

                    this.lastHash = tipHash;
                }

                // Monitor mempool and fee trends
                const feesResponse = await fetch(`${this.apiUrl}/v1/fees/recommended`);
                const fees: any = await feesResponse.json();

                const mempoolResponse = await fetch(`${this.apiUrl}/mempool`);
                const mempool: any = await mempoolResponse.json();

                this.emitSignal({
                    id: `btc-mempool-${Date.now()}`,
                    chain: this.chainId,
                    type: 'metric',
                    timestamp: Math.floor(Date.now() / 1000),
                    content: `BTC Stats | Fees: ${fees.fastestFee} sat/vB | Mempool: ${mempool.count} txs`,
                    metadata: { fees, mempoolCount: mempool.count },
                    tags: [
                        ['fastestFee', fees.fastestFee.toString()],
                        ['mempoolCount', mempool.count.toString()]
                    ]
                });

                // Alert on significant fee spikes
                if (fees.fastestFee > 100) {
                    this.emitSignal({
                        id: `btc-fee-spike-${Date.now()}`,
                        chain: this.chainId,
                        type: 'alert',
                        timestamp: Math.floor(Date.now() / 1000),
                        content: `Bitcoin Fee Spike: ${fees.fastestFee} sat/vB`,
                        metadata: fees,
                        tags: [
                            ['alert', 'fee_spike'],
                            ['fastestFee', fees.fastestFee.toString()]
                        ]
                    });
                }

            } catch (err: any) {
                console.error(`${colors.red('[Bitcoin Adapter]')} Data Error:`, err.message);
            }
        }, 60000); // 1-minute polling interval

        console.log(`${colors.yellow('[Bitcoin Adapter]')} ${this.chainId} is active.`);
    }

    /**
     * Gracefully stops the Bitcoin polling loop.
     */
    async stop(): Promise<void> {
        if (this.timer) clearInterval(this.timer);
        console.log(`${colors.yellow('[Bitcoin Adapter]')} Stopped ${this.chainId}.`);
    }
}
