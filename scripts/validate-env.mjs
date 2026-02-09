const enabled = (process.env.PAYMENTS_ENABLED ?? 'false').toLowerCase() === 'true';

if (!enabled) {
  console.log('[env] PAYMENTS_ENABLED=false, payments vars not required');
  process.exit(0);
}

const required = ['STRIPE_SECRET_KEY', 'STRIPE_GOLD_PRICE_ID', 'NEXT_PUBLIC_BASE_URL', 'GOLD_TOKEN_SECRET'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error('[env] Missing required vars for payments:');
  missing.forEach((key) => console.error(`- ${key}`));
  process.exit(1);
}

console.log('[env] required payments vars present');
