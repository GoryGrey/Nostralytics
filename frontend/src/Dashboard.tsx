import { useEffect, useState } from 'react';
import { SimplePool, type Event } from 'nostr-tools';
import { Activity, Zap, Cpu, ArrowUpRight, Globe } from 'lucide-react';

const RELAYS = ['wss://relay.damus.io', 'wss://nos.lol'];

interface Signal {
    id: string;
    chain: string;
    type: string;
    content: string;
    timestamp: number;
}

const Dashboard = () => {
    const [signals, setSignals] = useState<Signal[]>([]);

    useEffect(() => {
        const pool = new SimplePool();

        const sub = pool.subscribeMany(
            RELAYS,
            [{ kinds: [7000, 7100, 7200, 7300, 7400], limit: 50 }] as any,
            {
                onevent(event: Event) {
                    const chain = event.tags.find(t => t[0] === 'chain')?.[1] || 'unknown';
                    const type = event.tags.find(t => t[0] === 'signal')?.[1] || 'unknown';

                    const newSignal: Signal = {
                        id: event.id,
                        chain,
                        type,
                        content: event.content,
                        timestamp: event.created_at
                    };

                    setSignals(prev => [newSignal, ...prev].slice(0, 100));
                },
                oneose() {
                    console.log('Finished loading events');
                }
            }
        );

        return () => {
            sub.close();
            pool.close(RELAYS);
        };
    }, []);

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-white p-8 font-sans selection:bg-purple-500/30">
            {/* HUD Header */}
            <div className="max-w-7xl mx-auto flex justify-between items-center mb-12 border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-4xl font-bold tracking-tighter bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent">
                        NOSTRALTYICS
                    </h1>
                    <p className="text-white/40 text-sm mt-1 uppercase tracking-widest">Universal Signal Bus • v1.0.0</p>
                </div>
                <div className="flex gap-4">
                    <div className="px-4 py-2 bg-white/5 rounded-full border border-white/10 flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-xs font-mono text-white/60">SYSTEMS NOMINAL</span>
                    </div>
                    <div className="px-4 py-2 bg-purple-500/10 rounded-full border border-purple-500/20 flex items-center gap-2">
                        <Zap className="w-3 h-3 text-purple-400" />
                        <span className="text-xs font-mono text-purple-400 uppercase tracking-tighter">Live Mainnet Feed</span>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8">
                {/* Sidebar Status */}
                <div className="col-span-12 lg:col-span-3 space-y-6">
                    <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl">
                        <h3 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-4">Network Status</h3>
                        <div className="space-y-4">
                            {['Ethereum', 'Solana', 'TRON', 'Bitcoin', 'Cosmos', 'Sui', 'Aptos'].map(chain => (
                                <div key={chain} className="flex justify-between items-center">
                                    <span className="text-sm text-white/70">{chain}</span>
                                    <div className="flex items-center gap-1.5 leading-none">
                                        <span className="text-[10px] font-mono text-green-400/80">LIVE</span>
                                        <div className="w-1 h-1 bg-green-500 rounded-full" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-white/10 backdrop-blur-xl">
                        <Globe className="w-8 h-8 text-white/80 mb-4" />
                        <h3 className="text-lg font-bold text-white">Global Reach</h3>
                        <p className="text-sm text-white/50 leading-relaxed mt-1">Nostralytics monitors activity across 7+ blockchains simultaneously with zero-latency publication.</p>
                    </div>
                </div>

                {/* Signal Stream */}
                <div className="col-span-12 lg:col-span-9">
                    <div className="flex items-center justify-between mb-6 px-1">
                        <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-purple-400" />
                            <h2 className="text-xl font-bold">Signal Evolution</h2>
                        </div>
                        <span className="text-white/30 text-xs font-mono lowercase tracking-tighter">Showing {signals.length} real-time events</span>
                    </div>

                    <div className="space-y-3">
                        {signals.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center rounded-3xl border border-white/5 bg-white/[0.02]">
                                <div className="w-12 h-12 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4" />
                                <p className="text-white/30 text-sm font-mono tracking-tighter">Waiting for signed signals from relays...</p>
                            </div>
                        ) : (
                            signals.map((signal, idx) => (
                                <div
                                    key={signal.id + idx}
                                    className="group p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 hover:bg-white/[0.05] transition-all duration-300 flex items-center justify-between gap-6"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 bg-white/5 group-hover:scale-110 transition-transform ${signal.chain === 'eth' ? 'text-blue-400' :
                                            signal.chain === 'sol' ? 'text-green-400' :
                                                signal.chain === 'btc' ? 'text-orange-400' : 'text-purple-400'
                                            }`}>
                                            <Cpu className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-[#7c3aed] bg-purple-500/10 px-1.5 py-0.5 rounded leading-none">
                                                    {signal.chain}
                                                </span>
                                                <span className="text-white/80 font-medium text-sm">{signal.type.toUpperCase()}</span>
                                            </div>
                                            <p className="text-white/40 text-[13px] mt-1 line-clamp-1 font-mono">{signal.content}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-right">
                                        <div className="text-[10px] font-mono whitespace-nowrap">
                                            <div className="text-white/60">{new Date(signal.timestamp * 1000).toLocaleTimeString()}</div>
                                            <div className="text-white/20">{signal.id.slice(0, 16)}...</div>
                                        </div>
                                        <ArrowUpRight className="w-4 h-4 text-white/10 group-hover:text-white/50 transition-colors" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
