// import SQLite from 'react-native-sqlite-storage';
import * as SQLite from 'expo-sqlite';

export interface SalesDataEntry {
  id: string;
  masterId: string;
  alterId: string;
  date: string;
  invoiceNumber: string;
  vchType: string;
  customer: string;
  pinCode: string;
  itemName: string;
  stockGroup: string;
  quantity: number;
  rate: number;
  amount: number;
  profit: number;
  createdAt: string;
}

class SalesDataService {
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    try {
      // Check if already initialized
      if (this.isInitialized && this.db) {
        console.log('📱 SalesDataService already initialized');
        return;
      }

      // Use expo-sqlite which is compatible with Expo
      this.db = SQLite.openDatabaseSync('SalesData.db');

      await this.createTables();
      this.isInitialized = true;
      console.log('✅ SalesDataService initialized successfully with expo-sqlite');
    } catch (error) {
      console.error('❌ Failed to initialize SalesDataService:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const createSalesDataTable = `
      CREATE TABLE IF NOT EXISTS sales_data (
        id TEXT PRIMARY KEY,
        masterId TEXT,
        alterId TEXT,
        date TEXT,
        invoiceNumber TEXT,
        vchType TEXT,
        customer TEXT,
        pinCode TEXT,
        itemName TEXT,
        stockGroup TEXT,
        quantity REAL,
        rate REAL,
        amount REAL,
        profit REAL,
        createdAt TEXT
      )
    `;

    const createDateRangesTable = `
      CREATE TABLE IF NOT EXISTS date_ranges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        startDate TEXT,
        endDate TEXT,
        totalRecords INTEGER,
        lastUpdated TEXT,
        isComplete INTEGER DEFAULT 0
      )
    `;

    this.db.execSync(createSalesDataTable);
    this.db.execSync(createDateRangesTable);
    
    console.log('✅ Database tables created successfully');
  }

  async insertSalesData(entries: SalesDataEntry[]): Promise<void> {
    if (!this.db || !this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      this.db.withTransactionSync(() => {
        for (const entry of entries) {
          const insertQuery = `
            INSERT OR REPLACE INTO sales_data (
              id, masterId, alterId, date, invoiceNumber, vchType,
              customer, pinCode, itemName, stockGroup, quantity, rate, amount, profit, createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          
          this.db!.runSync(insertQuery, [
            entry.id,
            entry.masterId,
            entry.alterId,
            entry.date,
            entry.invoiceNumber,
            entry.vchType,
            entry.customer,
            entry.pinCode,
            entry.itemName,
            entry.stockGroup,
            entry.quantity,
            entry.rate,
            entry.amount,
            entry.profit,
            entry.createdAt
          ]);
        }
      });

      console.log(`✅ Inserted ${entries.length} sales data entries`);
    } catch (error) {
      console.error('❌ Failed to insert sales data:', error);
      throw error;
    }
  }

  async getSalesDataByDateRange(startDate: string, endDate: string): Promise<SalesDataEntry[]> {
    if (!this.db || !this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      const query = `
        SELECT * FROM sales_data 
        WHERE date >= ? AND date <= ?
        ORDER BY date DESC, createdAt DESC
      `;

      const results = this.db.getAllSync(query, [startDate, endDate]);
      const entries: SalesDataEntry[] = [];

      for (const row of results) {
        entries.push({
          id: row.id,
          masterId: row.masterId,
          alterId: row.alterId,
          date: row.date,
          invoiceNumber: row.invoiceNumber,
          vchType: row.vchType,
          customer: row.customer,
          pinCode: row.pinCode,
          itemName: row.itemName,
          stockGroup: row.stockGroup,
          quantity: row.quantity,
          rate: row.rate,
          amount: row.amount,
          profit: row.profit,
          createdAt: row.createdAt
        });
      }

      console.log(`📊 Retrieved ${entries.length} sales data entries from database`);
      return entries;
    } catch (error) {
      console.error('❌ Failed to retrieve sales data:', error);
      throw error;
    }
  }

  async hasDataForDateRange(startDate: string, endDate: string): Promise<boolean> {
    if (!this.db || !this.isInitialized) {
      return false;
    }

    try {
      // Check if we have data for the entire range
      const rangeQuery = `
        SELECT 
          COUNT(*) as totalCount,
          MIN(date) as minDate,
          MAX(date) as maxDate
        FROM sales_data 
        WHERE date >= ? AND date <= ?
      `;

      const results = this.db.getFirstSync(rangeQuery, [startDate, endDate]);
      const totalCount = results?.totalCount || 0;
      const minDate = results?.minDate;
      const maxDate = results?.maxDate;
      
      console.log(`🔍 Database check: ${totalCount} records found for ${startDate} to ${endDate}`);
      console.log(`🔍 Date range in DB: ${minDate} to ${maxDate}`);
      
      // Return true if we have data and it covers most of the requested range
      // Allow for small gaps (e.g., missing 1-2 days) to be more flexible
      const hasGoodCoverage = totalCount > 0 && minDate && maxDate;
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      const minDateObj = new Date(minDate);
      const maxDateObj = new Date(maxDate);
      
      // Check if we have data for at least 90% of the requested range
      const requestedDays = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
      const coveredDays = Math.ceil((maxDateObj.getTime() - minDateObj.getTime()) / (1000 * 60 * 60 * 24));
      const coveragePercentage = (coveredDays / requestedDays) * 100;
      
      console.log(`🔍 Coverage: ${coveragePercentage.toFixed(1)}% (${coveredDays}/${requestedDays} days)`);
      
      return hasGoodCoverage && coveragePercentage >= 90;
    } catch (error) {
      console.error('❌ Failed to check data availability:', error);
      return false;
    }
  }

  async clearDataForDateRange(startDate: string, endDate: string): Promise<void> {
    if (!this.db || !this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      const query = `DELETE FROM sales_data WHERE date >= ? AND date <= ?`;
      this.db.runSync(query, [startDate, endDate]);
      console.log(`🗑️ Cleared sales data for ${startDate} to ${endDate}`);
    } catch (error) {
      console.error('❌ Failed to clear sales data:', error);
      throw error;
    }
  }

  async getTotalRecords(): Promise<number> {
    if (!this.db || !this.isInitialized) {
      return 0;
    }

    try {
      const query = `SELECT COUNT(*) as count FROM sales_data`;
      const results = this.db.getFirstSync(query);
      const count = results?.count || 0;
      
      console.log(`📊 Total records in database: ${count}`);
      return count;
    } catch (error) {
      console.error('❌ Failed to get total records:', error);
      return 0;
    }
  }

  async clearAllData(): Promise<void> {
    if (!this.db || !this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      this.db.runSync('DELETE FROM sales_data');
      console.log('🗑️ Cleared all sales data from database');
    } catch (error) {
      console.error('❌ Failed to clear all data:', error);
      throw error;
    }
  }

  async clearCompanyData(companyGuid: string, tallylocId: number): Promise<void> {
    if (!this.db || !this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      // Check if company columns exist
      const tableInfo = this.db.getAllSync(`PRAGMA table_info(sales_data)`);
      const hasCompanyColumns = tableInfo.some((column: any) => column.name === 'company_guid');
      
      if (hasCompanyColumns) {
        this.db.runSync('DELETE FROM sales_data WHERE company_guid = ? AND tallyloc_id = ?', [companyGuid, tallylocId]);
        console.log(`🗑️ Cleared sales data for company ${companyGuid} (tallyloc_id: ${tallylocId})`);
      } else {
        // Fallback: clear all data if company columns don't exist
        this.db.runSync('DELETE FROM sales_data');
        console.log('🗑️ Company columns not found, cleared all sales data');
      }
    } catch (error) {
      console.error('❌ Failed to clear company data:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.closeSync();
      this.db = null;
      this.isInitialized = false;
      console.log('✅ SalesDataService closed');
    }
  }
}

export const salesDataService = new SalesDataService();
