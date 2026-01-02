import { Connection, PublicKey } from '@solana/web3.js';
import colors from 'picocolors';
import { BaseChainAdapter } from '../core/adapter.js';
import { ChainId, NormalizedSignal } from '../core/types.js';

/**
 * SolanaAdapter monitors the Solana network for slot changes and Raydium swap logs.
 */
export class SolanaAdapter extends BaseChainAdapter {
    private connection: Connection;
    private subscriptionId?: number;

    constructor(
        public chainId: ChainId,
        private rpcUrl: string,
        private wsUrl?: string
    ) {
        super();
        this.connection = new Connection(this.rpcUrl, {
            wsEndpoint: this.wsUrl,
            commitment: 'confirmed'
        });
    }

    /**
     * Starts monitoring the Solana network.
     */
    async start(): Promise<void> {
        console.log(`${colors.green('[Solana Adapter]')} Starting for ${this.chainId}...`);

        // 1. Watch for new slots (blocks) as metrics
        this.connection.onSlotChange((slotInfo) => {
            this.emitSignal({
                id: slotInfo.slot.toString(),
                chain: this.chainId,
                type: 'metric',
                timestamp: Math.floor(Date.now() / 1000),
                blockNumber: BigInt(slotInfo.slot),
                content: `New Slot ${slotInfo.slot} on Solana`,
                metadata: {
                    slot: slotInfo.slot,
                    parent: slotInfo.parent,
                    root: slotInfo.root
                },
                tags: [
                    ['slot', slotInfo.slot.toString()]
                ]
            });
        });

        // 2. Watch for Logs (Raydium Swaps)
        const RAYDIUM_PROGRAM_ID = '675kPX9MHTjS2zt1qnt1dJLv2XX96j3pWRPXuzM7Pn6L';

        this.subscriptionId = this.connection.onLogs(new PublicKey(RAYDIUM_PROGRAM_ID), (logs, ctx) => {
            const isSwap = logs.logs.some(l => l.includes('ray_log') || l.toLowerCase().includes('swap'));

            if (isSwap) {
                this.emitSignal({
                    id: logs.signature,
                    chain: this.chainId,
                    type: 'swap',
                    timestamp: Math.floor(Date.now() / 1000),
                    blockNumber: BigInt(ctx.slot),
                    content: `Raydium Swap detected on Solana (sig: ${logs.signature.slice(0, 8)}...)`,
                    metadata: {
                        signature: logs.signature,
                        programId: RAYDIUM_PROGRAM_ID,
                        slot: ctx.slot
                    },
                    tags: [
                        ['program', RAYDIUM_PROGRAM_ID],
                        ['txid', logs.signature],
                        ['slot', ctx.slot.toString()],
                        ['signal', 'swap']
                    ]
                });
            }
        }, 'confirmed');

        console.log(`${colors.green('[Solana Adapter]')} ${this.chainId} is active.`);
    }

    /**
     * Gracefully stops Solana monitoring.
     */
    async stop(): Promise<void> {
        if (this.subscriptionId !== undefined) {
            await this.connection.removeOnLogsListener(this.subscriptionId);
        }
        console.log(`${colors.green('[Solana Adapter]')} Stopped ${this.chainId}.`);
    }
}
