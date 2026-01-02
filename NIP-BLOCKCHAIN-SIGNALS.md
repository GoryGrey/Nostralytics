# NIP-XX: Blockchain Signal Events

`draft` `optional` `author:GoryGrey`

## Abstract

This NIP defines a set of event kinds and tags for publishing real-time blockchain signals to the Nostr network. This includes metrics, transfers, protocol events (DEX, Lending), and security alerts.

## Motivation

Blockchain data is currently fragmented across proprietary APIs and centralized indexers. By standardizing blockchain signals as Nostr events, developers and AI agents can subscribe to a decentralized, cross-chain data bus with uniform filtering semantics.

## Event Kinds

Nostralytics reserves the `7000–7499` range for blockchain-related signals:

| Kind | Name | Description |
| :--- | :--- | :--- |
| **7000** | `chain_metric` | Network-level metrics (block height, gas price, hashrate). |
| **7100** | `transfer` | Native or fungible token transfers. |
| **7200** | `protocol_action` | Smart contract interactions (swaps, liquidity, governance). |
| **7300** | `security_alert` | Anomalies, flash loans, or security-critical events. |
| **7400** | `aggregate_stats` | Summarized data over a specific time window. |

## Tags

To enable efficient filtering, events SHOULD include the following tags:

- `chain`: The unique identifier of the blockchain (e.g., `eth`, `sol`, `btc`).
- `signal`: The semantic type of the event (e.g., `transfer`, `swap`, `metric`).
- `symbol`: (Optional) The ticker symbol of the asset involved.
- `from`: (Optional) The sender's address or public key.
- `to`: (Optional) The recipient's address or public key.
- `contract`: (Optional) The address of the smart contract or token.
- `txid`: (Optional) The unique transaction identifier on the source chain.
- `block`: (Optional) The block number or height.

## Content

The `.content` field MAY contain a human-readable summary or a JSON-encoded payload providing additional metadata specific to the signal.

## Rationale

The use of specific kind ranges allows for granular filtering at the relay level, while standardized tags ensure that clients can build cross-chain explorers and alert systems without chain-specific logic.
