import 'dotenv/config';
import { NostrPublisher } from './core/publisher.js';
import { NormalizedSignal } from './core/types.js';

async function verify() {
    const NOSTR_KEY = process.env.NOSTR_PRIVATE_KEY || '0000000000000000000000000000000000000000000000000000000000000001'; // Default or real
    const NOSTR_RELAYS = ['wss://relay.damus.io', 'wss://nos.lol'];

    const publisher = new NostrPublisher(NOSTR_KEY, NOSTR_RELAYS);

    const chains = ['eth', 'sol', 'tron', 'btc', 'cosmos', 'sui', 'aptos'];
    const types = ['transfer', 'swap', 'metric', 'alert'];

    console.log('📡 Emitting verification signals across all chains...');

    for (const chain of chains) {
        for (const type of types) {
            const signal: NormalizedSignal = {
                id: `verify-${chain}-${type}-${Date.now()}`,
                chain: chain as any,
                type: type as any,
                timestamp: Math.floor(Date.now() / 1000),
                content: `Verification Signal: ${type.toUpperCase()} detected on ${chain.toUpperCase()} chain. Infrastructure check passed.`,
                metadata: { verify: true },
                tags: [
                    ['verify', 'true'],
                    ['engine', 'nostralytics-v1']
                ]
            };
            await publisher.publish(signal);
            await new Promise(r => setTimeout(r, 2000)); // Increased for safer verification
        }
    }

    console.log('✅ All verification signals emitted.');
    await publisher.stop();
    process.exit(0);
}

verify().catch(console.error);
