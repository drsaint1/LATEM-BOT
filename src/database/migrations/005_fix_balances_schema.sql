-- Fix balances table schema to match current code expectations
-- Add token_address column if it doesn't exist

-- Create new balances table with correct schema
CREATE TABLE IF NOT EXISTS balances_new (
    user_telegram_id BIGINT,
    token_symbol VARCHAR(10),
    network VARCHAR(20) DEFAULT 'BASE',
    balance DECIMAL(18,8) DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_telegram_id, token_symbol, network),
    FOREIGN KEY (user_telegram_id) REFERENCES users(telegram_id)
);

-- Copy existing data
INSERT OR IGNORE INTO balances_new (user_telegram_id, token_symbol, network, balance, last_updated)
SELECT user_telegram_id, token_symbol, network, balance, last_updated
FROM balances;

-- Replace old table
DROP TABLE IF EXISTS balances;
ALTER TABLE balances_new RENAME TO balances;