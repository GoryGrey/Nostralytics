/**
 * Supported blockchain network identifiers.
 */
export type ChainId = 'eth' | 'sol' | 'tron' | 'btc' | 'base' | 'opt' | 'poly' | 'sui' | 'aptos' | 'cosmos';

/**
 * Standardized signal categories used for Nostr event kind mapping.
 */
export type SignalType = 'transfer' | 'swap' | 'liquidity' | 'metric' | 'alert';

/**
 * Represents a normalized blockchain event ready for Nostr publication.
 */
export interface NormalizedSignal {
    /** Unique identifier, typically a txid or event hash */
    id: string;
    /** The source blockchain */
    chain: ChainId;
    /** The semantic category of the signal */
    type: SignalType;
    /** UNIX timestamp in seconds */
    timestamp: number;
    /** Optional block height */
    blockNumber?: bigint;
    /** Human-readable or JSON summary of the event */
    content: string;
    /** Raw or structured data specific to the signal type */
    metadata: Record<string, any>;
    /** Collection of Nostr-compatible tags: ["chain", "eth"], ["from", "..."], etc. */
    tags: [string, string][];
}

/**
 * Base interface for blockchain-specific adapters.
 */
export interface ChainAdapter {
    chainId: ChainId;
    /** Initializes the adapter and starts real-time monitoring */
    start(): Promise<void>;
    /** Gracefully stops the adapter and closes connections */
    stop(): Promise<void>;
    /** Registers a callback to handle newly detected signals */
    onSignal(callback: (signal: NormalizedSignal) => void): void;
}

/**
 * Reserved Nostr event kind ranges for the Nostralytics specification.
 */
export const NOSTRALTYICS_KIND_RANGE = {
    METRICS: { start: 7000, end: 7099 },
    TRANSFERS: { start: 7100, end: 7199 },
    PROTOCOLS: { start: 7200, end: 7299 },
    ALERTS: { start: 7300, end: 7399 },
    STATS: { start: 7400, end: 7499 },
};

/**
 * Maps a SignalType to its canonical Nostr event kind.
 */
export function getKindForSignal(type: SignalType): number {
    switch (type) {
        case 'metric': return 7000;
        case 'transfer': return 7100;
        case 'swap':
        case 'liquidity': return 7200;
        case 'alert': return 7300;
        default: return 7400;
    }
}
