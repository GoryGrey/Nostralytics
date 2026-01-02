import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import colors from 'picocolors';
import { BaseChainAdapter } from '../core/adapter.js';
import { ChainId, NormalizedSignal } from '../core/types.js';

/**
 * MoveAdapter supports Aptos and Sui ecosystems, leveraging their respective SDKs 
 * to monitor for asset transfers and on-chain events.
 */
export class MoveAdapter extends BaseChainAdapter {
    private suiClient?: SuiClient;
    private aptosClient?: Aptos;
    private timer?: NodeJS.Timeout;

    constructor(
        public chainId: ChainId,
        private rpcUrl?: string
    ) {
        super();
        if (this.chainId === 'sui') {
            this.suiClient = new SuiClient({ url: this.rpcUrl || getFullnodeUrl('mainnet') });
        } else if (this.chainId === 'aptos') {
            const config = new AptosConfig({ network: Network.MAINNET });
            this.aptosClient = new Aptos(config);
        }
    }

    /**
     * Initializes Move-ecosystem listeners (Sui subscription or Aptos polling).
     */
    async start(): Promise<void> {
        console.log(`${colors.magenta('[Move Adapter]')} Starting for ${this.chainId}...`);

        if (this.chainId === 'sui' && this.suiClient) {
            this.suiClient.subscribeEvent({
                filter: { All: [] },
                onMessage: (event) => {
                    const isTransfer = event.type.toLowerCase().includes('coin') || event.type.toLowerCase().includes('transfer');
                    this.emitSignal({
                        id: event.id.txDigest,
                        chain: 'sui',
                        type: isTransfer ? 'transfer' : 'metric',
                        timestamp: Math.floor(Date.now() / 1000),
                        blockNumber: BigInt(event.timestampMs || 0),
                        content: `${isTransfer ? 'Sui Asset Move' : 'Sui Event'}: ${event.type.split('::').pop()}`,
                        metadata: event,
                        tags: [
                            ['type', event.type],
                            ['sender', event.sender],
                            ['txid', event.id.txDigest]
                        ]
                    });
                }
            });
        }

        if (this.chainId === 'aptos' && this.aptosClient) {
            this.timer = setInterval(async () => {
                try {
                    const txs = await this.aptosClient!.getTransactions({ options: { limit: 10 } });
                    for (const tx of txs) {
                        if ('hash' in tx && 'success' in tx && tx.success) {
                            const isTransfer = tx.type === 'user_transaction' && (tx as any).events?.some((e: any) => e.type.includes('coin'));
                            this.emitSignal({
                                id: tx.hash,
                                chain: 'aptos',
                                type: isTransfer ? 'transfer' : 'metric',
                                timestamp: (tx as any).timestamp ? Math.floor(Number((tx as any).timestamp) / 1000000) : Math.floor(Date.now() / 1000),
                                blockNumber: BigInt(tx.version),
                                content: `${isTransfer ? 'Aptos Transfer' : 'Aptos Tx'}: ${tx.hash.slice(0, 16)}...`,
                                metadata: { version: tx.version, hash: tx.hash, type: tx.type },
                                tags: [
                                    ['version', tx.version.toString()],
                                    ['txid', tx.hash]
                                ]
                            });
                        }
                    }
                } catch (err: any) {
                    console.error(`${colors.red('[Move Adapter]')} Aptos Polling Error:`, err.message);
                }
            }, 10000); // 10-second polling for Aptos txs
        }

        console.log(`${colors.magenta('[Move Adapter]')} ${this.chainId} is active.`);
    }

    /**
     * Gracefully stops Move-ecosystem monitoring.
     */
    async stop(): Promise<void> {
        if (this.timer) clearInterval(this.timer);
        console.log(`${colors.magenta('[Move Adapter]')} Stopped ${this.chainId}.`);
    }
}
