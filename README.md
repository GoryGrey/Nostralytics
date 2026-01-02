![Nostralytics Banner](Nostralytics%20README%20banner.png)

# Nostralytics

Nostralytics is an open-source, decentralized signal bus that transforms real-time blockchain activity into structured, cryptographically signed events on the Nostr protocol. 

By mapping complex on-chain data to a uniform, relay-based event model, Nostralytics provides a vendor-neutral infrastructure for developers, AI agents, and automated systems to consume multi-chain insights without relying on centralized APIs or proprietary indexers.

## Core Features

- **Multi-Chain Normalization**: Uniform adapters for Ethereum (EVM), Solana, Bitcoin, TRON, Cosmos, and Move-based chains (Sui/Aptos).
- **Decentralized Distribution**: Leverages the Nostr relay network for high availability and censorship resistance.
- **Machine-Readable Signals**: Standardized event kinds (7000-7499) designed for programmatic consumption.
- **Robust Publishing**: Built-in rate limiting, automatic retry logic, and Proof-of-Work (PoW) mining for relay compatibility.
- **Privacy First**: Operates without tracking or centralized backend logging.

## Architecture

Nostralytics is designed with a polymorphic adapter pattern:

1.  **Chain Adapters**: Lightweight listeners that monitor specific blockchains via RPC or WebSocket.
2.  **Signal Engine**: Normalizes raw transactions and logs into a standard `NormalizedSignal` schema.
3.  **Nostr Publisher**: Signs signal payloads with an Ed25519 key and broadcasts them to a configurable list of relays.

## Supported Adapters

| Chain | Adapter Status | Features |
| :--- | :--- | :--- |
| **Ethereum / EVM** | Stable | Blocks, ERC-20 Transfers, Uniswap v3 Swaps |
| **Solana** | Stable | Blocks, System Transfers |
| **TRON** | Stable | Webhook/Polling based signal detection |
| **Bitcoin** | Beta | Mempool and Block tracking |
| **Cosmos** | Beta | Block monitoring |
| **Sui / Aptos** | Beta | Move-event monitoring |

## Specification: Standardized Signal Kinds

Nostralytics proposes the following namespace for blockchain signals on Nostr:

- **7000–7099**: Network Metrics (Block height, Gas price, Hashrate)
- **7100–7199**: Financial Transfers (Native and Token transfers)
- **7200–7299**: Protocol Actions (Swap, Liquidity, Governance)
- **7300–7399**: Security & Alerts (Large moves, Anomalies)
- **7400–7499**: Aggregate Statistics

## Getting Started

### Prerequisites

- Node.js (v18+)
- Npm or Yarn
- Access to blockchain RPC nodes (Alchemy, QuickNode, or self-hosted)

### Installation

```bash
git clone https://github.com/your-org/nostralytics.git
cd nostralytics
npm install
```

### Configuration

Copy the example environment file and provide your API keys and a Nostr private key.

```bash
cp .env.example .env
```

| Variable | Description |
| :--- | :--- |
| `NOSTR_PRIVATE_KEY` | Hex or `nsec` format. Used to sign all events. |
| `NOSTR_RELAYS` | Comma-separated list of relay URLs. |
| `ETH_RPC_URL` | WebSocket or HTTP URL for Ethereum mainnet. |
| `SOLANA_RPC_URL` | HTTP URL for Solana mainnet. |

### Running the Bus

```bash
# Development mode
npx tsx src/index.ts

# Verification script
npx tsx src/verify.ts
```

## Contributing

Nostralytics is in active development. We welcome contributions to adapters, signal detectors, and documentation. Please ensure that all code follows the established TSDoc conventions and includes appropriate error handling.

## License

This project is licensed under the [ISC License](LICENSE).
