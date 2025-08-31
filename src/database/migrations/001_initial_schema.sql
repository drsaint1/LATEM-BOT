-- Users table
CREATE TABLE IF NOT EXISTS users (
    telegram_id BIGINT PRIMARY KEY,
    username VARCHAR(255),
    wallet_address VARCHAR(42) NOT NULL,
    private_key_encrypted TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_sent DECIMAL(18,8) DEFAULT 0,
    total_received DECIMAL(18,8) DEFAULT 0
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_telegram_id BIGINT,
    to_telegram_id BIGINT,
    amount DECIMAL(18,8) NOT NULL,
    token_symbol VARCHAR(10) NOT NULL,
    token_address VARCHAR(42),
    message TEXT,
    tx_hash VARCHAR(66),
    group_id BIGINT,
    group_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_telegram_id) REFERENCES users(telegram_id),
    FOREIGN KEY (to_telegram_id) REFERENCES users(telegram_id)
);

-- Balances table  
CREATE TABLE IF NOT EXISTS balances (
    user_telegram_id BIGINT,
    token_symbol VARCHAR(10),
    token_address VARCHAR(42),
    balance DECIMAL(18,8) DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_telegram_id, token_symbol),
    FOREIGN KEY (user_telegram_id) REFERENCES users(telegram_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_from_telegram_id ON transactions(from_telegram_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to_telegram_id ON transactions(to_telegram_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_balances_user ON balances(user_telegram_id);