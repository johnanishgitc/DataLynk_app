import * as SQLite from 'expo-sqlite';

// Types for voucher data
export interface VoucherEntry {
  mstid: string;
  vchno: string;
  date: string; // YYYY-MM-DD format
  party: string;
  state: string;
  country: string;
  gstno: string;
  partyid: string;
  amt: number; // Parsed amount
  vchtype: string;
  issale: string;
  pincode: string;
  createdAt: string;
}

export interface VoucherLedgerEntry {
  id?: number;
  voucherMstid: string;
  ledger: string;
  ledgerid: string;
  amt: number; // Parsed amount
  deemd: string;
  isprty: string;
  createdAt: string;
}

export interface VoucherInventoryEntry {
  id?: number;
  voucherMstid: string;
  ledgerid: string;
  item: string;
  itemid: string;
  uom: string;
  qty: number; // Parsed quantity
  amt: number; // Parsed amount
  deemd: string;
  group: string;
  groupofgroup: string;
  category: string;
  createdAt: string;
}

export interface VoucherSummaryEntry {
  id?: number;
  voucherMstid: string;
  date: string;
  party: string;
  partyid: string;
  vchtype: string;
  totalAmount: number;
  salesAmount: number;
  gstAmount: number;
  itemCount: number;
  createdAt: string;
}

class VoucherDataService {
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null; // Lock to prevent concurrent initialization

  async initialize(): Promise<void> {
    // If initialization is already in progress, wait for it
    if (this.initPromise) {
      console.log('📱 Initialization already in progress, waiting...');
      return this.initPromise;
    }

    // If already initialized with a valid connection, skip
    if (this.isInitialized && this.db) {
      // Quick health check: try a simple query to verify connection is still valid
      try {
        this.db.getAllSync('SELECT 1');
        console.log('📱 VoucherDataService already initialized');
        return;
      } catch (error) {
        // Connection is corrupted, force re-initialization
        console.log('📱 Database connection invalid, forcing re-initialization...', error);
        this.isInitialized = false;
        if (this.db) {
          try {
            this.db.closeSync();
          } catch (closeError) {
            // Ignore close errors
          }
          this.db = null;
        }
      }
    }

    // Create initialization promise to prevent concurrent calls
    this.initPromise = (async () => {
      try {
        console.log('📱 Initializing VoucherDataService...');
        // Always open a fresh connection
        if (this.db) {
          try {
            this.db.closeSync();
          } catch (closeError) {
            // Ignore close errors
          }
        }
        console.log('📱 Opening database connection...');
        this.db = SQLite.openDatabaseSync('VoucherData.db');
        console.log('📱 Database opened, connection:', this.db ? 'valid' : 'null');
        
        // Verify database connection is valid before proceeding
        if (!this.db) {
          throw new Error('Failed to open database connection: returned null');
        }
        
        // Verify connection works by running a simple query
        try {
          this.db.getAllSync('SELECT 1');
        } catch (testError) {
          throw new Error(`Database connection invalid: ${testError}`);
        }
        
        // Create tables - this will throw if it fails
        console.log('📱 Starting table creation...');
        this.createTables();
        console.log('📱 Table creation completed');
        
        // Verify database is still usable after creating tables
        if (!this.db) {
          throw new Error('Database connection lost during table creation');
        }
        
        // Test one more time that we can query
        try {
          this.db.getAllSync('SELECT 1');
        } catch (testError) {
          throw new Error(`Database connection invalid after table creation: ${testError}`);
        }
        
        this.isInitialized = true;
        console.log('✅ VoucherDataService initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize VoucherDataService');
        // Log detailed error information
        if (error instanceof Error) {
          console.error('❌ Error message:', error.message);
          if (error.stack) {
            console.error('❌ Error stack (first 500 chars):', error.stack.substring(0, 500));
          }
        } else {
          console.error('❌ Error (non-Error object):', String(error));
        }
        // Reset state on failure
        this.isInitialized = false;
        if (this.db) {
          try {
            this.db.closeSync();
          } catch (closeError) {
            // Ignore close errors
          }
        }
        this.db = null;
        // Clear the promise so subsequent calls can try again
        this.initPromise = null;
        // Re-throw the error so callers know initialization failed
        throw error;
      } finally {
        // Only clear promise if we're not already clearing it in the catch block
        // (we clear it in catch to allow retries, but if we succeed, clear it here)
        if (this.isInitialized && this.db) {
          this.initPromise = null;
        }
      }
    })();

    return this.initPromise;
  }

  private createTables(): void {
    if (!this.db) {
      const error = new Error('Database connection is null in createTables');
      console.error('❌ Database not initialized in createTables', error);
      throw error;
    }

    try {
      // Create vouchers table
      this.db.execSync(`
        CREATE TABLE IF NOT EXISTS vouchers (
          mstid TEXT PRIMARY KEY,
          alterid TEXT,
          vchno TEXT NOT NULL,
          date TEXT NOT NULL,
          party TEXT NOT NULL,
          state TEXT,
          country TEXT,
          gstno TEXT,
          partyid TEXT,
          amt REAL NOT NULL,
          vchtype TEXT,
          reservedname TEXT,
          issale TEXT,
          pincode TEXT,
          isoptional TEXT,
          iscancelled TEXT,
          company_guid TEXT NOT NULL,
          tallyloc_id INTEGER NOT NULL,
          createdAt TEXT NOT NULL
        )
      `);

      // Add company columns if they don't exist (migration)
      try {
        this.db.execSync(`ALTER TABLE vouchers ADD COLUMN company_guid TEXT`);
        this.db.execSync(`ALTER TABLE vouchers ADD COLUMN tallyloc_id INTEGER`);
        console.log('📱 Added company columns to vouchers table');
      } catch (error) {
        // Columns already exist, ignore error
        console.log('📱 Company columns already exist in vouchers table');
      }

      // Create ledgers table
      this.db.execSync(`
        CREATE TABLE IF NOT EXISTS ledgers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          voucher_id TEXT NOT NULL,
          ledger TEXT NOT NULL,
          ledgerid TEXT NOT NULL,
          amt REAL NOT NULL,
          deemd TEXT,
          isprty TEXT,
          company_guid TEXT NOT NULL,
          tallyloc_id INTEGER NOT NULL,
          createdAt TEXT NOT NULL,
          FOREIGN KEY (voucher_id) REFERENCES vouchers (mstid)
        )
      `);

      // Add company columns if they don't exist (migration)
      try {
        this.db.execSync(`ALTER TABLE ledgers ADD COLUMN company_guid TEXT`);
        this.db.execSync(`ALTER TABLE ledgers ADD COLUMN tallyloc_id INTEGER`);
        console.log('📱 Added company columns to ledgers table');
      } catch (error) {
        // Columns already exist, ignore error
        console.log('📱 Company columns already exist in ledgers table');
      }

      // Create inventories table
      this.db.execSync(`
        CREATE TABLE IF NOT EXISTS inventories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ledger_id TEXT NOT NULL,
          item TEXT NOT NULL,
          itemid TEXT NOT NULL,
          uom TEXT,
          qty REAL NOT NULL,
          amt REAL NOT NULL,
          deemd TEXT,
          group_name TEXT,
          groupofgroup TEXT,
          category TEXT,
          company_guid TEXT NOT NULL,
          tallyloc_id INTEGER NOT NULL,
          createdAt TEXT NOT NULL,
          FOREIGN KEY (ledger_id) REFERENCES ledgers (ledgerid)
        )
      `);

      // Add company columns if they don't exist (migration)
      try {
        this.db.execSync(`ALTER TABLE inventories ADD COLUMN company_guid TEXT`);
        this.db.execSync(`ALTER TABLE inventories ADD COLUMN tallyloc_id INTEGER`);
        console.log('📱 Added company columns to inventories table');
      } catch (error) {
        // Columns already exist, ignore error
        console.log('📱 Company columns already exist in inventories table');
      }

      // Create voucher_summary table for quick reporting
      this.db.execSync(`
        CREATE TABLE IF NOT EXISTS voucher_summary (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          voucher_id TEXT NOT NULL,
          date TEXT NOT NULL,
          party TEXT NOT NULL,
          partyid TEXT NOT NULL,
          vchtype TEXT,
          totalAmount REAL NOT NULL,
          salesAmount REAL NOT NULL,
          gstAmount REAL NOT NULL,
          itemCount INTEGER NOT NULL,
          company_guid TEXT NOT NULL,
          tallyloc_id INTEGER NOT NULL,
          createdAt TEXT NOT NULL,
          FOREIGN KEY (voucher_id) REFERENCES vouchers (mstid)
        )
      `);

      // Add company columns if they don't exist (migration)
      try {
        this.db.execSync(`ALTER TABLE voucher_summary ADD COLUMN company_guid TEXT`);
        this.db.execSync(`ALTER TABLE voucher_summary ADD COLUMN tallyloc_id INTEGER`);
        console.log('📱 Added company columns to voucher_summary table');
      } catch (error) {
        // Columns already exist, ignore error
        console.log('📱 Company columns already exist in voucher_summary table');
      }

      // Drop and recreate the table if it has the old structure
      try {
        const tableInfo = this.db.getAllSync(`PRAGMA table_info(voucher_summary)`);
        const hasOldStructure = tableInfo.some((column: any) => column.name === 'voucherMstid');
        
        if (hasOldStructure) {
          console.log('📱 Dropping old voucher_summary table structure...');
          this.db.execSync(`DROP TABLE IF EXISTS voucher_summary`);
          
          this.db.execSync(`
            CREATE TABLE voucher_summary (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              voucher_id TEXT NOT NULL,
              date TEXT NOT NULL,
              party TEXT NOT NULL,
              partyid TEXT NOT NULL,
              vchtype TEXT,
              totalAmount REAL NOT NULL,
              salesAmount REAL NOT NULL,
              gstAmount REAL NOT NULL,
              itemCount INTEGER NOT NULL,
              createdAt TEXT NOT NULL,
              FOREIGN KEY (voucher_id) REFERENCES vouchers (mstid)
            )
          `);
          console.log('📱 Recreated voucher_summary table with correct structure');
        }
      } catch (error) {
        console.log('📱 Error checking table structure:', error);
      }

      // Create indexes for better performance
      this.db.execSync(`CREATE INDEX IF NOT EXISTS idx_vouchers_date ON vouchers (date)`);
      this.db.execSync(`CREATE INDEX IF NOT EXISTS idx_vouchers_party ON vouchers (party)`);
      this.db.execSync(`CREATE INDEX IF NOT EXISTS idx_vouchers_vchtype ON vouchers (vchtype)`);
      this.db.execSync(`CREATE INDEX IF NOT EXISTS idx_ledgers_voucher ON ledgers (voucher_id)`);
      this.db.execSync(`CREATE INDEX IF NOT EXISTS idx_inventories_ledger ON inventories (ledger_id)`);
      this.db.execSync(`CREATE INDEX IF NOT EXISTS idx_inventories_item ON inventories (itemid)`);
      this.db.execSync(`CREATE INDEX IF NOT EXISTS idx_inventories_group ON inventories (group_name)`);
      this.db.execSync(`CREATE INDEX IF NOT EXISTS idx_inventories_category ON inventories (category)`);
      this.db.execSync(`CREATE INDEX IF NOT EXISTS idx_voucher_summary_date ON voucher_summary (date)`);
      this.db.execSync(`CREATE INDEX IF NOT EXISTS idx_voucher_summary_party ON voucher_summary (party)`);

      // Create UNIQUE indexes on business keys for proper upsert logic
      try {
        // voucher_summary: one summary per voucher per company
        this.db.execSync(`CREATE UNIQUE INDEX IF NOT EXISTS idx_voucher_summary_unique ON voucher_summary (voucher_id, company_guid, tallyloc_id)`);
        console.log('📱 Created UNIQUE index on voucher_summary business keys');
      } catch (error) {
        console.log('📱 Error creating voucher_summary UNIQUE index:', error);
      }

      try {
        // ledgers: one ledger entry per voucher_id + ledgerid combination per company
        this.db.execSync(`CREATE UNIQUE INDEX IF NOT EXISTS idx_ledgers_unique ON ledgers (voucher_id, ledgerid, company_guid, tallyloc_id)`);
        console.log('📱 Created UNIQUE index on ledgers business keys');
      } catch (error) {
        console.log('📱 Error creating ledgers UNIQUE index:', error);
      }

      try {
        // inventories: one inventory entry per ledger_id + itemid combination per company
        this.db.execSync(`CREATE UNIQUE INDEX IF NOT EXISTS idx_inventories_unique ON inventories (ledger_id, itemid, company_guid, tallyloc_id)`);
        console.log('📱 Created UNIQUE index on inventories business keys');
      } catch (error) {
        console.log('📱 Error creating inventories UNIQUE index:', error);
      }

      // Migration: Fix amounts stored as strings (convert to REAL)
      // SQLite stores REAL columns correctly, but if data was inserted as strings with commas,
      // we need to recast them. Run this migration after all tables are created.
      // This is safe - it only updates rows that can be converted and checks table existence first.
      try {
        const tables = this.db.getAllSync(`SELECT name FROM sqlite_master WHERE type='table' AND name IN ('vouchers', 'ledgers', 'inventories')`) as Array<{ name: string }>;
        const tableNames = tables.map(t => t.name);

        if (tableNames.includes('vouchers')) {
          try {
            const voucherCount = this.db.getFirstSync(`SELECT COUNT(*) as cnt FROM vouchers`) as any;
            if (voucherCount && voucherCount.cnt > 0) {
              this.db.execSync(`
                UPDATE vouchers 
                SET amt = CASE 
                  WHEN CAST(amt AS TEXT) LIKE '%,%' OR CAST(amt AS TEXT) LIKE '%₹%' OR CAST(amt AS TEXT) LIKE '% %'
                  THEN CAST(REPLACE(REPLACE(REPLACE(CAST(amt AS TEXT), ',', ''), '₹', ''), ' ', '') AS REAL)
                  ELSE CAST(amt AS REAL)
                END
                WHERE amt IS NOT NULL
              `);
              console.log('📱 Migrated voucher amounts from string to REAL');
            }
          } catch (e) {
            // Skip if migration fails
          }
        }

        if (tableNames.includes('ledgers')) {
          try {
            const ledgerCount = this.db.getFirstSync(`SELECT COUNT(*) as cnt FROM ledgers`) as any;
            if (ledgerCount && ledgerCount.cnt > 0) {
              this.db.execSync(`
                UPDATE ledgers 
                SET amt = CASE 
                  WHEN CAST(amt AS TEXT) LIKE '%,%' OR CAST(amt AS TEXT) LIKE '%₹%' OR CAST(amt AS TEXT) LIKE '% %'
                  THEN CAST(REPLACE(REPLACE(REPLACE(CAST(amt AS TEXT), ',', ''), '₹', ''), ' ', '') AS REAL)
                  ELSE CAST(amt AS REAL)
                END
                WHERE amt IS NOT NULL
              `);
              console.log('📱 Migrated ledger amounts from string to REAL');
            }
          } catch (e) {
            // Skip if migration fails
          }
        }

        if (tableNames.includes('inventories')) {
          try {
            const invCount = this.db.getFirstSync(`SELECT COUNT(*) as cnt FROM inventories`) as any;
            if (invCount && invCount.cnt > 0) {
              this.db.execSync(`
                UPDATE inventories 
                SET amt = CASE 
                  WHEN CAST(amt AS TEXT) LIKE '%,%' OR CAST(amt AS TEXT) LIKE '%₹%' OR CAST(amt AS TEXT) LIKE '% %'
                  THEN CAST(REPLACE(REPLACE(REPLACE(CAST(amt AS TEXT), ',', ''), '₹', ''), ' ', '') AS REAL)
                  ELSE CAST(amt AS REAL)
                END,
                qty = CASE 
                  WHEN CAST(qty AS TEXT) LIKE '%,%' OR CAST(qty AS TEXT) LIKE '%₹%' OR CAST(qty AS TEXT) LIKE '% %'
                  THEN CAST(REPLACE(REPLACE(REPLACE(CAST(qty AS TEXT), ',', ''), '₹', ''), ' ', '') AS REAL)
                  ELSE CAST(qty AS REAL)
                END
                WHERE amt IS NOT NULL OR qty IS NOT NULL
              `);
              console.log('📱 Migrated inventory amounts and qty from string to REAL');
            }
          } catch (e) {
            // Skip if migration fails
          }
        }
      } catch (error) {
        // Migration is optional - don't fail initialization if it errors
        console.log('📱 Amount migration skipped (optional)');
      }

      // Legacy performance indexes (pre-denormalization) to keep drilldown fast
      // Only create indexes if columns exist
      try {
        const invCols = this.db.getAllSync(`PRAGMA table_info(inventories)`) as Array<{ name: string }>;
        const has = (n: string) => invCols.some(c => c.name === n);
        if (has('date')) {
          this.db.execSync(`CREATE INDEX IF NOT EXISTS idx_inv_company_date_legacy ON inventories (company_guid, tallyloc_id, date)`);
        }
        if (has('item')) {
          this.db.execSync(`CREATE INDEX IF NOT EXISTS idx_inv_company_item_legacy ON inventories (company_guid, tallyloc_id, item)`);
        }
        if (has('party')) {
          this.db.execSync(`CREATE INDEX IF NOT EXISTS idx_inv_company_party_legacy ON inventories (company_guid, tallyloc_id, party)`);
        }
      } catch {}

      // Add missing columns if they don't exist (migration)
      try {
        this.db.execSync(`ALTER TABLE vouchers ADD COLUMN alterid TEXT`);
        console.log('📱 Added alterid column to vouchers table');
      } catch (error) {
        console.log('📱 alterid column already exists or error adding:', error);
      }

      try {
        this.db.execSync(`ALTER TABLE vouchers ADD COLUMN reservedname TEXT`);
        console.log('📱 Added reservedname column to vouchers table');
      } catch (error) {
        console.log('📱 reservedname column already exists or error adding:', error);
      }

      try {
        this.db.execSync(`ALTER TABLE vouchers ADD COLUMN isoptional TEXT`);
        console.log('📱 Added isoptional column to vouchers table');
      } catch (error) {
        console.log('📱 isoptional column already exists or error adding:', error);
      }

      try {
        this.db.execSync(`ALTER TABLE vouchers ADD COLUMN iscancelled TEXT`);
        console.log('📱 Added iscancelled column to vouchers table');
      } catch (error) {
        console.log('📱 iscancelled column already exists or error adding:', error);
      }

      // Add ALL missing columns to voucher_summary table based on API response
      const voucherSummaryColumns = [
        'voucher_id', 'alterid', 'vchno', 'date', 'party', 'state', 'country', 
        'gstno', 'partyid', 'amt', 'vchtype', 'reservedname', 'issale', 'pincode', 
        'isoptional', 'iscancelled'
      ];

      voucherSummaryColumns.forEach(column => {
        try {
          this.db.execSync(`ALTER TABLE voucher_summary ADD COLUMN ${column} TEXT`);
          console.log(`📱 Added ${column} column to voucher_summary table`);
        } catch (error) {
          console.log(`📱 ${column} column already exists or error adding:`, error);
        }
      });

      // Add ALL missing columns to vouchers table based on API response
      const voucherColumns = [
        'mstid', 'alterid', 'vchno', 'date', 'party', 'state', 'country', 
        'gstno', 'partyid', 'amt', 'vchtype', 'reservedname', 'issale', 'pincode', 
        'isoptional', 'iscancelled'
      ];

      voucherColumns.forEach(column => {
        try {
          this.db.execSync(`ALTER TABLE vouchers ADD COLUMN ${column} TEXT`);
          console.log(`📱 Added ${column} column to vouchers table`);
        } catch (error) {
          console.log(`📱 ${column} column already exists or error adding:`, error);
        }
      });

      // Add ALL missing columns to ledgers table based on API response
      const ledgerColumns = [
        'voucher_id', 'ledger', 'ledgerid', 'amt', 'deemd', 'isprty'
      ];

      ledgerColumns.forEach(column => {
        try {
          this.db.execSync(`ALTER TABLE ledgers ADD COLUMN ${column} TEXT`);
          console.log(`📱 Added ${column} column to ledgers table`);
        } catch (error) {
          console.log(`📱 ${column} column already exists or error adding:`, error);
        }
      });

      // Add ALL missing columns to inventories table based on API response
      const inventoryColumns = [
        'ledger_id', 'item', 'itemid', 'uom', 'qty', 'amt', 'deemd', 
        'group', 'groupofgroup', 'category'
      ];

      inventoryColumns.forEach(column => {
        try {
          this.db.execSync(`ALTER TABLE inventories ADD COLUMN ${column} TEXT`);
          console.log(`📱 Added ${column} column to inventories table`);
        } catch (error) {
          console.log(`📱 ${column} column already exists or error adding:`, error);
        }
      });

      // Run full rebuild migration (denormalized inventories + aggregates) if not yet applied
      this.runFullRebuildMigrationIfNeeded();

      console.log('✅ VoucherDataService tables created successfully');
    } catch (error) {
      console.error('❌ Failed to create voucher tables:', error);
      throw error;
    }
  }

