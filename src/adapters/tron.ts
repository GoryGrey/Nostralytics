import { TronWeb } from 'tronweb';
import colors from 'picocolors';
import { BaseChainAdapter } from '../core/adapter.js';
import { ChainId, NormalizedSignal } from '../core/types.js';

/**
 * TronAdapter monitors the TRON network using high-frequency polling to detect 
 * native TRX transfers and TRC-20 activity.
 */
export class TronAdapter extends BaseChainAdapter {
    private tronWeb: any;
    private timer?: NodeJS.Timeout;
    private lastBlock: number = 0;

    constructor(
        public chainId: ChainId,
        private apiKey?: string
    ) {
        super();
        this.tronWeb = new TronWeb({
            fullHost: 'https://api.trongrid.io',
            headers: this.apiKey ? { 'TRON-PRO-API-KEY': this.apiKey } : undefined
        });
    }

    /**
     * Starts high-frequency polling for the TRON network.
     */
    async start(): Promise<void> {
        console.log(`${colors.red('[Tron Adapter]')} Starting for ${this.chainId}...`);

        this.timer = setInterval(async () => {
            try {
                const currentBlock = await this.tronWeb.trx.getCurrentBlock();
                const blockNum = currentBlock.block_header.raw_data.number;

                if (blockNum > this.lastBlock) {
                    if (this.lastBlock !== 0) {
                        this.processBlock(currentBlock);
                    }
                    this.lastBlock = blockNum;
                }
            } catch (err: any) {
                console.error(`${colors.red('[Tron Adapter]')} Polling Error:`, err.message);
            }
        }, 3000); // 3-second approximate block time

        console.log(`${colors.red('[Tron Adapter]')} ${this.chainId} is active.`);
    }

    /**
     * Processes a single TRON block and extracts relevant signals.
     */
    private processBlock(block: any) {
        const blockNum = block.block_header.raw_data.number;
        const blockHash = block.blockID;

        this.emitSignal({
            id: blockHash,
            chain: this.chainId,
            type: 'metric',
            timestamp: Math.floor(block.block_header.raw_data.timestamp / 1000),
            blockNumber: BigInt(blockNum),
            content: `New Block ${blockNum} on TRON`,
            metadata: {
                hash: blockHash,
                txCount: block.transactions?.length || 0
            },
            tags: [
                ['block', blockNum.toString()],
                ['hash', blockHash]
            ]
        });

        if (block.transactions) {
            for (const tx of block.transactions) {
                // TRX Transfer detection
                if (tx.raw_data.contract[0].type === 'TransferContract') {
                    const contract = tx.raw_data.contract[0].parameter.value;
                    const from = this.tronWeb.address.fromHex(contract.owner_address);
                    const to = this.tronWeb.address.fromHex(contract.to_address);
                    const amount = contract.amount;

                    this.emitSignal({
                        id: tx.txID,
                        chain: this.chainId,
                        type: 'transfer',
                        timestamp: Math.floor(tx.raw_data.timestamp / 1000),
                        blockNumber: BigInt(blockNum),
                        content: `TRX Transfer: ${amount / 1_000_000} TRX from ${from} to ${to}`,
                        metadata: { from, to, amount: amount.toString() },
                        tags: [
                            ['from', from],
                            ['to', to],
                            ['value', amount.toString()],
                            ['symbol', 'TRX'],
                            ['txid', tx.txID]
                        ]
                    });
                }

                // TRC-20 Activity detection
                if (tx.raw_data.contract[0].type === 'TriggerSmartContract') {
                    const contract = tx.raw_data.contract[0].parameter.value;
                    const data = contract.data;

                    // Match ERC20 Transfer selector
                    if (data && data.startsWith('a9059cbb')) {
                        const from = this.tronWeb.address.fromHex(contract.owner_address);
                        const contractAddr = this.tronWeb.address.fromHex(contract.contract_address);

                        this.emitSignal({
                            id: tx.txID,
                            chain: this.chainId,
                            type: 'transfer',
                            timestamp: Math.floor(tx.raw_data.timestamp / 1000),
                            blockNumber: BigInt(blockNum),
                            content: `TRC-20 Activity detected on ${contractAddr} (tx: ${tx.txID.slice(0, 8)}...)`,
                            metadata: { contract: contractAddr, from, txid: tx.txID },
                            tags: [
                                ['contract', contractAddr],
                                ['from', from],
                                ['txid', tx.txID]
                            ]
                        });
                    }
                }
            }
        }
    }

    /**
     * Stops the polling timer.
     */
    async stop(): Promise<void> {
        if (this.timer) clearInterval(this.timer);
        console.log(`${colors.red('[Tron Adapter]')} Stopped ${this.chainId}.`);
    }
}
