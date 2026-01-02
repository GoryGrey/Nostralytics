import 'dotenv/config';
import colors from 'picocolors';
import { NostrPublisher } from './core/publisher.js';
import { EvmAdapter } from './adapters/evm.js';
import { SolanaAdapter } from './adapters/solana.js';
import { TronAdapter } from './adapters/tron.js';
import { BitcoinAdapter } from './adapters/bitcoin.js';
import { CosmosAdapter } from './adapters/cosmos.js';
import { MoveAdapter } from './adapters/move.js';
import { mainnet } from 'viem/chains';
import { NormalizedSignal } from './core/types.js';

async function main() {
    const NOSTR_KEY = process.env.NOSTR_PRIVATE_KEY;
    const NOSTR_RELAYS = process.env.NOSTR_RELAYS?.split(',') || ['wss://relay.damus.io', 'wss://nos.lol'];

    const ETH_RPC = process.env.ETH_RPC_URL;
    const SOL_RPC = process.env.SOLANA_RPC_URL;
    const COSMOS_RPC = process.env.COSMOS_RPC_URL;
    const TRON_API_KEY = process.env.TRON_API_KEY; // Optional

    if (!NOSTR_KEY) {
        console.error('CRITICAL: NOSTR_PRIVATE_KEY is not set in .env');
        process.exit(1);
    }

    console.log(`${colors.cyan('➔')} Starting Nostralytics Signal Bus...`);

    const publisher = new NostrPublisher(NOSTR_KEY, NOSTR_RELAYS);

    const adapters: any[] = [];

    const handleSignal = (signal: NormalizedSignal) => {
        let chainColor = colors.white;
        if (signal.chain === 'eth') chainColor = colors.blue;
        if (signal.chain === 'sol') chainColor = colors.green;
        if (signal.chain === 'btc') chainColor = colors.yellow;
        if (signal.chain === 'tron') chainColor = colors.red;

        console.log(
            `${colors.cyan('📥 DATA IN ')} ` +
            `${chainColor(signal.chain.toUpperCase().padEnd(6))} ` +
            `${colors.magenta(signal.type.toUpperCase().padEnd(10))} ` +
            `${colors.white(signal.content)}`
        );
        publisher.publish(signal);
    };

    // Initialize Active Adapters
    if (ETH_RPC) {
        const ethAdapter = new EvmAdapter('eth', ETH_RPC, mainnet);
        ethAdapter.onSignal(handleSignal);
        adapters.push(ethAdapter);
    }

    if (SOL_RPC) {
        const solAdapter = new SolanaAdapter('sol', SOL_RPC);
        solAdapter.onSignal(handleSignal);
        adapters.push(solAdapter);
    }

    if (TRON_API_KEY) {
        const tronAdapter = new TronAdapter('tron', TRON_API_KEY);
        tronAdapter.onSignal(handleSignal);
        adapters.push(tronAdapter);
    }

    const btcAdapter = new BitcoinAdapter('btc');
    btcAdapter.onSignal(handleSignal);
    adapters.push(btcAdapter);

    if (COSMOS_RPC) {
        const cosmosAdapter = new CosmosAdapter('cosmos', COSMOS_RPC);
        cosmosAdapter.onSignal(handleSignal);
        adapters.push(cosmosAdapter);
    }

    // Move Ecosystem
    const suiAdapter = new MoveAdapter('sui');
    suiAdapter.onSignal(handleSignal);
    adapters.push(suiAdapter);

    const aptosAdapter = new MoveAdapter('aptos');
    aptosAdapter.onSignal(handleSignal);
    adapters.push(aptosAdapter);

    // Bootstrapping
    for (const adapter of adapters) {
        try {
            await adapter.start();
        } catch (err) {
            console.error(`${colors.red('✖')} Failed to start adapter for ${adapter.chainId}:`, err);
        }
    }

    // Graceful Shutdown
    process.on('SIGINT', async () => {
        console.log(`\n${colors.yellow('➔')} Shutting down...`);
        for (const adapter of adapters) {
            await adapter.stop();
        }
        await publisher.stop();
        process.exit(0);
    });
}

main().catch(console.error);
