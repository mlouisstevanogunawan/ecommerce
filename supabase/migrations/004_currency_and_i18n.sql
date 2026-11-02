-- Migration 004: Support multi-currency audit and exchange rate tracking on orders
ALTER TABLE IF EXISTS orders 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

ALTER TABLE IF EXISTS orders 
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(14, 6) DEFAULT 1.0;

COMMENT ON COLUMN orders.currency IS 'Display currency selected by customer at checkout';
COMMENT ON COLUMN orders.exchange_rate IS 'Exchange rate applied against base USD at time of purchase';
