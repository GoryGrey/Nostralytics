import 'dotenv/config';
import { SimplePool, type Event } from 'nostr-tools';
import colors from 'picocolors'; // Assuming picocolors or similar for WOW factor, if not I'll use raw ANSI

const RELAYS = process.env.NOSTR_RELAYS?.split(',') || ['wss://relay.damus.io', 'wss://nos.lol'];

async function monitor() {
    const pool = new SimplePool();

    console.log(colors.cyan('\n╔══════════════════════════════════════════════════════════════╗'));
    console.log(colors.cyan('║            NOSTRALTYICS TERMINAL SIGNAL MONITOR              ║'));
    console.log(colors.cyan('╚══════════════════════════════════════════════════════════════╝\n'));

    console.log(colors.dim(`Connecting to ${RELAYS.length} relays...`));

    const sub = pool.subscribeMany(
        RELAYS,
        [{ kinds: [7000, 7100, 7200, 7300, 7400] }] as any,
        {
            onevent(event: Event) {
                const chain = event.tags.find(t => t[0] === 'chain')?.[1] || '???';
                const type = event.tags.find(t => t[0] === 'signal')?.[1] || '???';
                const time = new Date(event.created_at * 1000).toLocaleTimeString();

                let chainColor = colors.white;
                if (chain === 'eth') chainColor = colors.blue;
                if (chain === 'sol') chainColor = colors.green;
                if (chain === 'btc') chainColor = colors.yellow;
                if (chain === 'tron') chainColor = colors.red;

                console.log(
                    `${colors.dim(`[${time}]`)} ` +
                    `${chainColor(chain.toUpperCase().padEnd(6))} ` +
                    `${colors.magenta(type.toUpperCase().padEnd(10))} ` +
                    `${colors.white(event.content)} ` +
                    `${colors.dim(`(id: ${event.id.slice(0, 8)}...)`)}`
                );
            }
        }
    );

    process.on('SIGINT', () => {
        sub.close();
        pool.close(RELAYS);
        console.log(colors.yellow('\n\nMonitor stopped.'));
        process.exit(0);
    });
}

monitor().catch(console.error);
