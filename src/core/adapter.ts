import { EventEmitter } from 'events';
import { ChainAdapter, ChainId, NormalizedSignal } from './types.js';

export abstract class BaseChainAdapter extends EventEmitter implements ChainAdapter {
    abstract chainId: ChainId;

    abstract start(): Promise<void>;
    abstract stop(): Promise<void>;

    onSignal(callback: (signal: NormalizedSignal) => void): void {
        this.on('signal', callback);
    }

    protected emitSignal(signal: NormalizedSignal) {
        this.emit('signal', signal);
    }
}
