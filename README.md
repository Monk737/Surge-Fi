# Surge Finance

A web app for opening one-click leveraged long/short ETH positions on Ethereum
mainnet. Each user gets their own position contracts (deployed through a
`PositionFactory`), which use Balancer flash loans, Uniswap V3 and Aave V3.

Built with Next.js (Pages Router), wagmi/viem and RainbowKit.

## Requirements

- Node.js 20.9 or newer
- npm 10 or newer

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm start
```

`npm start` serves the production build on <http://localhost:3000>. It builds
automatically first if there is no build yet, or if the source or env files
changed since the last one. Set `PORT` to use a different port.

For development with hot reload, use `npm run dev` instead.

## Configuration

All configuration is through environment variables in `.env.local`
(see `.env.example`).

| Variable | Where it is used | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Browser | WalletConnect Cloud project ID. Without it, WalletConnect-based wallets cannot connect. |
| `NEXT_PUBLIC_FACTORY_ADDRESS` | Browser | Address of the deployed `PositionFactory` proxy. While unset (or the zero address) live trading is disabled and only Demo mode works. |
| `NEXT_PUBLIC_DEPLOYMENT_BLOCK` | Browser | Block the factory was deployed at. Trade history, PnL and the leaderboard scan logs from this block. |
| `RPC_URL` | Server only | Full Ethereum mainnet RPC URL. Takes precedence over `ALCHEMY_KEY`. |
| `ALCHEMY_KEY` | Server only | Alchemy API key (or full Alchemy URL), used when `RPC_URL` is not set. |
| `RPC_RATE_LIMIT_PER_MINUTE` | Server only | Per-IP request limit for `/api/rpc`. Default `1200`; `0` disables it. |

Things to know:

- `NEXT_PUBLIC_*` values are baked into the browser bundle **at build time**.
  If you change them in `.env.local`, `npm start` notices and rebuilds. If you
  change them somewhere else (for example a hosting dashboard), run
  `npm run build` yourself.
- The RPC key never reaches the browser. The app sends all chain reads to its
  own `/api/rpc` route, which forwards them to your provider. That route only
  accepts read methods, caps batch sizes and rate-limits per client IP.
- If neither `RPC_URL` nor `ALCHEMY_KEY` is set, production falls back to a
  public RPC endpoint and logs a warning. That is fine for a smoke test, not
  for real traffic.
- Trade history and the leaderboard call `eth_getLogs` over a wide block range.
  Some RPC plans restrict that; if those sections stay empty, check your
  provider's `eth_getLogs` limits and make sure `NEXT_PUBLIC_DEPLOYMENT_BLOCK`
  is set.

## Deploying

Any host that can run a Node.js server works:

```bash
npm ci
npm run build
npm start
```

- Serve it over HTTPS in production.
- If you run it behind a reverse proxy, forward the client address in
  `X-Forwarded-For`. Otherwise every visitor shares one rate-limit bucket.
- The rate limiter keeps its counters in memory, so it is per process. That is
  what you want for a single `npm start` instance.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Serve the production build (building first when needed). |
| `npm run build` | Create the production build in `.next/`. |
| `npm run dev` | Development server with hot reload. |
| `npm run typecheck` | Type-check the project. |
| `npm run lint` | Lint `src/` with ESLint. |
| `npm run format` | Format `src/` with Prettier. |

## Project layout

```
contracts/        Solidity sources (Position, PositionFactory, PositionConfig, ...)
src/pages/        Routes: /, /positions, /leaderboard, /docs and the /api/rpc proxy
src/views/        Page-level components
src/components/   UI components
src/hooks/        Contract reads and writes (wagmi)
src/lib/abis/     Frontend ABIs — these mirror contracts/*.sol
src/lib/          Constants, wagmi config, formatting and fee helpers
src/services/     Mock data for Demo mode
public/           Static assets
```

### Changing the contracts

`src/lib/abis/PositionABI.ts` and `PositionFactoryABI.ts` must match the
deployed contracts exactly; a mismatch type-checks fine and only shows up as
reverted transactions. Whenever a contract's public interface changes, update
the matching ABI file and the hooks in `src/hooks/` that call it.

## Demo mode

The DEMO / MAINNET switch in the header toggles Demo mode, which uses mock
positions and simulated transactions. Nothing is sent on-chain in Demo mode.
