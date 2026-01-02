# Contributing to Nostralytics

Thank you for your interest in contributing to Nostralytics! We aim to build the most resilient and professional decentralized signal infrastructure for the blockchain ecosystem.

## How to Contribute

### 1. Adding New Adapters
We are always looking for new blockchain adapters. When adding a new adapter:
- Inherit from `BaseChainAdapter`.
- Use the standardized `NormalizedSignal` schema.
- Implement robust error handling and automatic reconnection logic.
- Use `picocolors` for consistent, aesthetic logging.

### 2. Signal Detectors
Help us expand the "Signal Engine" by adding logic to detect:
- Large liquidations.
- Governance proposal updates.
- Flash loan activity.
- Whale movements across specific protocols.

### 3. Documentation
Improvements to the README, White Paper, or NIP draft are highly encouraged.

## Development Workflow

1. **Fork and Clone**: Create your feature branch from `main`.
2. **Standardize**: Ensure all code uses TSDoc for documentation.
3. **Verify**: Use `npm run lint` and `npm run build` before submitting.
4. **Pull Request**: Open a PR with a clear description of the change.

## Code Style
- Use **TypeScript** for all logic.
- Follow **TSDoc** conventions for classes and methods.
- Keep components focused and modular.
- Use **Standardized Signal Kinds** (7000-7499) as defined in our specification.

## Licensing
By contributing to Nostralytics, you agree that your contributions will be licensed under the project's **ISC License**.