  private runFullRebuildMigrationIfNeeded(): void {
    if (!this.db) return;
    try {
      console.log('🔧 Checking full rebuild migration (inventories denorm + aggregates)...');
      const info = this.db.getAllSync(`PRAGMA table_info(inventories)`) as Array<{ name: string }>;
      const hasDateIso = info.some((c) => c.name === 'date_iso');
      if (hasDateIso) {
        console.log('⏭️ Full rebuild migration skipped: inventories already denormalized.');
        return; // already migrated
      }

      console.log('🚧 Running full rebuild migration (this can take a moment)...');

      // Build SQL expressions to parse existing vouchers.date format 'D-Mmm-YY'
      const yearExpr = "(2000 + CAST(substr(v.date, length(v.date)-1, 2) AS INTEGER))";
      const monStrExpr = "substr(v.date, instr(v.date,'-')+1, 3)";
      const dayExpr = "CAST(substr(v.date, 1, instr(v.date,'-')-1) AS INTEGER)";
      const monthNumExpr = `(
        CASE ${monStrExpr}
          WHEN 'Jan' THEN 1 WHEN 'Feb' THEN 2 WHEN 'Mar' THEN 3 WHEN 'Apr' THEN 4 WHEN 'May' THEN 5 WHEN 'Jun' THEN 6
          WHEN 'Jul' THEN 7 WHEN 'Aug' THEN 8 WHEN 'Sep' THEN 9 WHEN 'Oct' THEN 10 WHEN 'Nov' THEN 11 WHEN 'Dec' THEN 12
          ELSE 0 END
      )`;
      const dateIsoExpr = `printf('%04d-%02d-%02d', ${yearExpr}, ${monthNumExpr}, ${dayExpr})`;
      const dayKeyExpr = dateIsoExpr;
      const weekKeyExpr = `(${yearExpr} || '-W' || substr('00' || ((CAST(strftime('%W', ${dateIsoExpr}) AS INTEGER))), -2, 2))`;
      const monthKeyExpr = `(${yearExpr} || '-' || substr('00' || ${monthNumExpr}, -2, 2))`;
      const quarterKeyExpr = `(${yearExpr} || '-Q' || (((${monthNumExpr}-1)/3)+1))`;

      this.db.execSync(`PRAGMA foreign_keys = OFF; BEGIN TRANSACTION;`);

      // Ensure a clean staging table
      this.db.execSync(`DROP TABLE IF EXISTS inventories_new;`);

      // 1) Create new inventories table with denormalized/reporting columns
      this.db.execSync(`
        CREATE TABLE IF NOT EXISTS inventories_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ledger_id TEXT NOT NULL,
          item TEXT NOT NULL,
          itemid TEXT NOT NULL,
          uom TEXT,
          qty REAL NOT NULL,
          amt REAL NOT NULL,
          deemd TEXT,
          group_name TEXT,
          groupofgroup TEXT,
          category TEXT,
          company_guid TEXT NOT NULL,
          tallyloc_id INTEGER NOT NULL,
          createdAt TEXT NOT NULL,
          voucher_id TEXT,
          date_iso TEXT,
          date_ts INTEGER,
          day TEXT,
          week TEXT,
          month TEXT,
          quarter TEXT,
          party TEXT,
          partyid TEXT
        );
      `);

      // 2) Populate inventories_new by joining existing tables and computing period keys
      this.db.execSync(`
        INSERT INTO inventories_new (
          ledger_id, item, itemid, uom, qty, amt, deemd, group_name, groupofgroup, category,
          company_guid, tallyloc_id, createdAt,
          voucher_id, date_iso, date_ts, day, week, month, quarter, party, partyid
        )
        SELECT 
          i.ledger_id,
          i.item,
          i.itemid,
          i.uom,
          i.qty,
          i.amt,
          i.deemd,
          i.group_name,
          i.groupofgroup,
          i.category,
          i.company_guid,
          i.tallyloc_id,
          i.createdAt,
          v.mstid AS voucher_id,
          ${dateIsoExpr} AS date_iso,
          CAST(strftime('%s', ${dateIsoExpr}) AS INTEGER) AS date_ts,
          ${dayKeyExpr} AS day,
          ${weekKeyExpr} AS week,
          ${monthKeyExpr} AS month,
          ${quarterKeyExpr} AS quarter,
          v.party AS party,
          v.partyid AS partyid
        FROM inventories AS i
        LEFT JOIN ledgers AS l ON i.ledger_id = l.ledgerid
        LEFT JOIN vouchers AS v ON l.voucher_id = v.mstid;
      `);

      // 3) Replace old inventories table
      this.db.execSync(`DROP TABLE IF EXISTS inventories;`);
      this.db.execSync(`ALTER TABLE inventories_new RENAME TO inventories;`);

      // 4) Create aggregate_facts
      this.db.execSync(`
        CREATE TABLE IF NOT EXISTS aggregate_facts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company_guid TEXT NOT NULL,
          tallyloc_id INTEGER NOT NULL,
          period_type TEXT NOT NULL,
          period_value TEXT NOT NULL,
          partyid TEXT,
          itemid TEXT,
          group_name TEXT,
          groupofgroup TEXT,
          category TEXT,
          total_amount REAL DEFAULT 0,
          qty_sum REAL DEFAULT 0,
          item_count INTEGER DEFAULT 0,
          createdAt TEXT,
          UNIQUE(company_guid, tallyloc_id, period_type, period_value, partyid, itemid, group_name, groupofgroup, category)
        );
      `);

      // 5) Indexes
      this.db.execSync(`CREATE INDEX IF NOT EXISTS idx_inv_company_month_party ON inventories(company_guid, tallyloc_id, month, partyid, itemid);`);
      this.db.execSync(`CREATE INDEX IF NOT EXISTS idx_inv_company_day ON inventories(company_guid, tallyloc_id, day);`);
      this.db.execSync(`CREATE INDEX IF NOT EXISTS idx_inv_company_group ON inventories(company_guid, tallyloc_id, group_name, groupofgroup);`);
      this.db.execSync(`CREATE INDEX IF NOT EXISTS idx_inv_company_category ON inventories(company_guid, tallyloc_id, category);`);
      this.db.execSync(`CREATE INDEX IF NOT EXISTS idx_inv_date_ts ON inventories(company_guid, tallyloc_id, date_ts);`);
      this.db.execSync(`CREATE INDEX IF NOT EXISTS idx_agg_company_period ON aggregate_facts(company_guid, tallyloc_id, period_type, period_value);`);
      this.db.execSync(`CREATE INDEX IF NOT EXISTS idx_agg_party ON aggregate_facts(company_guid, tallyloc_id, period_type, period_value, partyid);`);
      this.db.execSync(`CREATE INDEX IF NOT EXISTS idx_agg_category ON aggregate_facts(company_guid, tallyloc_id, period_type, period_value, category);`);

      // 6) Trigger for incremental upserts on inventories insert (month and day)
      this.db.execSync(`
        CREATE TRIGGER IF NOT EXISTS trg_inv_after_insert
        AFTER INSERT ON inventories
        BEGIN
          INSERT INTO aggregate_facts (company_guid, tallyloc_id, period_type, period_value, partyid, category, itemid, group_name, groupofgroup, total_amount, qty_sum, item_count, createdAt)
          VALUES (NEW.company_guid, NEW.tallyloc_id, 'month', NEW.month, NEW.partyid, COALESCE(NEW.category, ''), NEW.itemid, COALESCE(NEW.group_name, ''), COALESCE(NEW.groupofgroup, ''), NEW.amt, NEW.qty, 1, datetime('now'))
          ON CONFLICT(company_guid, tallyloc_id, period_type, period_value, partyid, itemid, group_name, groupofgroup, category)
          DO UPDATE SET total_amount = total_amount + excluded.total_amount, qty_sum = qty_sum + excluded.qty_sum, item_count = item_count + excluded.item_count, createdAt = datetime('now');

          INSERT INTO aggregate_facts (company_guid, tallyloc_id, period_type, period_value, partyid, category, itemid, group_name, groupofgroup, total_amount, qty_sum, item_count, createdAt)
          VALUES (NEW.company_guid, NEW.tallyloc_id, 'day', NEW.day, NEW.partyid, COALESCE(NEW.category, ''), NEW.itemid, COALESCE(NEW.group_name, ''), COALESCE(NEW.groupofgroup, ''), NEW.amt, NEW.qty, 1, datetime('now'))
          ON CONFLICT(company_guid, tallyloc_id, period_type, period_value, partyid, itemid, group_name, groupofgroup, category)
          DO UPDATE SET total_amount = total_amount + excluded.total_amount, qty_sum = qty_sum + excluded.qty_sum, item_count = item_count + excluded.item_count, createdAt = datetime('now');
        END;
      `);

      // 7) Backfill aggregates for existing data (month and day)
      this.db.execSync(`
        INSERT INTO aggregate_facts (company_guid, tallyloc_id, period_type, period_value, partyid, category, itemid, group_name, groupofgroup, total_amount, qty_sum, item_count, createdAt)
        SELECT i.company_guid, i.tallyloc_id, 'month', i.month, COALESCE(i.partyid,''), COALESCE(i.category,''), COALESCE(i.itemid,''), COALESCE(i.group_name,''), COALESCE(i.groupofgroup,''), SUM(i.amt), SUM(i.qty), COUNT(*), datetime('now')
        FROM inventories i
        GROUP BY i.company_guid, i.tallyloc_id, i.month, COALESCE(i.partyid,''), COALESCE(i.category,''), COALESCE(i.itemid,''), COALESCE(i.group_name,''), COALESCE(i.groupofgroup,'')
        ON CONFLICT(company_guid, tallyloc_id, period_type, period_value, partyid, itemid, group_name, groupofgroup, category)
        DO UPDATE SET total_amount = aggregate_facts.total_amount + excluded.total_amount, qty_sum = aggregate_facts.qty_sum + excluded.qty_sum, item_count = aggregate_facts.item_count + excluded.item_count, createdAt = datetime('now');
      `);
      this.db.execSync(`
        INSERT INTO aggregate_facts (company_guid, tallyloc_id, period_type, period_value, partyid, category, itemid, group_name, groupofgroup, total_amount, qty_sum, item_count, createdAt)
        SELECT i.company_guid, i.tallyloc_id, 'day', i.day, COALESCE(i.partyid,''), COALESCE(i.category,''), COALESCE(i.itemid,''), COALESCE(i.group_name,''), COALESCE(i.groupofgroup,''), SUM(i.amt), SUM(i.qty), COUNT(*), datetime('now')
        FROM inventories i
        GROUP BY i.company_guid, i.tallyloc_id, i.day, COALESCE(i.partyid,''), COALESCE(i.category,''), COALESCE(i.itemid,''), COALESCE(i.group_name,''), COALESCE(i.groupofgroup,'')
        ON CONFLICT(company_guid, tallyloc_id, period_type, period_value, partyid, itemid, group_name, groupofgroup, category)
        DO UPDATE SET total_amount = aggregate_facts.total_amount + excluded.total_amount, qty_sum = aggregate_facts.qty_sum + excluded.qty_sum, item_count = aggregate_facts.item_count + excluded.item_count, createdAt = datetime('now');
      `);

      this.db.execSync(`COMMIT; PRAGMA foreign_keys = ON;`);
      console.log('✅ Full rebuild migration completed');
    } catch (error) {
      console.error('❌ Full rebuild migration failed:', error);
      try { this.db?.execSync('ROLLBACK; PRAGMA foreign_keys = ON;'); } catch {}
    }
  }

