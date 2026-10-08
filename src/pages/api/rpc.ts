import type { NextApiRequest, NextApiResponse } from 'next';

// Same-origin JSON-RPC proxy. The browser talks to /api/rpc, so the provider key
// stays on the server. Because this endpoint is public, it only forwards the
// read methods the app needs, caps batch size, and rate-limits per client.

export const config = {
  api: { bodyParser: { sizeLimit: '512kb' } },
};

const ALLOWED_METHODS = new Set([
  'eth_blockNumber',
  'eth_call',
  'eth_chainId',
  'eth_createAccessList',
  'eth_estimateGas',
  'eth_feeHistory',
  'eth_gasPrice',
  'eth_getBalance',
  'eth_getBlockByHash',
  'eth_getBlockByNumber',
  'eth_getCode',
  'eth_getFilterChanges',
  'eth_getFilterLogs',
  'eth_getLogs',
  'eth_getStorageAt',
  'eth_getTransactionByHash',
  'eth_getTransactionCount',
  'eth_getTransactionReceipt',
  'eth_maxPriorityFeePerGas',
  'eth_newBlockFilter',
  'eth_newFilter',
  'eth_sendRawTransaction',
  'eth_uninstallFilter',
  'net_version',
  'web3_clientVersion',
]);

const MAX_BATCH_SIZE      = 50;
const UPSTREAM_TIMEOUT_MS = 20_000;
const PUBLIC_FALLBACK_RPC = 'https://ethereum-rpc.publicnode.com';

// Requests per client IP per minute. Set RPC_RATE_LIMIT_PER_MINUTE=0 to disable.
const rateLimitEnv = Number(process.env.RPC_RATE_LIMIT_PER_MINUTE);
const RATE_LIMIT   = Number.isFinite(rateLimitEnv) && process.env.RPC_RATE_LIMIT_PER_MINUTE ? rateLimitEnv : 1200;
const WINDOW_MS    = 60_000;
const hits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string, cost: number): boolean {
  if (RATE_LIMIT <= 0) return false;
  const now = Date.now();
  let entry = hits.get(ip);
  if (!entry || now >= entry.resetAt) {
    if (hits.size > 10_000) {
      for (const [key, value] of hits) if (now >= value.resetAt) hits.delete(key);
      if (hits.size > 10_000) hits.clear();
    }
    entry = { count: 0, resetAt: now + WINDOW_MS };
    hits.set(ip, entry);
  }
  entry.count += cost;
  return entry.count > RATE_LIMIT;
}

function clientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
  return first || req.socket.remoteAddress || 'unknown';
}

let warnedAboutFallback = false;

function resolveRpcUrl(): string {
  const explicit = process.env.RPC_URL?.trim();
  if (explicit) return explicit;

  // Server-only names on purpose: a NEXT_PUBLIC_ variable would be inlined into the build output.
  const key = (process.env.ALCHEMY_KEY || '').trim();
  if (key && key !== 'undefined' && !key.startsWith('your_')) {
    return key.startsWith('http') ? key : `https://eth-mainnet.g.alchemy.com/v2/${key}`;
  }

  if (process.env.NODE_ENV === 'development') return 'http://127.0.0.1:8545';

  if (!warnedAboutFallback) {
    warnedAboutFallback = true;
    console.warn('[rpc] RPC_URL / ALCHEMY_KEY is not set — falling back to a public RPC endpoint. Set one for production traffic.');
  }
  return PUBLIC_FALLBACK_RPC;
}

function rpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  res.setHeader('Cache-Control', 'no-store');

  const body = req.body;
  const calls = Array.isArray(body) ? body : [body];
  if (calls.length === 0 || calls.length > MAX_BATCH_SIZE) {
    return res.status(400).json(rpcError(null, -32600, 'Invalid request'));
  }
  for (const call of calls) {
    if (!call || typeof call !== 'object' || typeof call.method !== 'string') {
      return res.status(400).json(rpcError(null, -32600, 'Invalid request'));
    }
    if (!ALLOWED_METHODS.has(call.method)) {
      return res.status(403).json(rpcError(call.id, -32601, `Method ${call.method} is not allowed`));
    }
  }

  if (isRateLimited(clientIp(req), calls.length)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json(rpcError(null, -32005, 'Rate limit exceeded'));
  }

  try {
    const response = await fetch(resolveRpcUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error: any) {
    // Log the failure, but never echo upstream details (the URL embeds the provider key).
    console.error('[rpc] upstream request failed:', error?.name ?? 'Error');
    res.status(502).json(rpcError(null, -32603, 'Upstream RPC request failed'));
  }
}
