
const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

// Ponytail: Global singleton connection. Avoids complex connection pooling or ORMs.
const dbPath = path.join(app.getPath('userData'), 'merchantgo.db');
const db = new Database(dbPath, { verbose: process.env.VITE_DEV ? console.log : null });

// WAL mode for crash recovery as requested
db.pragma('journal_mode = WAL');

// Ponytail: One migration function instead of a complex migration framework. 
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'cashier', 'waiter')),
      account_type TEXT NOT NULL CHECK (account_type IN ('solo', 'team')),
      business_id TEXT NOT NULL,
      pin_code TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS device_enrollments (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      business_id TEXT NOT NULL,
      enrolled_by TEXT NOT NULL,
      device_type TEXT NOT NULL CHECK (device_type IN ('desktop', 'mobile')),
      mode TEXT NOT NULL CHECK (mode IN ('standard', 'cashier')),
      enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_active_at DATETIME,
      is_active BOOLEAN DEFAULT 1,
      FOREIGN KEY (enrolled_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_role TEXT NOT NULL CHECK (user_role IN ('cashier', 'waiter')),
      start_time DATETIME NOT NULL,
      end_time DATETIME,
      start_sales_amount DECIMAL(10,2) DEFAULT 0,
      end_sales_amount DECIMAL(10,2),
      total_sales DECIMAL(10,2) DEFAULT 0,
      status TEXT NOT NULL CHECK (status IN ('active', 'ended')),
      z_report_generated BOOLEAN DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT NOT NULL,
      business_id TEXT NOT NULL,
      waiter_id TEXT,
      cashier_id TEXT,
      table_number TEXT,
      status TEXT NOT NULL CHECK (status IN ('new', 'in_progress', 'ready', 'closed', 'cancelled')),
      payment_status TEXT NOT NULL CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
      total_amount DECIMAL(10,2) NOT NULL,
      paid_amount DECIMAL(10,2) DEFAULT 0,
      discount DECIMAL(10,2) DEFAULT 0,
      tip DECIMAL(10,2) DEFAULT 0,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME,
      FOREIGN KEY (waiter_id) REFERENCES users(id),
      FOREIGN KEY (cashier_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      modifiers TEXT,
      notes TEXT,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      cashier_id TEXT NOT NULL,
      waiter_id TEXT,
      amount_received DECIMAL(10,2) NOT NULL,
      change_amount DECIMAL(10,2) NOT NULL,
      payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'transfer')),
      receipt_number TEXT,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (cashier_id) REFERENCES users(id),
      FOREIGN KEY (waiter_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS z_reports (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      generated_by TEXT NOT NULL,
      shift_id TEXT NOT NULL,
      period_start DATETIME NOT NULL,
      period_end DATETIME NOT NULL,
      total_sales DECIMAL(10,2) NOT NULL,
      total_orders INTEGER NOT NULL,
      total_transactions INTEGER NOT NULL,
      payment_methods TEXT NOT NULL,
      top_waiters TEXT NOT NULL,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shift_id) REFERENCES shifts(id)
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
      data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      attempts INTEGER DEFAULT 0,
      last_attempt_at DATETIME,
      status TEXT NOT NULL DEFAULT 'pending'
    );
  `);
}

module.exports = {
  db,
  initDatabase
};