  // Clear all voucher-related data for a specific company (GUID + tallyloc)
  async clearCompanyData(companyGuid: string, tallylocId: number): Promise<void> {
    try {
      if (!this.db || !this.isInitialized) {
        try {
          await this.initialize();
        } catch (e) {
          console.error('❌ Failed to initialize DB during clearCompanyData:', e);
          return; // avoid throwing to prevent Metro ENOENT chain
        }
        if (!this.db || !this.isInitialized) {
          console.warn('⚠️ Database still not initialized; skipping clearCompanyData');
          return;
        }
      }

      // Check table existence defensively to avoid prepareSync NPEs
      const tables = this.db.getAllSync(`SELECT name FROM sqlite_master WHERE type='table'`) as Array<{ name: string }>;
      const has = (t: string) => tables.some((x) => x.name === t);

      this.db.withTransactionSync(() => {
        if (has('aggregate_facts')) {
          try { this.db!.runSync(`DELETE FROM aggregate_facts WHERE company_guid = ? AND tallyloc_id = ?`, [companyGuid, tallylocId]); } catch {}
        }
        if (has('voucher_summary')) {
          try { this.db!.runSync(`DELETE FROM voucher_summary WHERE company_guid = ? AND tallyloc_id = ?`, [companyGuid, tallylocId]); } catch {}
        }
        if (has('inventories')) {
          try { this.db!.runSync(`DELETE FROM inventories WHERE company_guid = ? AND tallyloc_id = ?`, [companyGuid, tallylocId]); } catch {}
        }
        if (has('ledgers')) {
          try { this.db!.runSync(`DELETE FROM ledgers WHERE company_guid = ? AND tallyloc_id = ?`, [companyGuid, tallylocId]); } catch {}
        }
        if (has('vouchers')) {
          try { this.db!.runSync(`DELETE FROM vouchers WHERE company_guid = ? AND tallyloc_id = ?`, [companyGuid, tallylocId]); } catch {}
        }
      });
      console.log(`🧹 Cleared voucher data for company ${companyGuid} (${tallylocId})`);
    } catch (error) {
      console.error('❌ Failed to clear company voucher data (non-fatal):', error);
      // swallow to avoid crashing Metro; caller can show toast based on logs
    }
  }

  // Danger: clear ALL voucher-related data across ALL companies
  async clearAllVoucherData(): Promise<void> {
    try {
      if (!this.db || !this.isInitialized) {
        await this.initialize();
      }
      if (!this.db) return;
      const tables = this.db.getAllSync(`SELECT name FROM sqlite_master WHERE type='table'`) as Array<{ name: string }>;
      const has = (t: string) => tables.some((x) => x.name === t);
      this.db.withTransactionSync(() => {
        if (has('aggregate_facts')) { try { this.db!.runSync(`DELETE FROM aggregate_facts`); } catch {} }
        if (has('voucher_summary')) { try { this.db!.runSync(`DELETE FROM voucher_summary`); } catch {} }
        if (has('inventories')) { try { this.db!.runSync(`DELETE FROM inventories`); } catch {} }
        if (has('ledgers')) { try { this.db!.runSync(`DELETE FROM ledgers`); } catch {} }
        if (has('vouchers')) { try { this.db!.runSync(`DELETE FROM vouchers`); } catch {} }
      });
      console.log('🧹 Cleared ALL voucher-related tables (all companies)');
    } catch (error) {
      console.error('❌ Failed to clear all voucher data (non-fatal):', error);
    }
  }

  // Helper function to parse amounts (handle commas and convert to numbers)
  private parseAmount(amountStr: string): number {
    if (!amountStr) return 0;
    // Remove commas and parse as float
    const cleanAmount = amountStr.replace(/,/g, '');
    const parsed = parseFloat(cleanAmount);
    return isNaN(parsed) ? 0 : parsed;
  }

  // Helper function to parse quantities
  private parseQuantity(qtyStr: string): number {
    if (!qtyStr) return 0;
    const parsed = parseFloat(qtyStr);
    return isNaN(parsed) ? 0 : parsed;
  }

  // Helper function to convert date from YYYYMMDD to YYYY-MM-DD
  private formatDate(dateStr: string): string {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${year}-${month}-${day}`;
  }

  // Insert voucher data
  async insertVoucherData(vouchers: any[]): Promise<void> {
    if (!this.db || !this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      console.log(`📊 Inserting ${vouchers.length} vouchers into database...`);
      
      this.db.withTransactionSync(() => {
        for (const voucher of vouchers) {
          // Insert main voucher with all new fields
          this.db!.runSync(`
            INSERT OR REPLACE INTO vouchers (
              mstid, alterid, vchno, date, party, state, country, gstno, partyid, 
              amt, vchtype, reservedname, issale, pincode, isoptional, iscancelled, createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            voucher.mstid, voucher.alterid, voucher.vchno, voucher.date, voucher.party,
            voucher.state || '', voucher.country || '', voucher.gstno || '', voucher.partyid,
            voucher.amt, voucher.vchtype || '', voucher.reservedname || '', voucher.issale || '',
            voucher.pincode || '', voucher.isoptional || '', voucher.iscancelled || '',
            new Date().toISOString()
          ]);

          // Insert ledger entries
          if (voucher.ledgers && Array.isArray(voucher.ledgers)) {
            for (const ledger of voucher.ledgers) {
              this.db!.runSync(`
                INSERT OR REPLACE INTO ledgers (
                  voucher_id, ledger, ledgerid, amt, deemd, isprty, createdAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
              `, [
                voucher.mstid, ledger.ledger, ledger.ledgerid, ledger.amt,
                ledger.deemd || '', ledger.isprty || '', new Date().toISOString()
              ]);

              // Insert inventory entries
              if (ledger.inventry && Array.isArray(ledger.inventry)) {
                for (const item of ledger.inventry) {
                  this.db!.runSync(`
                    INSERT OR REPLACE INTO inventories (
                      ledger_id, item, itemid, uom, qty, amt, deemd, 
                      group_name, groupofgroup, category, createdAt
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                  `, [
                    ledger.ledgerid, item.item, item.itemid, item.uom || '', item.qty, item.amt,
                    item.deemd || '', item.group || '', item.groupofgroup || '', item.category || '',
                    new Date().toISOString()
                  ]);
                }
              }
            }
          }

