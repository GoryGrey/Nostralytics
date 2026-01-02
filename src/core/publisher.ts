import colors from 'picocolors';
import {
    getPublicKey,
    SimplePool,
    EventTemplate,
    finalizeEvent,
    nip19
} from 'nostr-tools';
import { Buffer } from 'buffer'; // Required for Buffer.from
import { NormalizedSignal, getKindForSignal } from './types.js';

/**
 * NostrPublisher handles the normalization, signing, and broadcasting of blockchain signals 
 * to the Nostr network. It includes internal rate limiting and Proof-of-Work (PoW) 
 * capabilities to ensure reliable delivery to various relay configurations.
 */
export class NostrPublisher {
    private pool: SimplePool;
    private privateKey: Uint8Array;
    private publicKey: string;
    private relays: string[];

    // Rate limiting state
    private tokens: number = 5;
    private maxTokens: number = 5;
    private refillRate: number = 0.5; // 0.5 tokens per second (1 every 2s)
    private lastRefill: number = Date.now();

    /**
     * @param privateKey - Hex or nsec encoded private key
     * @param relays - Array of Nostr relay URLs
     */
    constructor(privateKey: string, relays: string[]) {
        this.pool = new SimplePool();

        if (privateKey.startsWith('nsec')) {
            const { data } = nip19.decode(privateKey);
            this.privateKey = data as Uint8Array;
        } else {
            try {
                this.privateKey = Buffer.from(privateKey, 'hex') as any;
            } catch (err) {
                console.error(`[Publisher] CRITICAL: Invalid hex key provided`);
                throw err;
            }
        }

        this.publicKey = getPublicKey(this.privateKey);
        this.relays = relays;

        console.log(`${colors.green('[Publisher]')} Initialized with pubkey: ${this.publicKey}`);
    }

    /**
     * Refills the token bucket based on elapsed time.
     */
    private refillTokens() {
        const now = Date.now();
        const elapsed = (now - this.lastRefill) / 1000;
        this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
        this.lastRefill = now;
    }

    /**
     * Publishes a normalized signal to the configured Nostr relays.
     * Implements internal scheduling and automatic retry with PoW if required by relays.
     * 
     * @param signal - The normalized blockchain signal to publish
     * @param retryCount - Internal retry counter
     */
    async publish(signal: NormalizedSignal, retryCount: number = 0): Promise<void> {
        this.refillTokens();

        // Internal throttling
        if (this.tokens < 1) {
            const waitTime = Math.ceil((1 - this.tokens) / this.refillRate) * 1000;
            console.warn(`${colors.yellow('[Publisher]')} Internal rate limit hit. Waiting ${waitTime}ms...`);
            await new Promise(r => setTimeout(r, waitTime));
            return this.publish(signal, retryCount);
        }

        this.tokens -= 1;

        const template: EventTemplate = {
            kind: getKindForSignal(signal.type),
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['chain', signal.chain],
                ['signal', signal.type],
                ...signal.tags
            ],
            content: signal.content,
        };

        const event = finalizeEvent(template, this.privateKey);

        console.log(
            `${colors.yellow('⚡ DATA OUT')} ` +
            `${colors.magenta('NOSTR')} ` +
            `${colors.dim(`Kind ${event.kind}`)} ` +
            `${colors.white(event.id.slice(0, 16))}... ` +
            `${colors.dim(`[Tokens: ${this.tokens.toFixed(1)}]`)}`
        );

        try {
            const pubs = this.pool.publish(this.relays, event);
            await Promise.all(pubs);
        } catch (err: any) {
            const errMsg = err?.message || '';

            // Handle Proof-of-Work requirements
            if (errMsg.includes('pow:') && retryCount < 3) {
                const match = errMsg.match(/pow: (\d+) bits needed/);
                const difficulty = match ? parseInt(match[1]) : 8;
                console.warn(`${colors.blue('[Publisher]')} Relay requires PoW (${difficulty} bits). Mining...`);

                const nonceIndex = event.tags.findIndex(t => t[0] === 'nonce');
                if (nonceIndex === -1) {
                    event.tags.push(['nonce', '0', difficulty.toString()]);
                }

                let nonce = 0;
                while (true) {
                    event.tags[event.tags.length - 1][1] = nonce.toString();
                    const minedEvent = finalizeEvent(template, this.privateKey);
                    if (this.checkDifficulty(minedEvent.id, difficulty)) {
                        console.log(`${colors.green('[Publisher]')} Mined PoW with nonce ${nonce}`);
                        return this.publishSignal(minedEvent, retryCount + 1);
                    }
                    nonce++;

                    // Safety break for extremely high difficulty (unlikely in this context)
                    if (nonce > 1_000_000) {
                        console.error(`${colors.red('[Publisher]')} PoW mining timed out`);
                        break;
                    }
                }
            }

            // Handle Relay-side rate limits
            if (errMsg.includes('rate-limited') && retryCount < 3) {
                console.warn(`${colors.yellow('[Publisher]')} Relay rate-limited. Retrying in 10s (Attempt ${retryCount + 1}/3)...`);
                await new Promise(r => setTimeout(r, 10000));
                return this.publish(signal, retryCount + 1);
            }

            console.error(`${colors.red('[Publisher]')} Error publishing to relays:`, errMsg);
        }
    }

    /**
     * Verifies if a given event ID matches the required PoW difficulty.
     */
    private checkDifficulty(id: string, difficulty: number): boolean {
        const idBuf = Buffer.from(id, 'hex');
        let bits = 0;
        for (let i = 0; i < idBuf.length; i++) {
            const byte = idBuf[i];
            if (byte === 0) {
                bits += 8;
                continue;
            }
            bits += Math.clz32(byte) - 24;
            break;
        }
        return bits >= difficulty;
    }

    /**
     * Internal helper to rebroadcast an event without re-throttling.
     */
    private async publishSignal(event: any, retryCount: number): Promise<void> {
        try {
            const pubs = this.pool.publish(this.relays, event);
            await Promise.all(pubs);
        } catch (err: any) {
            console.error(`${colors.red('[Publisher]')} Error on rebroadcast:`, err.message);
        }
    }

    /**
     * Closes current relay connections.
     */
    async stop() {
        this.pool.close(this.relays);
    }
}