          // Insert summary data with new schema
          this.db.runSync(`
            INSERT OR REPLACE INTO voucher_summary (
              voucher_id, date, party, partyid, vchtype, totalAmount, 
              salesAmount, gstAmount, itemCount, createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            voucher.mstid,
            voucher.date,
            voucher.party,
            voucher.partyid || '',
            voucher.vchtype || '',
            voucher.amt || 0,
            0, // salesAmount - will be calculated separately if needed
            0, // gstAmount - will be calculated separately if needed
            0, // itemCount - will be calculated separately if needed
            new Date().toISOString()
          ]);
        }
      });

      console.log(`✅ Successfully inserted ${vouchers.length} vouchers with all related data`);
    } catch (error) {
      console.error('❌ Failed to insert voucher data:', error);
      throw error;
    }
  }

  // Helper methods for calculations
  private calculateSalesAmount(ledgers: any[]): number {
    let salesAmount = 0;
    for (const ledger of ledgers) {
      if (ledger.ledger && (
        ledger.ledger.includes('Sales') || 
        ledger.ledger.includes('Products') ||
        ledger.ledger.includes('Revenue')
      )) {
        salesAmount += this.parseAmount(ledger.amt);
      }
    }
    return salesAmount;
  }

  private calculateGSTAmount(ledgers: any[]): number {
    let gstAmount = 0;
    for (const ledger of ledgers) {
      if (ledger.ledger && (
        ledger.ledger.includes('GST') || 
        ledger.ledger.includes('CGST') ||
        ledger.ledger.includes('SGST') ||
        ledger.ledger.includes('IGST')
      )) {
        gstAmount += this.parseAmount(ledger.amt);
      }
    }
    return gstAmount;
  }

  private countItems(ledgers: any[]): number {
    let itemCount = 0;
    for (const ledger of ledgers) {
      if (ledger.inventry && Array.isArray(ledger.inventry)) {
        itemCount += ledger.inventry.length;
      }
    }
    return itemCount;
  }

  // Get all vouchers (no date filtering)
  async getAllVouchers(companyGuid: string, tallylocId: number): Promise<VoucherEntry[]> {
    if (!this.db || !this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      console.log('📱 Getting all vouchers from database...');
      
      // Check if company columns exist
      const tableInfo = this.db.getAllSync(`PRAGMA table_info(vouchers)`);
      const hasCompanyColumns = tableInfo.some((column: any) => column.name === 'company_guid');
      
      let vouchers;
      if (hasCompanyColumns) {
        vouchers = this.db.getAllSync(`
          SELECT * FROM vouchers 
          WHERE company_guid = ? AND tallyloc_id = ?
          ORDER BY date ASC, vchno ASC
        `, [companyGuid, tallylocId]);
      } else {
        // Fallback to old query without company filtering
        console.log('📱 Company columns not found, using fallback query');
        vouchers = this.db.getAllSync(`
          SELECT * FROM vouchers 
          ORDER BY date ASC, vchno ASC
        `);
      }

      console.log(`📱 Retrieved ${vouchers.length} vouchers from database`);
      return vouchers as VoucherEntry[];
    } catch (error) {
      console.error('❌ Failed to get all vouchers:', error);
      throw error;
    }
  }

  // Get the highest alterid from SQLite for incremental sync
  async getHighestAlterId(companyGuid: string, tallylocId: number): Promise<number> {
    // Wait for initialization if in progress or ensure it's initialized
    try {
      if (this.initPromise) {
        await this.initPromise;
      } else if (!this.db || !this.isInitialized) {
        console.log('📱 Database not initialized, initializing...');
        await this.initialize();
      }
    } catch (error) {
      console.error('❌ Failed to initialize database for getHighestAlterId:', error);
      return 0;
    }

    // Verify database is initialized after awaiting
    if (!this.db || !this.isInitialized) {
      console.error('❌ Database not initialized after initialization attempt');
      return 0;
    }

    // Verify database connection is actually usable
    try {
      if (!this.db) {
        console.error('❌ Database connection is null after initialization');
        return 0;
      }
      // Test the connection
      this.db.getAllSync('SELECT 1');
    } catch (testError) {
      console.error('❌ Database connection invalid, re-initializing...', testError);
      // Reset and try again
      this.isInitialized = false;
      this.db = null;
      await this.initialize();
      if (!this.db || !this.isInitialized) {
        console.error('❌ Failed to re-initialize database after connection test');
        return 0;
      }
    }

    try {
      // Check if company columns exist
      const tableInfo = this.db.getAllSync(`PRAGMA table_info(vouchers)`);
      const hasCompanyColumns = tableInfo.some((column: any) => column.name === 'company_guid');
      
      let result;
      if (hasCompanyColumns) {
        result = this.db.getFirstSync(`
          SELECT MAX(CAST(alterid AS INTEGER)) as maxAlterId 
          FROM vouchers 
          WHERE company_guid = ? AND tallyloc_id = ?
        `, [companyGuid, tallylocId]);
      } else {
        // Fallback to old query without company filtering
        console.log('📱 Company columns not found, using fallback query');
        result = this.db.getFirstSync(`
          SELECT MAX(CAST(alterid AS INTEGER)) as maxAlterId 
          FROM vouchers
        `);
      }

      const maxAlterId = (result as any)?.maxAlterId || 0;
      console.log(`📱 Highest alterid in SQLite: ${maxAlterId}`);
      return maxAlterId;
    } catch (error) {
      console.error('❌ Failed to get highest alterid:', error);
      return 0;
    }
  }

  // Helper: Parse amount string/number to REAL (handles commas, currency symbols, negatives)
  private parseAmount(value: any): number {
    if (value == null || value === '') return 0;
    if (typeof value === 'number') {
      return isNaN(value) ? 0 : value;
    }
    if (typeof value === 'string') {
      // Remove currency symbols, commas, spaces, but keep minus and decimal point
      const cleaned = value.replace(/[₹$,\s]/g, '').replace(/[^0-9.\-]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  // Store vouchers with all related data
  async storeVouchers(
    vouchers: any[],
    voucherSummaries: any[],
    ledgers: any[],
    inventories: any[],
    companyGuid: string,
    tallylocId: number
  ): Promise<void> {
    // Wait for initialization if in progress
    if (this.initPromise) {
      try {
        await this.initPromise;
      } catch (error) {
        console.error('❌ Initialization failed while waiting for storeVouchers:', error);
        throw new Error('Database initialization failed');
      }
    }

    // Ensure database is initialized
    if (!this.db || !this.isInitialized) {
      console.log('📱 Database not initialized for storeVouchers, initializing...');
      await this.initialize();
      if (!this.db || !this.isInitialized) {
        throw new Error('Database not initialized after initialization attempt');
      }
    }

    // Verify database connection is usable
    try {
      if (!this.db) {
        throw new Error('Database connection is null');
      }
      this.db.getAllSync('SELECT 1');
    } catch (testError) {
      console.error('❌ Database connection invalid in storeVouchers, re-initializing...', testError);
      this.isInitialized = false;
      this.db = null;
      await this.initialize();
      if (!this.db || !this.isInitialized) {
        throw new Error('Database connection could not be restored');
      }
    }

    try {
      console.log(`📊 Storing ${vouchers.length} vouchers with related data...`);

      // Build lookup map for voucher data by mstid (for denormalization)
      const voucherById = new Map<string, { date: string; party: string; partyid: string }>();
      for (const v of vouchers) {
        if (v && typeof v.mstid !== 'undefined') {
          voucherById.set(String(v.mstid), {
            date: String(v.date || ''),
            party: String(v.party || ''),
            partyid: String(v.partyid || '')
          });
        }
      }

      // Helper: convert legacy D-Mmm-YY to YYYY-MM-DD safely (no JS Date)
      const legacyToIso = (legacy: string): string | null => {
        if (!legacy || legacy.indexOf('-') === -1) return null;
        const parts = legacy.split('-');
        if (parts.length !== 3) return null;
        const day = parseInt(parts[0], 10);
        const mon = parts[1];
        const yy = parts[2];
        const monIdx: any = {Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};
        const m = monIdx[mon];
        if (!m || isNaN(day)) return null;
        const year = 2000 + parseInt(yy, 10);
        const mm = String(m).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        return `${year}-${mm}-${dd}`;
      };

      // Helper: compute period keys from ISO date
      const computePeriodKeys = (dateIso: string | null): { day: string; month: string; quarter: string; week: string } => {
        if (!dateIso || dateIso.length !== 10) {
          return { day: '', month: '', quarter: '', week: '' };
        }
        const [year, month, day] = dateIso.split('-');
        const m = parseInt(month, 10);
        const quarter = `Q${Math.ceil(m / 3)}-${year.slice(-2)}`;
        const week = ''; // Could compute ISO week if needed
        return {
          day: dateIso,
          month: `${year}-${month}`,
          quarter,
          week
        };
      };

      // Store vouchers
      for (const voucher of vouchers) {
        this.db.runSync(`
          INSERT OR REPLACE INTO vouchers (
            mstid, alterid, vchno, date, party, state, country, gstno, partyid, 
            amt, vchtype, reservedname, issale, pincode, isoptional, iscancelled, 
            company_guid, tallyloc_id, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          voucher.mstid,
          voucher.alterid,
          voucher.vchno,
          voucher.date,
          voucher.party,
          voucher.state,
          voucher.country,
          voucher.gstno,
          voucher.partyid,
          this.parseAmount(voucher.amt),
          voucher.vchtype,
          voucher.reservedname,
          voucher.issale,
          voucher.pincode,
          voucher.isoptional,
          voucher.iscancelled,
          companyGuid,
          tallylocId,
          new Date().toISOString()
        ]);
      }

      // Store voucher summaries (upsert based on business key: voucher_id + company_guid + tallyloc_id)
      for (const summary of voucherSummaries) {
        this.db.runSync(`
          INSERT INTO voucher_summary (
            voucher_id, date, party, partyid, vchtype, totalAmount, 
            salesAmount, gstAmount, itemCount, company_guid, tallyloc_id, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(voucher_id, company_guid, tallyloc_id) 
          DO UPDATE SET
            date = excluded.date,
            party = excluded.party,
            partyid = excluded.partyid,
            vchtype = excluded.vchtype,
            totalAmount = excluded.totalAmount,
            salesAmount = excluded.salesAmount,
            gstAmount = excluded.gstAmount,
            itemCount = excluded.itemCount,
            createdAt = excluded.createdAt
        `, [
          summary.voucher_id,
          summary.date,
          summary.party,
          summary.partyid || '',
          summary.vchtype,
          this.parseAmount(summary.totalAmount),
          this.parseAmount(summary.salesAmount),
          this.parseAmount(summary.gstAmount),
          Number(summary.itemCount || 0),
          companyGuid,
          tallylocId,
          new Date().toISOString()
        ]);
      }

      // Store ledgers (upsert based on business key: voucher_id + ledgerid + company_guid + tallyloc_id)
      for (const ledger of ledgers) {
        this.db.runSync(`
          INSERT INTO ledgers (
            voucher_id, ledger, ledgerid, amt, deemd, isprty, company_guid, tallyloc_id, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(voucher_id, ledgerid, company_guid, tallyloc_id)
          DO UPDATE SET
            ledger = excluded.ledger,
            amt = excluded.amt,
            deemd = excluded.deemd,
            isprty = excluded.isprty,
            createdAt = excluded.createdAt
        `, [
          ledger.voucher_id,
          ledger.ledger,
          ledger.ledgerid,
          this.parseAmount(ledger.amt),
          ledger.deemd,
          ledger.isprty,
          companyGuid,
          tallylocId,
          new Date().toISOString()
        ]);
      }

      // Disable trigger before batch insert to prevent NULL period_value errors
      try {
        this.db.execSync(`DROP TRIGGER IF EXISTS trg_inv_after_insert`);
        console.log('🔧 Disabled aggregate trigger for batch insert');
      } catch (error) {
        console.log('⚠️ Could not disable trigger (may not exist):', error);
      }

      // Store inventories with denormalized columns
      for (const inventory of inventories) {
        // Get voucher data for denormalization
        const voucherData = voucherById.get(String(inventory.voucher_id || ''));
        const vDateLegacy = voucherData?.date || '';
        const dateIso = legacyToIso(vDateLegacy);
        const periodKeys = computePeriodKeys(dateIso);
        const voucherParty = voucherData?.party || '';
        const voucherPartyid = voucherData?.partyid || '';
        const dateTs = dateIso ? Math.floor(new Date(dateIso).getTime() / 1000) : null;

        // Check if denormalized columns exist in the table
        const invInfo = this.db.getAllSync(`PRAGMA table_info(inventories)`) as Array<{ name: string }>;
        const hasDenormCols = invInfo.some(c => c.name === 'voucher_id');

        if (hasDenormCols) {
          // Insert with denormalized columns (upsert based on business key: ledger_id + itemid + company_guid + tallyloc_id)
          this.db.runSync(`
            INSERT INTO inventories (
              ledger_id, item, itemid, uom, qty, amt, deemd, 
              group_name, groupofgroup, category, company_guid, tallyloc_id, createdAt,
              voucher_id, date_iso, date_ts, day, week, month, quarter, party, partyid
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(ledger_id, itemid, company_guid, tallyloc_id)
            DO UPDATE SET
              item = excluded.item,
              uom = excluded.uom,
              qty = excluded.qty,
              amt = excluded.amt,
              deemd = excluded.deemd,
              group_name = excluded.group_name,
              groupofgroup = excluded.groupofgroup,
              category = excluded.category,
              createdAt = excluded.createdAt,
              voucher_id = excluded.voucher_id,
              date_iso = excluded.date_iso,
              date_ts = excluded.date_ts,
              day = excluded.day,
              week = excluded.week,
              month = excluded.month,
              quarter = excluded.quarter,
              party = excluded.party,
              partyid = excluded.partyid
          `, [
            inventory.ledger_id,
            inventory.item,
            inventory.itemid,
            inventory.uom,
            this.parseAmount(inventory.qty),
            this.parseAmount(inventory.amt),
            inventory.deemd,
            inventory.group,
            inventory.groupofgroup,
            inventory.category,
            companyGuid,
            tallylocId,
            new Date().toISOString(),
            inventory.voucher_id || null,
            dateIso || null,
            dateTs || null,
            periodKeys.day || null,
            periodKeys.week || null,
            periodKeys.month || null,
            periodKeys.quarter || null,
            voucherParty || null,
            voucherPartyid || null
          ]);
        } else {
          // Fallback: insert without denormalized columns (old schema) - upsert based on business key
          this.db.runSync(`
            INSERT INTO inventories (
              ledger_id, item, itemid, uom, qty, amt, deemd, 
              group_name, groupofgroup, category, company_guid, tallyloc_id, createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(ledger_id, itemid, company_guid, tallyloc_id)
            DO UPDATE SET
              item = excluded.item,
              uom = excluded.uom,
              qty = excluded.qty,
              amt = excluded.amt,
              deemd = excluded.deemd,
              group_name = excluded.group_name,
              groupofgroup = excluded.groupofgroup,
              category = excluded.category,
              createdAt = excluded.createdAt
          `, [
            inventory.ledger_id,
            inventory.item,
            inventory.itemid,
            inventory.uom,
            this.parseAmount(inventory.qty),
            this.parseAmount(inventory.amt),
            inventory.deemd,
            inventory.group,
            inventory.groupofgroup,
            inventory.category,
            companyGuid,
            tallylocId,
            new Date().toISOString()
          ]);
        }
      }

      // Re-enable trigger and backfill aggregates if denormalized columns exist
      const invInfo = this.db.getAllSync(`PRAGMA table_info(inventories)`) as Array<{ name: string }>;
      const hasDenormCols = invInfo.some(c => c.name === 'voucher_id');
      if (hasDenormCols && inventories.length > 0) {
        try {
          // Recreate trigger
          this.db.execSync(`
            CREATE TRIGGER IF NOT EXISTS trg_inv_after_insert
            AFTER INSERT ON inventories
            BEGIN
              INSERT INTO aggregate_facts (company_guid, tallyloc_id, period_type, period_value, partyid, category, itemid, group_name, groupofgroup, total_amount, qty_sum, item_count, createdAt)
              VALUES (NEW.company_guid, NEW.tallyloc_id, 'month', NEW.month, NEW.partyid, COALESCE(NEW.category, ''), NEW.itemid, COALESCE(NEW.group_name, ''), COALESCE(NEW.groupofgroup, ''), NEW.amt, NEW.qty, 1, datetime('now'))
              ON CONFLICT(company_guid, tallyloc_id, period_type, period_value, partyid, itemid, group_name, groupofgroup, category)
              DO UPDATE SET total_amount = total_amount + excluded.total_amount, qty_sum = qty_sum + excluded.qty_sum, item_count = item_count + excluded.item_count, createdAt = datetime('now');

              INSERT INTO aggregate_facts (company_guid, tallyloc_id, period_type, period_value, partyid, category, itemid, group_name, groupofgroup, total_amount, qty_sum, item_count, createdAt)
              VALUES (NEW.company_guid, NEW.tallyloc_id, 'day', NEW.day, NEW.partyid, COALESCE(NEW.category, ''), NEW.itemid, COALESCE(NEW.group_name, ''), COALESCE(NEW.groupofgroup, ''), NEW.amt, NEW.qty, 1, datetime('now'))
              ON CONFLICT(company_guid, tallyloc_id, period_type, period_value, partyid, itemid, group_name, groupofgroup, category)
              DO UPDATE SET total_amount = total_amount + excluded.total_amount, qty_sum = qty_sum + excluded.qty_sum, item_count = item_count + excluded.item_count, createdAt = datetime('now');
            END;
          `);
          console.log('✅ Re-enabled aggregate trigger');
        } catch (error) {
          console.warn('⚠️ Could not recreate trigger:', error);
        }
      }

      console.log(`✅ Successfully stored ${vouchers.length} vouchers with all related data`);
    } catch (error) {
      console.error('❌ Failed to store vouchers:', error);
      throw error;
    }
  }

  // Get vouchers by date range
  async getVouchersByDateRange(startDate: string, endDate: string, companyGuid: string, tallylocId: number): Promise<VoucherEntry[]> {
    // Ensure database is initialized
    if (!this.db || !this.isInitialized) {
      console.log('📱 Database not initialized, re-initializing...');
      await this.initialize();
      // Verify initialization actually succeeded
      if (!this.db || !this.isInitialized) {
        throw new Error('Database initialization failed: connection is null or not initialized');
      }
      // Test that the connection actually works
      try {
        this.db.getAllSync('SELECT 1');
      } catch (testError) {
        console.error('❌ Database connection invalid after initialization:', testError);
        // Reset and try once more
        this.isInitialized = false;
        this.db = null;
        await this.initialize();
        if (!this.db || !this.isInitialized) {
          throw new Error('Database initialization failed after retry');
        }
        // Test again
        try {
          this.db.getAllSync('SELECT 1');
        } catch (retryError) {
          throw new Error(`Database connection still invalid after retry: ${retryError}`);
        }
      }
    }

    try {
      // First check if the vouchers table exists
      let tableExists;
      try {
        tableExists = this.db.getAllSync(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name='vouchers'
        `);
      } catch (error) {
        console.log('📱 Error checking table existence, re-initializing database...', error);
        // Force re-initialization by resetting state and closing old connection
        this.isInitialized = false;
        if (this.db) {
          try {
            this.db.closeSync();
          } catch (closeError) {
            console.log('📱 Error closing old database connection:', closeError);
          }
          this.db = null;
        }
        await this.initialize();
        if (!this.db || !this.isInitialized) {
          throw new Error('Database connection lost and could not be restored');
        }
        tableExists = this.db.getAllSync(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name='vouchers'
        `);
      }
      
      if (tableExists.length === 0) {
        console.log('📱 Vouchers table does not exist, creating tables...');
        this.createTables();
      }

      // Build date predicate: prefer vouchers.date_iso if present, otherwise compute ISO from legacy 'D-Mmm-YY'
      const vInfo = this.db.getAllSync(`PRAGMA table_info(vouchers)`) as Array<{ name: string }>;
      const hasVouchersIso = vInfo.some(c => c.name === 'date_iso');

      // Expressions to convert legacy to ISO inside SQL
      const yearExpr = "(2000 + CAST(substr(date, length(date)-1, 2) AS INTEGER))";
      const monStrExpr = "substr(date, instr(date,'-')+1, 3)";
      const dayExpr = "CAST(substr(date, 1, instr(date,'-')-1) AS INTEGER)";
      const monthNumExpr = `(
        CASE ${monStrExpr}
          WHEN 'Jan' THEN 1 WHEN 'Feb' THEN 2 WHEN 'Mar' THEN 3 WHEN 'Apr' THEN 4 WHEN 'May' THEN 5 WHEN 'Jun' THEN 6
          WHEN 'Jul' THEN 7 WHEN 'Aug' THEN 8 WHEN 'Sep' THEN 9 WHEN 'Oct' THEN 10 WHEN 'Nov' THEN 11 WHEN 'Dec' THEN 12
          ELSE 0 END
      )`;
      const legacyToIsoExpr = `printf('%04d-%02d-%02d', ${yearExpr}, ${monthNumExpr}, ${dayExpr})`;

      const dateWhere = hasVouchersIso
        ? 'date_iso >= ? AND date_iso <= ?'
        : `${legacyToIsoExpr} >= ? AND ${legacyToIsoExpr} <= ?`;

      // Log info using ISO and legacy (for visibility)
      const toLegacy = (iso: string) => {
        const [yStr, mStr, dStr] = iso.split('-');
        const y = parseInt(yStr, 10), m = parseInt(mStr, 10), d = parseInt(dStr, 10);
        const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][(m-1) as number];
        return `${d}-${mon}-${String(y).slice(-2)}`;
      };
      console.log(`📱 Getting vouchers with period:`, {
        original: `${startDate} to ${endDate}`,
        legacyView: `${toLegacy(startDate)} to ${toLegacy(endDate)}`
      });

      // Debug: Check what dates are actually in the database
      let allDates;
      try {
        allDates = this.db.getAllSync(`
          SELECT DISTINCT date 
          FROM vouchers 
          ORDER BY date
        `);
        console.log('📱 All dates in database:', allDates.map((row: any) => row.date));
      } catch (error) {
        console.log('📱 Error getting dates from database (retry after re-init):', error);
        await this.initialize();
        try {
          allDates = this.db!.getAllSync(`
            SELECT DISTINCT date 
            FROM vouchers 
            ORDER BY date
          `);
        } catch {
          allDates = [];
        }
      }

      // Check if company columns exist
      let tableInfo;
      let hasCompanyColumns = false;
      try {
        tableInfo = this.db.getAllSync(`PRAGMA table_info(vouchers)`);
        hasCompanyColumns = tableInfo.some((column: any) => column.name === 'company_guid');
      } catch (error) {
        console.log('📱 Error checking table info:', error);
        hasCompanyColumns = false;
      }
      
      let vouchers;
      try {
        const sql = hasCompanyColumns
          ? `SELECT * FROM vouchers WHERE ${dateWhere} AND company_guid = ? AND tallyloc_id = ? ORDER BY ${hasVouchersIso ? 'date_iso' : legacyToIsoExpr} ASC, vchno ASC`
          : `SELECT * FROM vouchers WHERE ${dateWhere} ORDER BY ${hasVouchersIso ? 'date_iso' : legacyToIsoExpr} ASC, vchno ASC`;
        const params: any[] = [startDate, endDate];
        if (hasCompanyColumns) { params.push(companyGuid, tallylocId); }
        vouchers = this.db.getAllSync(sql, params);
      } catch (error) {
        console.log('📱 Error executing main query, retry after re-init then fallback:', error);
        await this.initialize();
        try {
          const sql = hasCompanyColumns
            ? `SELECT * FROM vouchers WHERE ${dateWhere} AND company_guid = ? AND tallyloc_id = ? ORDER BY ${hasVouchersIso ? 'date_iso' : legacyToIsoExpr} ASC, vchno ASC`
            : `SELECT * FROM vouchers WHERE ${dateWhere} ORDER BY ${hasVouchersIso ? 'date_iso' : legacyToIsoExpr} ASC, vchno ASC`;
          const params: any[] = [startDate, endDate];
          if (hasCompanyColumns) { params.push(companyGuid, tallylocId); }
          vouchers = this.db!.getAllSync(sql, params);
        } catch (retryError) {
          console.log('📱 Retry also failed, trying broad fallback:', retryError);
          // Try fallback query without company filtering
          try {
            const sql = `SELECT * FROM vouchers WHERE ${dateWhere} ORDER BY ${hasVouchersIso ? 'date_iso' : legacyToIsoExpr} ASC, vchno ASC`;
            const params: any[] = [startDate, endDate];
            vouchers = this.db!.getAllSync(sql, params);
          } catch (fallbackError) {
            console.log('📱 Fallback query also failed:', fallbackError);
            vouchers = [];
          }
        }
      }

      // If no rows for company scope but table has columns, retry within date range without company filter
      if (Array.isArray(vouchers) && vouchers.length === 0 && hasCompanyColumns) {
        try {
          // Convert ISO dates to legacy format (D-Mmm-YY) for fallback query using date column
          const toLegacyFormat = (iso: string): string => {
            const [yStr, mStr, dStr] = iso.split('-');
            const y = parseInt(yStr, 10);
            const m = parseInt(mStr, 10);
            const d = parseInt(dStr, 10);
            const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1];
            return `${d}-${mon}-${String(y).slice(-2)}`;
          };
          const dbStartDate = toLegacyFormat(startDate);
          const dbEndDate = toLegacyFormat(endDate);
          vouchers = this.db.getAllSync(`
            SELECT * FROM vouchers 
            WHERE date >= ? AND date <= ?
            ORDER BY date ASC, vchno ASC
          `, [dbStartDate, dbEndDate]);
        } catch (e) {
          console.log('📱 Secondary date-only query failed:', e);
        }
      }

      // Strict filtering: keep within selected period only

      console.log(`📱 Retrieved ${vouchers.length} vouchers from database`);
      return vouchers as VoucherEntry[];
    } catch (error) {
      console.error('❌ Failed to get vouchers by date range:', error);
      throw error;
    }
  }

  // Get vouchers by reservedname and vchtype with pagination
  async getVouchersByTypePaginated(
    startDate: string,
    endDate: string,
    reservedName: string,
    vchType: string,
    companyGuid: string,
    tallylocId: number,
    limit: number,
    offset: number
  ): Promise<{ rows: VoucherEntry[]; total: number; }>{
    if (!this.db || !this.isInitialized) {
      await this.initialize();
      if (!this.db || !this.isInitialized) {
        throw new Error('Failed to initialize database');
      }
    }

    // Convert YYYY-MM-DD to DD-Mmm-YY as stored
    const convertToDatabaseFormat = (dateStr: string): string => {
      const date = new Date(dateStr);
      const day = date.getDate().toString();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear().toString().slice(-2);
      return `${day}-${month}-${year}`;
    };

    const dbStartDate = convertToDatabaseFormat(startDate);
    const dbEndDate = convertToDatabaseFormat(endDate);

    try {
      // Count total
      const countRow = this.db.getFirstSync(
        `SELECT COUNT(*) as cnt FROM vouchers WHERE date >= ? AND date <= ? AND reservedname = ? AND vchtype = ? AND company_guid = ? AND tallyloc_id = ?`,
        [dbStartDate, dbEndDate, reservedName, vchType, companyGuid, tallylocId]
      ) as any;
      const total = countRow?.cnt ? Number(countRow.cnt) : 0;

      // Rows with pagination
      const rows = this.db.getAllSync(
        `SELECT * FROM vouchers WHERE date >= ? AND date <= ? AND reservedname = ? AND vchtype = ? AND company_guid = ? AND tallyloc_id = ? ORDER BY date ASC, vchno ASC LIMIT ? OFFSET ?`,
        [dbStartDate, dbEndDate, reservedName, vchType, companyGuid, tallylocId, limit, offset]
      ) as VoucherEntry[];

      return { rows, total };
    } catch (error) {
      console.error('❌ Failed to get vouchers by type (paginated):', error);
      return { rows: [], total: 0 };
    }
  }

  // Get voucher items (date, party, item, qty, amt) by type with pagination
  async getVoucherItemsByTypePaginated(
    startDate: string,
    endDate: string,
    reservedName: string,
    vchType: string,
    companyGuid: string,
    tallylocId: number,
    limit: number,
    offset: number
  ): Promise<{ rows: Array<{ mstid: string; date: string; party: string; ledger_id: string | null; ledger: string | null; ledgerAmt: number; item: string; qty: number; amt: number }>; total: number }>{
    if (!this.db || !this.isInitialized) {
      await this.initialize();
      if (!this.db || !this.isInitialized) {
        throw new Error('Failed to initialize database');
      }
    }

    const convertToDatabaseFormat = (dateStr: string): string => {
      const [y, m, d] = dateStr.split('-').map((v) => parseInt(v, 10));
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[(m - 1) as number];
      const yy = y.toString().slice(-2);
      return `${d}-${month}-${yy}`;
    };

    // Normalize start date edge-case: if 31-Mar, bump to 01-Apr to match FY semantics
    const normalizeIsoStart = (iso: string) => iso.endsWith('-03-31') ? iso.replace('-03-31', '-04-01') : iso;

    try {
      // Detect vouchers columns availability
      const vCols = this.db.getAllSync(`PRAGMA table_info(vouchers)`) as Array<{ name: string }>;
      const hasReserved = vCols.some(c => c.name === 'reservedname');
      const hasVchType = vCols.some(c => c.name === 'vchtype');
      const hasVCompany = vCols.some(c => c.name === 'company_guid') && vCols.some(c => c.name === 'tallyloc_id');
      const hasVouchersIso = vCols.some(c => c.name === 'date_iso');
      const iCols = this.db.getAllSync(`PRAGMA table_info(inventories)`) as Array<{ name: string }>;
      const hasInvVoucherId = iCols.some(c => c.name === 'voucher_id');

      // Build type filters: always filter by vchtype if provided, optionally filter by reservedName
      let typeWhere = '';
      const typeParams: any[] = [];
      if (hasVchType && vchType) {
        typeWhere += ' AND v.vchtype = ?';
        typeParams.push(vchType);
      }
      if (hasReserved && reservedName) {
        typeWhere += ' AND v.reservedname = ?';
        typeParams.push(reservedName);
      }

      // Enforce strict company scoping on vouchers
      const companyWhere = hasVCompany
        ? ' AND v.company_guid = ? AND v.tallyloc_id = ?'
        : ' AND 1=0';

      // Date expressions and WHERE using ISO comparison for both ISO and legacy formats
      const vYearExpr = "(2000 + CAST(substr(v.date, length(v.date)-1, 2) AS INTEGER))";
      const vMonthNumExpr = `(
        CASE substr(v.date, instr(v.date,'-')+1, 3)
          WHEN 'Jan' THEN 1 WHEN 'Feb' THEN 2 WHEN 'Mar' THEN 3 WHEN 'Apr' THEN 4 WHEN 'May' THEN 5 WHEN 'Jun' THEN 6
          WHEN 'Jul' THEN 7 WHEN 'Aug' THEN 8 WHEN 'Sep' THEN 9 WHEN 'Oct' THEN 10 WHEN 'Nov' THEN 11 WHEN 'Dec' THEN 12
          ELSE 0 END
      )`;
      const vDayExpr = "CAST(substr(v.date, 1, instr(v.date,'-')-1) AS INTEGER)";
      const vLegacyIsoExpr = `printf('%04d-%02d-%02d', ${vYearExpr}, ${vMonthNumExpr}, ${vDayExpr})`;
      const orderDateExpr = hasVouchersIso ? 'v.date_iso' : vLegacyIsoExpr;
      const dateWhereSql = hasVouchersIso
        ? '(v.date_iso >= ? AND v.date_iso <= ?)'
        : `(${vLegacyIsoExpr} >= ? AND ${vLegacyIsoExpr} <= ?)`;

      // Normalize start date edge-case: if 31-Mar, bump to 01-Apr to match FY semantics
      const normalizeIsoStart = (iso: string) => iso.endsWith('-03-31') ? iso.replace('-03-31', '-04-01') : iso;

      // Join fragments (company-scoped if available). Inventories join adds voucher_id match when column exists.
      const ledgerJoin = hasVCompany
        ? 'LEFT JOIN ledgers l ON l.voucher_id = v.mstid AND l.company_guid = v.company_guid AND l.tallyloc_id = v.tallyloc_id'
        : 'LEFT JOIN ledgers l ON l.voucher_id = v.mstid';
      const invJoin = hasInvVoucherId
        ? (hasVCompany
            ? "LEFT JOIN inventories i ON i.ledger_id = l.ledgerid AND (i.voucher_id = v.mstid OR i.voucher_id IS NULL OR i.voucher_id = '') AND i.company_guid = l.company_guid AND i.tallyloc_id = l.tallyloc_id"
            : "LEFT JOIN inventories i ON i.ledger_id = l.ledgerid AND (i.voucher_id = v.mstid OR i.voucher_id IS NULL OR i.voucher_id = '')")
        : (hasVCompany
            ? 'LEFT JOIN inventories i ON i.ledger_id = l.ledgerid AND i.company_guid = l.company_guid AND i.tallyloc_id = l.tallyloc_id'
            : 'LEFT JOIN inventories i ON i.ledger_id = l.ledgerid');

      // Build params helper: always pass ISO dates for BETWEEN comparison
      const buildParams = () => {
        const params: any[] = [normalizeIsoStart(startDate), endDate];
        if (companyWhere.includes('?')) { params.push(companyGuid, tallylocId); }
        params.push(...typeParams);
        return params;
      };

      // Total distinct vouchers matching filters
      const countSql = `SELECT COUNT(DISTINCT v.mstid) as cnt
         FROM vouchers v
         ${ledgerJoin}
         ${invJoin}
         WHERE ${dateWhereSql}${companyWhere}${typeWhere}`;
      const countParams = buildParams();
      const countRow = this.db.getFirstSync(countSql, countParams) as any;
      const total = countRow?.cnt ? Number(countRow.cnt) : 0;

      if (total === 0) {
        return { rows: [], total: 0 };
      }

      const targetSql = `SELECT v.mstid, ${hasVouchersIso ? 'v.date_iso' : 'v.date'} as date
         FROM vouchers v
         ${ledgerJoin}
         ${invJoin}
         WHERE ${dateWhereSql}${companyWhere}${typeWhere}
         GROUP BY v.mstid
         ORDER BY ${orderDateExpr} ASC, v.vchno ASC
         LIMIT ? OFFSET ?`;
      const targetParams = [...buildParams(), limit, offset];
      const targetVouchers = this.db.getAllSync(targetSql, targetParams) as Array<{ mstid: string; date: string }>;

      if (!targetVouchers || targetVouchers.length === 0) {
        return { rows: [], total };
      }

      // Extract mstids for IN clause
      const mstids = targetVouchers.map(t => t.mstid);
      const placeholders = mstids.map(() => '?').join(',');

      // Fetch all lines (ledgers + inventories) for all selected voucher ids
      // JOIN conditions ensure: ledgers belong to voucher (l.voucher_id = v.mstid)
      //                        items belong to ledger (i.ledger_id = l.ledgerid) and voucher (i.voucher_id = v.mstid when available)
      const displayDateExpr = hasVouchersIso ? 'v.date_iso' : 'v.date';
      const rowsSql = `SELECT 
         v.mstid as mstid,
         ${displayDateExpr} as date,
         v.party as party,
         v.vchtype as vchtype,
         v.vchno as vchno,
         CAST(COALESCE(v.amt, 0) AS REAL) as voucherAmt,
         l.ledgerid as ledger_id,
         l.ledger as ledger,
         l.isprty as isprty,
         COALESCE(l.amt, 0) as ledgerAmt,
         COALESCE(i.item, '') as item,
         COALESCE(i.qty, 0) as qty,
         COALESCE(i.amt, 0) as amt
         FROM vouchers v
         ${ledgerJoin}
         ${invJoin}
         WHERE ${dateWhereSql}${companyWhere}${typeWhere} AND v.mstid IN (${placeholders})
         ORDER BY ${orderDateExpr} ASC, v.vchno ASC, i.item ASC`;
      const rowParams = [...buildParams(), ...mstids];
      const rows = this.db.getAllSync(rowsSql, rowParams) as Array<{ mstid: string; date: string; party: string; vchtype: string; vchno: string; voucherAmt: number | string; ledger_id: string | null; ledger: string | null; isprty?: string | null; ledgerAmt: number; item: string; qty: number; amt: number }>;

      return { rows, total };
    } catch (error) {
      console.error('❌ Failed to get voucher items (paginated):', error);
      return { rows: [], total: 0 };
    }
  }

  // Get all voucher items for range and type (no pagination) for summarization
  async getAllVoucherItemsByType(
    startDate: string,
    endDate: string,
    reservedName: string,
    vchType: string,
    companyGuid: string,
    tallylocId: number
  ): Promise<Array<{ date: string; party: string; item: string; qty: number; amt: number; group_name?: string; groupofgroup?: string; category?: string }>> {
    if (!this.db || !this.isInitialized) {
      await this.initialize();
      if (!this.db || !this.isInitialized) {
        throw new Error('Failed to initialize database');
      }
    }

    const convertToDatabaseFormat = (dateStr: string): string => {
      const [y, m, d] = dateStr.split('-').map((v) => parseInt(v, 10));
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[(m - 1) as number];
      const yy = y.toString().slice(-2);
      return `${d}-${month}-${yy}`;
    };

    const dbStartDate = convertToDatabaseFormat(startDate);
    const dbEndDate = convertToDatabaseFormat(endDate);

    try {
      const rows = this.db.getAllSync(
        `SELECT v.date as date, v.party as party, i.item as item, i.qty as qty, i.amt as amt, i.group_name as group_name, i.groupofgroup as groupofgroup, i.category as category
         FROM inventories i
         JOIN ledgers l ON i.ledger_id = l.ledgerid
         JOIN vouchers v ON l.voucher_id = v.mstid
         WHERE v.date >= ? AND v.date <= ?
           AND v.reservedname = ? AND v.vchtype = ?
           AND v.company_guid = ? AND v.tallyloc_id = ?
         ORDER BY v.date ASC`,
        [dbStartDate, dbEndDate, reservedName, vchType, companyGuid, tallylocId]
      ) as Array<{ date: string; party: string; item: string; qty: number; amt: number; group_name?: string; groupofgroup?: string; category?: string }>;
      return rows;
    } catch (error) {
      console.error('❌ Failed to get all voucher items by type:', error);
      return [];
    }
  }

  // Quick summary: group by voucher type within period (diagnostic/fallback)
  async getVoucherTypeSummary(
    startDate: string,
    endDate: string,
    companyGuid: string,
    tallylocId: number
  ): Promise<Array<{ vchtype: string; count: number; total: number }>> {
    if (!this.db || !this.isInitialized) {
      await this.initialize();
      if (!this.db || !this.isInitialized) throw new Error('Failed to initialize database');
    }

    // Prefer ISO if available
    const vCols = this.db.getAllSync(`PRAGMA table_info(vouchers)`) as Array<{ name: string }>;
    const hasIso = vCols.some(c => c.name === 'date_iso');
    const hasCompany = vCols.some(c => c.name === 'company_guid') && vCols.some(c => c.name === 'tallyloc_id');

    const legacyFrom = (() => {
      const [yStr, mStr, dStr] = startDate.split('-');
      const y = parseInt(yStr, 10), m = parseInt(mStr, 10), d = parseInt(dStr, 10);
      const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][(m-1) as number];
      return `${d}-${mon}-${String(y).slice(-2)}`;
    })();
    const legacyTo = (() => {
      const [yStr, mStr, dStr] = endDate.split('-');
      const y = parseInt(yStr, 10), m = parseInt(mStr, 10), d = parseInt(dStr, 10);
      const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][(m-1) as number];
      return `${d}-${mon}-${String(y).slice(-2)}`;
    })();

    const dateWhere = hasIso
      ? '( (date_iso >= ? AND date_iso <= ?) OR (date >= ? AND date <= ?) )'
      : '(date >= ? AND date <= ?)';
    const companyWhere = hasCompany ? ' AND company_guid = ? AND tallyloc_id = ?' : '';

    const sql = `
      SELECT COALESCE(vchtype,'') as vchtype, COUNT(*) as count, SUM(CAST(amt AS REAL)) as total
      FROM vouchers
      WHERE ${dateWhere}${companyWhere}
      GROUP BY COALESCE(vchtype,'')
      ORDER BY total DESC
    `;

    const params: any[] = hasIso ? [startDate, endDate, legacyFrom, legacyTo] : [legacyFrom, legacyTo];
    if (companyWhere) { params.push(companyGuid, tallylocId); }

    try {
      const rows = this.db.getAllSync(sql, params) as Array<{ vchtype: string; count: number; total: number }>;
      return rows.map(r => ({ vchtype: String(r.vchtype || ''), count: Number(r.count || 0), total: Number(r.total || 0) }));
    } catch (e) {
      console.error('❌ Failed to get voucher-type summary:', e);
      return [];
    }
  }

  // Period summary: total amount grouped by period (day/week/month/quarter/year)
  async getPeriodSummary(
    startDate: string,
    endDate: string,
    companyGuid: string,
    tallylocId: number,
    periodicity: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  ): Promise<Array<{ period: string; total: number }>> {
    if (!this.db || !this.isInitialized) {
      await this.initialize();
      if (!this.db || !this.isInitialized) throw new Error('Failed to initialize database');
    }

    const invInfo = this.db.getAllSync(`PRAGMA table_info(inventories)`) as Array<{ name: string }>;
    const hasIso = invInfo.some((c) => c.name === 'date_iso');

    // Build period expressions using inventories.* columns
    const yearExpr = hasIso ? "CAST(strftime('%Y', i.date_iso) AS INTEGER)" : '(2000 + CAST(substr(i.date, length(i.date)-1, 2) AS INTEGER))';
    const monthNumExpr = hasIso ? "CAST(strftime('%m', i.date_iso) AS INTEGER)" : `(
      CASE substr(i.date, instr(i.date,'-')+1, 3)
        WHEN 'Jan' THEN 1 WHEN 'Feb' THEN 2 WHEN 'Mar' THEN 3 WHEN 'Apr' THEN 4 WHEN 'May' THEN 5 WHEN 'Jun' THEN 6
        WHEN 'Jul' THEN 7 WHEN 'Aug' THEN 8 WHEN 'Sep' THEN 9 WHEN 'Oct' THEN 10 WHEN 'Nov' THEN 11 WHEN 'Dec' THEN 12
        ELSE 0 END
    )`;
    const dayExpr = hasIso ? "CAST(strftime('%d', i.date_iso) AS INTEGER)" : "CAST(substr(i.date, 1, instr(i.date,'-')-1) AS INTEGER)";

    let periodKeyExpr = '';
    if (periodicity === 'daily') {
      periodKeyExpr = `printf('%04d-%02d-%02d', ${yearExpr}, ${monthNumExpr}, ${dayExpr})`;
    } else if (periodicity === 'weekly') {
      const weekOfMonthExpr = `CAST(((${dayExpr} - 1) / 7) AS INTEGER) + 1`;
      periodKeyExpr = `printf('%04d-%02d Wk%d', ${yearExpr}, ${monthNumExpr}, ${weekOfMonthExpr})`;
    } else if (periodicity === 'monthly') {
      periodKeyExpr = `printf('%04d-%02d', ${yearExpr}, ${monthNumExpr})`;
    } else if (periodicity === 'quarterly') {
      const quarterExpr = `CASE 
        WHEN ${monthNumExpr} BETWEEN 1 AND 3 THEN 'Q1'
        WHEN ${monthNumExpr} BETWEEN 4 AND 6 THEN 'Q2'
        WHEN ${monthNumExpr} BETWEEN 7 AND 9 THEN 'Q3'
        ELSE 'Q4' END`;
      periodKeyExpr = `${yearExpr} || '-' || ${quarterExpr}`;
    } else { // yearly
      periodKeyExpr = `CAST(${yearExpr} AS TEXT)`;
    }

    const dateWhere = hasIso ? 'i.date_iso >= ? AND i.date_iso <= ?' : 'i.date >= ? AND i.date <= ?';
    const companyWhere = (invInfo.some(c => c.name === 'company_guid') && invInfo.some(c => c.name === 'tallyloc_id'))
      ? ' AND i.company_guid = ? AND i.tallyloc_id = ?' : ' AND 1=0';
    const params: any[] = hasIso ? [startDate, endDate] : [startDate, endDate];
    if (companyWhere.includes('?')) { params.push(companyGuid, tallylocId); }

    const sql = `
      SELECT ${periodKeyExpr} AS period, SUM(CAST(i.amt AS REAL)) AS total
      FROM inventories i
      WHERE ${dateWhere}${companyWhere}
      GROUP BY period
      ORDER BY period ASC
    `;

    try {
      const rows = this.db.getAllSync(sql, params) as Array<{ period: string; total: number }>;
      return rows.map(r => ({ period: String(r.period || ''), total: Number(r.total || 0) }));
    } catch (e) {
      console.error('❌ Failed to get period summary:', e);
      return [];
    }
  }

  // Aggregated summary by period and aggregation key (performed in SQLite)
  async getVoucherSummaryAggregated(
    startDate: string,
    endDate: string,
    reservedName: string,
    vchType: string,
    companyGuid: string,
    tallylocId: number,
    periodicity: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly',
    aggregation: 'party' | 'item' | 'group' | 'groupofgroup' | 'category',
    filters?: { party?: string; item?: string }
  ): Promise<Array<{ period: string; key: string; qty: number; amt: number; avg: number }>> {
    if (!this.db || !this.isInitialized) {
      await this.initialize();
      if (!this.db || !this.isInitialized) {
        throw new Error('Failed to initialize database');
      }
    }

    // Prefer denormalized inventories with ISO dates if available (no joins)
    const invInfo = this.db.getAllSync(`PRAGMA table_info(inventories)`) as Array<{ name: string }>;
    const hasIso = invInfo.some((c) => c.name === 'date_iso');

    // Build period expressions using inventories.* columns
    const yearExpr = hasIso ? "CAST(strftime('%Y', i.date_iso) AS INTEGER)" : '(2000 + CAST(substr(i.date, length(i.date)-1, 2) AS INTEGER))';
    const monthNumExpr = hasIso ? "CAST(strftime('%m', i.date_iso) AS INTEGER)" : `(
      CASE substr(i.date, instr(i.date,'-')+1, 3)
        WHEN 'Jan' THEN 1 WHEN 'Feb' THEN 2 WHEN 'Mar' THEN 3 WHEN 'Apr' THEN 4 WHEN 'May' THEN 5 WHEN 'Jun' THEN 6
        WHEN 'Jul' THEN 7 WHEN 'Aug' THEN 8 WHEN 'Sep' THEN 9 WHEN 'Oct' THEN 10 WHEN 'Nov' THEN 11 WHEN 'Dec' THEN 12
        ELSE 0 END
    )`;
    const dayExpr = hasIso ? "CAST(strftime('%d', i.date_iso) AS INTEGER)" : "CAST(substr(i.date, 1, instr(i.date,'-')-1) AS INTEGER)";

    let periodKeyExpr = '';
    if (periodicity === 'daily') {
      periodKeyExpr = `printf('%04d-%02d-%02d', ${yearExpr}, ${monthNumExpr}, ${dayExpr})`;
    } else if (periodicity === 'weekly') {
      // Approximate by week-of-month: W1..W5
      const weekOfMonthExpr = `CAST(((${dayExpr} - 1) / 7) AS INTEGER) + 1`;
      periodKeyExpr = `printf('%04d-%02d Wk%d', ${yearExpr}, ${monthNumExpr}, ${weekOfMonthExpr})`;
    } else if (periodicity === 'monthly') {
      periodKeyExpr = `printf('%04d-%02d', ${yearExpr}, ${monthNumExpr})`;
    } else if (periodicity === 'quarterly') {
      const quarterExpr = `CASE 
        WHEN ${monthNumExpr} BETWEEN 1 AND 3 THEN 'Q1'
        WHEN ${monthNumExpr} BETWEEN 4 AND 6 THEN 'Q2'
        WHEN ${monthNumExpr} BETWEEN 7 AND 9 THEN 'Q3'
        ELSE 'Q4' END`;
      periodKeyExpr = `${yearExpr} || '-' || ${quarterExpr}`;
    } else { // yearly
      periodKeyExpr = `CAST(${yearExpr} AS TEXT)`;
    }

    let aggKeyExpr = '';
    switch (aggregation) {
      case 'party': aggKeyExpr = 'i.party'; break;
      case 'item': aggKeyExpr = 'i.item'; break;
      case 'group': aggKeyExpr = 'i.group_name'; break;
      case 'groupofgroup': aggKeyExpr = 'i.groupofgroup'; break;
      case 'category': aggKeyExpr = 'i.category'; break;
    }

    const whereFilters: any[] = [companyGuid, tallylocId];
    let dateFilterSql = '';
    if (hasIso) {
      dateFilterSql = ' AND i.date_iso >= ? AND i.date_iso <= ?';
      whereFilters.push(startDate, endDate);
    } else {
      // fallback to legacy format conversion on the fly
      const convert = (s: string) => {
        const [y, m, d] = s.split('-');
        const mm = parseInt(m, 10);
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const mon = monthNames[mm-1];
        return `${parseInt(d,10)}-${mon}-${y.slice(-2)}`;
      };
      const dbStart = convert(startDate);
      const dbEnd = convert(endDate);
      dateFilterSql = ' AND i.date >= ? AND i.date <= ?';
      whereFilters.push(dbStart, dbEnd);
    }

    let optionalFiltersSql = '';
    if (filters?.party) { optionalFiltersSql += ' AND i.party = ?'; whereFilters.push(filters.party); }
    if (filters?.item) { optionalFiltersSql += ' AND i.item = ?'; whereFilters.push(filters.item); }

    // filter by voucher type/reservedName using denormalized inventories if present; if not, skip for speed
    // We don't have reservedname/vchtype on inventories; rely on inventories scope for drilldown entry

    const sql = `
      SELECT 
        ${periodKeyExpr} AS period,
        ${aggKeyExpr} AS key,
        SUM(CAST(i.qty AS REAL)) AS qty,
        SUM(CAST(i.amt AS REAL)) AS amt,
        CASE WHEN SUM(CAST(i.qty AS REAL)) = 0 THEN 0 ELSE (SUM(CAST(i.amt AS REAL)) / SUM(CAST(i.qty AS REAL))) END AS avg
      FROM inventories i
      WHERE i.company_guid = ? AND i.tallyloc_id = ?
        ${dateFilterSql}
        ${optionalFiltersSql}
      GROUP BY period, key
      ORDER BY period ASC, amt DESC
    `;

    try {
      const rows = this.db.getAllSync(sql, whereFilters) as Array<{ period: string; key: string; qty: number; amt: number; avg: number }>;
      return rows.map(r => ({ period: String(r.period || ''), key: String(r.key || 'Unknown'), qty: Number(r.qty || 0), amt: Number(r.amt || 0), avg: Number(r.avg || 0) }));
    } catch (error) {
      console.error('❌ Failed to get aggregated voucher summary:', error);
      return [];
    }
  }

  // Get voucher summary by date range
  async getVoucherSummaryByDateRange(startDate: string, endDate: string): Promise<VoucherSummaryEntry[]> {
    if (!this.db || !this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      const summary = this.db.getAllSync(`
        SELECT * FROM voucher_summary 
        WHERE date >= ? AND date <= ? 
        ORDER BY date ASC, totalAmount DESC
      `, [startDate, endDate]);

      return summary as VoucherSummaryEntry[];
    } catch (error) {
      console.error('❌ Failed to get voucher summary:', error);
      throw error;
    }
  }

  // Get sales by customer
  async getSalesByCustomer(startDate: string, endDate: string): Promise<any[]> {
    if (!this.db || !this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      const salesByCustomer = this.db.getAllSync(`
        SELECT 
          party,
          partyid,
          COUNT(*) as voucherCount,
          SUM(totalAmount) as totalSales,
          SUM(salesAmount) as productSales,
          SUM(gstAmount) as totalGST,
          SUM(itemCount) as totalItems
        FROM voucher_summary 
        WHERE date >= ? AND date <= ? 
        GROUP BY party, partyid
        ORDER BY totalSales DESC
      `, [startDate, endDate]);

      return salesByCustomer;
    } catch (error) {
      console.error('❌ Failed to get sales by customer:', error);
      throw error;
    }
  }

  // Get sales by item
  async getSalesByItem(startDate: string, endDate: string): Promise<any[]> {
    if (!this.db || !this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      const salesByItem = this.db.getAllSync(`
        SELECT 
          item,
          itemid,
          group_name,
          category,
          COUNT(*) as transactionCount,
          SUM(qty) as totalQuantity,
          SUM(amt) as totalAmount
        FROM inventories 
        WHERE ledger_id IN (
          SELECT ledgerid FROM ledgers 
          WHERE voucher_id IN (
            SELECT mstid FROM vouchers 
            WHERE date >= ? AND date <= ?
          )
        )
        GROUP BY item, itemid, group_name, category
        ORDER BY totalAmount DESC
      `, [startDate, endDate]);

      return salesByItem;
    } catch (error) {
      console.error('❌ Failed to get sales by item:', error);
      throw error;
    }
  }

  // Get sales by item group
  async getSalesByItemGroup(startDate: string, endDate: string): Promise<any[]> {
    if (!this.db || !this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      const salesByGroup = this.db.getAllSync(`
        SELECT 
          group_name,
          category,
          COUNT(*) as itemCount,
          SUM(qty) as totalQuantity,
          SUM(amt) as totalAmount
        FROM inventories 
        WHERE ledger_id IN (
          SELECT ledgerid FROM ledgers 
          WHERE voucher_id IN (
            SELECT mstid FROM vouchers 
            WHERE date >= ? AND date <= ?
          )
        )
        GROUP BY group_name, category
        ORDER BY totalAmount DESC
      `, [startDate, endDate]);

      return salesByGroup;
    } catch (error) {
      console.error('❌ Failed to get sales by item group:', error);
      throw error;
    }
  }

  // Check if data exists for date range
  async hasDataForDateRange(startDate: string, endDate: string, companyGuid: string, tallylocId: number): Promise<boolean> {
    // Wait for initialization if in progress or ensure it's initialized
    try {
      if (this.initPromise) {
        await this.initPromise;
      } else if (!this.db || !this.isInitialized) {
        console.log('📱 Database not initialized for hasDataForDateRange, initializing...');
        await this.initialize();
      }
    } catch (error) {
      console.error('❌ Failed to initialize database for hasDataForDateRange:', error);
      return false;
    }

    // Verify database is initialized after awaiting
    if (!this.db || !this.isInitialized) {
      console.error('❌ Database not initialized after initialization attempt');
      return false;
    }

    // Verify database connection is usable
    try {
      if (!this.db) {
        return false;
      }
      this.db.getAllSync('SELECT 1');
    } catch (testError) {
      console.error('❌ Database connection invalid in hasDataForDateRange, re-initializing...', testError);
      this.isInitialized = false;
      this.db = null;
      await this.initialize();
      if (!this.db || !this.isInitialized) {
        return false;
      }
    }

    try {
      // Convert YYYY-MM-DD format to DD-Mmm-YY format for database query
      const convertToDatabaseFormat = (dateStr: string): string => {
        const date = new Date(dateStr);
        const day = date.getDate().toString(); // Don't pad with zero
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear().toString().slice(-2);
        return `${day}-${month}-${year}`;
      };

      const dbStartDate = convertToDatabaseFormat(startDate);
      const dbEndDate = convertToDatabaseFormat(endDate);

      console.log(`📱 Converting date range for database query:`, {
        original: `${startDate} to ${endDate}`,
        converted: `${dbStartDate} to ${dbEndDate}`
      });

      // Check if we have any data that overlaps with the requested range
      // First, get all data to see what we have
      // Check if company columns exist
      const tableInfo = this.db.getAllSync(`PRAGMA table_info(vouchers)`);
      const hasCompanyColumns = tableInfo.some((column: any) => column.name === 'company_guid');
      
      let allDataResult;
      if (hasCompanyColumns) {
        allDataResult = this.db.getFirstSync(`
          SELECT MIN(date) as minDate, MAX(date) as maxDate, COUNT(*) as count 
          FROM vouchers 
          WHERE company_guid = ? AND tallyloc_id = ?
        `, [companyGuid, tallylocId]);
      } else {
        // Fallback to old query without company filtering
        console.log('📱 Company columns not found, using fallback query');
        allDataResult = this.db.getFirstSync(`
          SELECT MIN(date) as minDate, MAX(date) as maxDate, COUNT(*) as count 
          FROM vouchers
        `);
      }

      if (!allDataResult || (allDataResult as any)?.count === 0) {
        console.log(`📱 No data found in database`);
        return false;
      }

      const { minDate: allMinDate, maxDate: allMaxDate, count: allCount } = allDataResult as any;
      console.log(`📱 All data in database: ${allCount} vouchers from ${allMinDate} to ${allMaxDate}`);

      // Check if the requested range overlaps with available data
      const requestedStart = new Date(startDate);
      const requestedEnd = new Date(endDate);
      const dataStart = new Date(allMinDate);
      const dataEnd = new Date(allMaxDate);

      // Check for overlap: requested range overlaps if it starts before data ends and ends after data starts
      const hasOverlap = requestedStart <= dataEnd && requestedEnd >= dataStart;
      
      if (!hasOverlap) {
        console.log(`📱 No overlap between requested range (${startDate} to ${endDate}) and available data (${allMinDate} to ${allMaxDate})`);
        console.log(`📱 But we have ${allCount} vouchers available - showing them anyway`);
        // Return true to show available data even if it doesn't match the requested range
        return true;
      }

      console.log(`📱 Found overlap between requested range and available data`);
      
      // Get data within the requested range
      const minMaxResult = this.db.getFirstSync(`
        SELECT MIN(date) as minDate, MAX(date) as maxDate, COUNT(*) as count 
        FROM vouchers 
        WHERE date >= ? AND date <= ?
      `, [dbStartDate, dbEndDate]);

      if (!minMaxResult || (minMaxResult as any)?.count === 0) {
        console.log(`📱 No data found in exact date range ${dbStartDate} to ${dbEndDate}, but we have overlapping data`);
        // Return true anyway since we have overlapping data - show what we have
        return true;
      }

      const { minDate, maxDate, count } = minMaxResult as any;
      
      // Check if we have data that covers at least 90% of the requested range
      // This allows for some flexibility in date coverage
      const rangeDataStart = new Date(minDate);
      const rangeDataEnd = new Date(maxDate);
      
      const requestedDays = Math.ceil((requestedEnd.getTime() - requestedStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const dataDays = Math.ceil((rangeDataEnd.getTime() - rangeDataStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // Check if data covers at least 90% of the requested range
      const coverage = dataDays / requestedDays;
      const hasGoodCoverage = coverage >= 0.9;
      
      console.log(`📱 Data coverage check:`, {
        requestedRange: `${startDate} to ${endDate}`,
        dataRange: `${minDate} to ${maxDate}`,
        requestedDays,
        dataDays,
        coverage: `${(coverage * 100).toFixed(1)}%`,
        hasGoodCoverage,
        voucherCount: count
      });
      
      return hasGoodCoverage;
    } catch (error) {
      console.error('❌ Failed to check data availability:', error);
      return false;
    }
  }

  // Clear data for date range
  async clearDataForDateRange(startDate: string, endDate: string): Promise<void> {
    if (!this.db || !this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      this.db.runSync(`
        DELETE FROM inventories 
        WHERE ledger_id IN (
          SELECT ledgerid FROM ledgers 
          WHERE voucher_id IN (
            SELECT mstid FROM vouchers 
            WHERE date >= ? AND date <= ?
          )
        )
      `, [startDate, endDate]);

      this.db.runSync(`
        DELETE FROM ledgers 
        WHERE voucher_id IN (
          SELECT mstid FROM vouchers 
          WHERE date >= ? AND date <= ?
        )
      `, [startDate, endDate]);

      this.db.runSync(`
        DELETE FROM voucher_summary 
        WHERE date >= ? AND date <= ?
      `, [startDate, endDate]);

      this.db.runSync(`
        DELETE FROM vouchers 
        WHERE date >= ? AND date <= ?
      `, [startDate, endDate]);

      console.log(`✅ Cleared voucher data for date range: ${startDate} to ${endDate}`);
    } catch (error) {
      console.error('❌ Failed to clear data for date range:', error);
      throw error;
    }
  }

  // Clear all data
  async clearAllData(): Promise<void> {
    if (!this.db || !this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      // Check if tables exist before trying to delete from them
      const tables = ['inventories', 'ledgers', 'voucher_summary', 'vouchers'];
      
      for (const table of tables) {
        try {
          const tableExists = this.db.getAllSync(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='${table}'
          `);
          
          if (tableExists.length > 0) {
            this.db.runSync(`DELETE FROM ${table}`);
            console.log(`✅ Cleared ${table} table`);
          } else {
            console.log(`📱 Table ${table} does not exist, skipping`);
          }
        } catch (error) {
          console.log(`⚠️ Could not clear ${table} table:`, error);
          // Continue with other tables
        }
      }
      
      console.log('✅ Cleared all voucher data');
    } catch (error) {
      console.error('❌ Failed to clear all data:', error);
      throw error;
    }
  }

  // Clear data for specific company
  async clearCompanyData(companyGuid: string, tallylocId: number): Promise<void> {
    if (!this.db || !this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      // Check if company columns exist
      const tables = ['inventories', 'ledgers', 'voucher_summary', 'vouchers'];
      
      for (const table of tables) {
        try {
          const tableExists = this.db.getAllSync(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='${table}'
          `);
          
          if (tableExists.length > 0) {
            // Check if company columns exist
            const tableInfo = this.db.getAllSync(`PRAGMA table_info(${table})`);
            const hasCompanyColumns = tableInfo.some((column: any) => column.name === 'company_guid');
            
            if (hasCompanyColumns) {
              this.db.runSync(`DELETE FROM ${table} WHERE company_guid = ? AND tallyloc_id = ?`, [companyGuid, tallylocId]);
              console.log(`✅ Cleared ${table} table for company ${companyGuid}`);
            } else {
              // Fallback: clear all data if company columns don't exist
              this.db.runSync(`DELETE FROM ${table}`);
              console.log(`✅ Cleared all data from ${table} (no company columns)`);
            }
          } else {
            console.log(`📱 Table ${table} does not exist, skipping`);
          }
        } catch (error) {
          console.log(`⚠️ Could not clear ${table} table:`, error);
          // Continue with other tables
        }
      }
      
      console.log(`✅ Cleared voucher data for company ${companyGuid} (tallyloc_id: ${tallylocId})`);
    } catch (error) {
      console.error('❌ Failed to clear company data:', error);
      throw error;
    }
  }

  // Get total records count
  async getTotalRecords(): Promise<number> {
    if (!this.db || !this.isInitialized) {
      return 0;
    }

    try {
      const result = this.db.getFirstSync('SELECT COUNT(*) as count FROM vouchers');
      return (result as any)?.count || 0;
    } catch (error) {
      console.error('❌ Failed to get total records:', error);
      return 0;
    }
  }

  // Debug method to check what data exists
  async debugDataInfo(): Promise<void> {
    // Wait for initialization if in progress or ensure it's initialized
    try {
      if (this.initPromise) {
        console.log('📱 Initialization in progress, waiting for debug...');
        await this.initPromise;
      } else if (!this.db || !this.isInitialized) {
        console.log('📱 Database not initialized for debug, initializing...');
        await this.initialize();
      }
    } catch (error) {
      console.error('❌ Failed to initialize database for debug:', error);
      return;
    }

    // Verify database is initialized after awaiting
    if (!this.db || !this.isInitialized) {
      console.error('❌ Database not initialized after initialization attempt');
      return;
    }

    // Verify database connection is actually usable
    try {
      if (!this.db) {
        console.error('❌ Database connection is null after initialization');
        return;
      }
      // Test the connection
      this.db.getAllSync('SELECT 1');
    } catch (testError) {
      console.error('❌ Database connection invalid, re-initializing...', testError);
      // Reset and try again
      this.isInitialized = false;
      this.db = null;
      await this.initialize();
      if (!this.db || !this.isInitialized) {
        console.error('❌ Failed to re-initialize database after connection test');
        return;
      }
    }

    try {
      if (!this.db) {
        console.error('❌ Database connection is null');
        return;
      }

      // Get total count
      let totalCount;
      try {
        totalCount = this.db.getFirstSync(`SELECT COUNT(*) as count FROM vouchers`);
      } catch (e) {
        console.log('📱 Error getting count, re-initializing...', e);
        await this.initialize();
        if (!this.db || !this.isInitialized) {
          console.error('❌ Failed to initialize database after count error');
          return;
        }
        totalCount = this.db.getFirstSync(`SELECT COUNT(*) as count FROM vouchers`);
      }
      console.log('📱 Total vouchers in database:', (totalCount as any)?.count || 0);

      // Get date range
      let dateRange;
      try {
        dateRange = this.db.getFirstSync(`
          SELECT MIN(date) as minDate, MAX(date) as maxDate 
          FROM vouchers
        `);
      } catch (e) {
        await this.initialize();
        dateRange = this.db!.getFirstSync(`
          SELECT MIN(date) as minDate, MAX(date) as maxDate 
          FROM vouchers
        `);
      }
      console.log('📱 Date range in database:', dateRange);

      // Get sample data
      let sampleData;
      try {
        sampleData = this.db.getAllSync(`
          SELECT date, vchno, party, amt, vchtype 
          FROM vouchers 
          ORDER BY date ASC 
          LIMIT 5
        `);
      } catch (e) {
        await this.initialize();
        sampleData = this.db!.getAllSync(`
          SELECT date, vchno, party, amt, vchtype 
          FROM vouchers 
          ORDER BY date ASC 
          LIMIT 5
        `);
      }
      console.log('📱 Sample voucher data:', sampleData);
    } catch (error) {
      console.error('❌ Debug data info failed:', error);
    }
  }

  // Close database
  close(): void {
    if (this.db) {
      this.db.closeSync();
      this.db = null;
      this.isInitialized = false;
    }
  }

  // Get voucher summary by date range
  async getVoucherSummaryByPeriodAndAggregation(
    startDate: string,
    endDate: string,
    reservedName: string,
    vchType: string,
    companyGuid: string,
    tallylocId: number,
    periodicity: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly',
    aggregation: 'party' | 'item' | 'group' | 'groupofgroup' | 'category',
    filters?: { party?: string; item?: string }
  ): Promise<Array<{ period: string; key: string; qty: number; amt: number; avg: number }>> {
    if (!this.db || !this.isInitialized) {
      await this.initialize();
      if (!this.db || !this.isInitialized) {
        throw new Error('Failed to initialize database');
      }
    }

    // Prefer denormalized inventories with ISO dates if available (no joins)
    const invInfo = this.db.getAllSync(`PRAGMA table_info(inventories)`) as Array<{ name: string }>;
    const hasIso = invInfo.some((c) => c.name === 'date_iso');

    // Build period expressions using inventories.* columns
    const yearExpr = hasIso ? "CAST(strftime('%Y', i.date_iso) AS INTEGER)" : '(2000 + CAST(substr(i.date, length(i.date)-1, 2) AS INTEGER))';
    const monthNumExpr = hasIso ? "CAST(strftime('%m', i.date_iso) AS INTEGER)" : `(
      CASE substr(i.date, instr(i.date,'-')+1, 3)
        WHEN 'Jan' THEN 1 WHEN 'Feb' THEN 2 WHEN 'Mar' THEN 3 WHEN 'Apr' THEN 4 WHEN 'May' THEN 5 WHEN 'Jun' THEN 6
        WHEN 'Jul' THEN 7 WHEN 'Aug' THEN 8 WHEN 'Sep' THEN 9 WHEN 'Oct' THEN 10 WHEN 'Nov' THEN 11 WHEN 'Dec' THEN 12
        ELSE 0 END
    )`;
    const dayExpr = hasIso ? "CAST(strftime('%d', i.date_iso) AS INTEGER)" : "CAST(substr(i.date, 1, instr(i.date,'-')-1) AS INTEGER)";

    let periodKeyExpr = '';
    if (periodicity === 'daily') {
      periodKeyExpr = `printf('%04d-%02d-%02d', ${yearExpr}, ${monthNumExpr}, ${dayExpr})`;
    } else if (periodicity === 'weekly') {
      // Approximate by week-of-month: W1..W5
      const weekOfMonthExpr = `CAST(((${dayExpr} - 1) / 7) AS INTEGER) + 1`;
      periodKeyExpr = `printf('%04d-%02d Wk%d', ${yearExpr}, ${monthNumExpr}, ${weekOfMonthExpr})`;
    } else if (periodicity === 'monthly') {
      periodKeyExpr = `printf('%04d-%02d', ${yearExpr}, ${monthNumExpr})`;
    } else if (periodicity === 'quarterly') {
      const quarterExpr = `CASE 
        WHEN ${monthNumExpr} BETWEEN 1 AND 3 THEN 'Q1'
        WHEN ${monthNumExpr} BETWEEN 4 AND 6 THEN 'Q2'
        WHEN ${monthNumExpr} BETWEEN 7 AND 9 THEN 'Q3'
        ELSE 'Q4' END`;
      periodKeyExpr = `${yearExpr} || '-' || ${quarterExpr}`;
    } else { // yearly
      periodKeyExpr = `CAST(${yearExpr} AS TEXT)`;
    }

    let aggKeyExpr = '';
    switch (aggregation) {
      case 'party': aggKeyExpr = 'i.party'; break;
      case 'item': aggKeyExpr = 'i.item'; break;
      case 'group': aggKeyExpr = 'i.group_name'; break;
      case 'groupofgroup': aggKeyExpr = 'i.groupofgroup'; break;
      case 'category': aggKeyExpr = 'i.category'; break;
    }

    const whereFilters: any[] = [companyGuid, tallylocId];
    let dateFilterSql = '';
    if (hasIso) {
      dateFilterSql = ' AND i.date_iso >= ? AND i.date_iso <= ?';
      whereFilters.push(startDate, endDate);
    } else {
      // fallback to legacy format conversion on the fly
      const convert = (s: string) => {
        const [y, m, d] = s.split('-');
        const mm = parseInt(m, 10);
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const mon = monthNames[mm-1];
        return `${parseInt(d,10)}-${mon}-${y.slice(-2)}`;
      };
      const dbStart = convert(startDate);
      const dbEnd = convert(endDate);
      dateFilterSql = ' AND i.date >= ? AND i.date <= ?';
      whereFilters.push(dbStart, dbEnd);
    }

    let optionalFiltersSql = '';
    if (filters?.party) { optionalFiltersSql += ' AND i.party = ?'; whereFilters.push(filters.party); }
    if (filters?.item) { optionalFiltersSql += ' AND i.item = ?'; whereFilters.push(filters.item); }

    // filter by voucher type/reservedName using denormalized inventories if present; if not, skip for speed
    // We don't have reservedname/vchtype on inventories; rely on inventories scope for drilldown entry

    const sql = `
      SELECT 
        ${periodKeyExpr} AS period,
        ${aggKeyExpr} AS key,
        SUM(CAST(i.qty AS REAL)) AS qty,
        SUM(CAST(i.amt AS REAL)) AS amt,
        CASE WHEN SUM(CAST(i.qty AS REAL)) = 0 THEN 0 ELSE (SUM(CAST(i.amt AS REAL)) / SUM(CAST(i.qty AS REAL))) END AS avg
      FROM inventories i
      WHERE i.company_guid = ? AND i.tallyloc_id = ?
        ${dateFilterSql}
        ${optionalFiltersSql}
      GROUP BY period, key
      ORDER BY period ASC, amt DESC
    `;

    try {
      const rows = this.db.getAllSync(sql, whereFilters) as Array<{ period: string; key: string; qty: number; amt: number; avg: number }>;
      return rows.map(r => ({ period: String(r.period || ''), key: String(r.key || 'Unknown'), qty: Number(r.qty || 0), amt: Number(r.amt || 0), avg: Number(r.avg || 0) }));
    } catch (error) {
      console.error('❌ Failed to get aggregated voucher summary:', error);
      return [];
    }
  }

  // Debug: check inventories linkage for a specific voucher mstid
  async debugCheckVoucherInventories(mstid: string, companyGuid: string, tallylocId: number): Promise<{
    voucherId: string;
    hasInventoriesViaLedger: number;
    hasInventoriesViaVoucherId?: number;
    totalLedgers: number;
    sampleInventories: Array<{ ledger_id: string; item: string; qty: number; amt: number }>;
  }> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    try {
      const iCols = this.db.getAllSync(`PRAGMA table_info(inventories)`) as Array<{ name: string }>;
      const hasInvVoucherId = iCols.some(c => c.name === 'voucher_id');

      // Count ledgers for this voucher
      const ledCountRow = this.db.getFirstSync(
        `SELECT COUNT(*) as cnt FROM ledgers WHERE voucher_id = ? AND company_guid = ? AND tallyloc_id = ?`,
        [mstid, companyGuid, tallylocId]
      ) as any;
      const totalLedgers = Number(ledCountRow?.cnt || 0);

      // Count inventories via ledger_id join
      const viaLedgerRow = this.db.getFirstSync(
        `SELECT COUNT(*) as cnt
         FROM inventories i
         JOIN ledgers l ON i.ledger_id = l.ledgerid
         WHERE l.voucher_id = ? AND i.company_guid = ? AND i.tallyloc_id = ?`,
        [mstid, companyGuid, tallylocId]
      ) as any;
      const viaLedger = Number(viaLedgerRow?.cnt || 0);

      // Count inventories via inventories.voucher_id when available
      let viaVoucherId: number | undefined = undefined;
      if (hasInvVoucherId) {
        const row = this.db.getFirstSync(
          `SELECT COUNT(*) as cnt FROM inventories WHERE voucher_id = ? AND company_guid = ? AND tallyloc_id = ?`,
          [mstid, companyGuid, tallylocId]
        ) as any;
        viaVoucherId = Number(row?.cnt || 0);
      }

      // Sample few inventory rows
      const sample = this.db.getAllSync(
        `SELECT i.ledger_id, i.item, i.qty, i.amt
         FROM inventories i
         JOIN ledgers l ON i.ledger_id = l.ledgerid
         WHERE l.voucher_id = ? AND i.company_guid = ? AND i.tallyloc_id = ?
         LIMIT 5`,
        [mstid, companyGuid, tallylocId]
      ) as Array<{ ledger_id: string; item: string; qty: number; amt: number }>;

      console.log('🔎 DebugCheckVoucherInventories', {
        voucherId: mstid,
        totalLedgers,
        hasInventoriesViaLedger: viaLedger,
        hasInventoriesViaVoucherId: viaVoucherId,
        sampleInventories: sample
      });

      return {
        voucherId: mstid,
        totalLedgers,
        hasInventoriesViaLedger: viaLedger,
        hasInventoriesViaVoucherId: viaVoucherId,
        sampleInventories: sample
      };
    } catch (e) {
      console.error('❌ debugCheckVoucherInventories failed:', e);
      return { voucherId: mstid, totalLedgers: 0, hasInventoriesViaLedger: 0, sampleInventories: [] };
    }
  }
}

export const voucherDataService = new VoucherDataService();
