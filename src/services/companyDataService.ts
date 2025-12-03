import * as SQLite from 'expo-sqlite';
import { UserConnection } from '../config/api';

export interface CompanyEntry {
  id?: number;
  company_name: string;
  guid: string;
  tallyloc_id: number;
  conn_name: string;
  shared_email?: string;
  access_type?: string;
  booksfrom?: string;
  status: 'online' | 'offline' | 'unknown';
  last_sync_date: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

class CompanyDataService {
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized && this.db) {
      console.log('📱 CompanyDataService already initialized');
      return;
    }

    try {
      this.db = await SQLite.openDatabaseAsync('CompanyData.db');
      await this.createTables();
      this.isInitialized = true;
      
      // Clean up any duplicate companies
      await this.clearDuplicateCompanies();
      
      // Clear fallback companies to allow re-sync with original names
      await this.clearFallbackCompanies();
      
      console.log('📱 CompanyDataService initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize CompanyDataService:', error);
      throw error;
    }
  }

  private createTables(): void {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Create the table with all columns
      this.db.execSync(`
        CREATE TABLE IF NOT EXISTS companies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company_name TEXT NOT NULL,
          guid TEXT NOT NULL UNIQUE,
          tallyloc_id INTEGER NOT NULL,
          conn_name TEXT,
          shared_email TEXT,
          access_type TEXT,
          status TEXT DEFAULT 'unknown',
          last_sync_date TEXT,
          is_active INTEGER DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      // Add missing columns if they don't exist (for existing tables)
      try {
        this.db.execSync(`ALTER TABLE companies ADD COLUMN shared_email TEXT`);
        console.log('✅ Added shared_email column to companies table');
      } catch (error) {
        // Column already exists, ignore error
        console.log('📱 shared_email column already exists or error adding:', error.message);
      }

      try {
        this.db.execSync(`ALTER TABLE companies ADD COLUMN access_type TEXT`);
        console.log('✅ Added access_type column to companies table');
      } catch (error) {
        // Column already exists, ignore error
        console.log('📱 access_type column already exists or error adding:', error.message);
      }

      try {
        this.db.execSync(`ALTER TABLE companies ADD COLUMN booksfrom TEXT`);
        console.log('✅ Added booksfrom column to companies table');
      } catch (error) {
        // Column already exists, ignore error
        console.log('📱 booksfrom column already exists or error adding:', error.message);
      }

    } catch (error) {
      console.error('❌ Failed to create companies table:', error);
      throw error;
    }
  }

  // Store companies data
  async storeCompanies(companies: any[]): Promise<void> {
    if (!this.db || !this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      console.log(`📊 Storing ${companies.length} companies in database...`);
      console.log('📊 Companies to store:', JSON.stringify(companies, null, 2));
      
      this.db.withTransactionSync(() => {
        for (const company of companies) {
          const companyEntry: CompanyEntry = {
            company_name: company.company || company.company_name || company.name || company.title || 'Unknown Company',
            guid: company.guid || '',
            tallyloc_id: company.tallyloc_id || 0,
            conn_name: company.conn_name || '',
            booksfrom: company.booksfrom || '',
            status: 'online',
            last_sync_date: new Date().toISOString(),
            is_active: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          console.log('📊 Storing company:', companyEntry.company_name, 'with GUID:', companyEntry.guid);

          // Check if company already exists by GUID (primary identifier)
          const existingCompanyByGuid = this.db!.getFirstSync(`
            SELECT id FROM companies WHERE guid = ? AND guid != ''
          `, [companyEntry.guid]);

          if (existingCompanyByGuid) {
            // Update existing company by GUID
            this.db!.runSync(`
              UPDATE companies SET 
                company_name = ?, conn_name = ?, shared_email = ?, access_type = ?, booksfrom = ?,
                status = ?, last_sync_date = ?, updated_at = ?
              WHERE guid = ?
            `, [
              companyEntry.company_name,
              companyEntry.conn_name,
              company.shared_email || '',
              company.access_type || 'read',
              companyEntry.booksfrom,
              companyEntry.status,
              companyEntry.last_sync_date,
              companyEntry.updated_at,
              companyEntry.guid
            ]);
            console.log('📊 Updated existing company by GUID:', companyEntry.company_name);
          } else {
            // Check if there's a company with same tallyloc_id but different GUID
            const existingCompanyByTallyloc = this.db!.getFirstSync(`
              SELECT id, guid FROM companies WHERE tallyloc_id = ?
            `, [companyEntry.tallyloc_id]);

            if (existingCompanyByTallyloc) {
              console.log('📊 Found company with same tallyloc_id but different GUID:', {
                existing_guid: existingCompanyByTallyloc.guid,
                new_guid: companyEntry.guid,
                tallyloc_id: companyEntry.tallyloc_id
              });
              console.log('📊 Storing as separate company due to different GUID');
            }
            // Insert new company
            this.db!.runSync(`
              INSERT INTO companies (
                company_name, guid, tallyloc_id, conn_name, shared_email, access_type, booksfrom, status, 
                last_sync_date, is_active, created_at, updated_at
              ) VALUES (?, NULLIF(?, ''), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              companyEntry.company_name,
              companyEntry.guid,
              companyEntry.tallyloc_id,
              companyEntry.conn_name,
              company.shared_email || '',
              company.access_type || 'read',
              companyEntry.booksfrom,
              companyEntry.status,
              companyEntry.last_sync_date,
              companyEntry.is_active,
              companyEntry.created_at,
              companyEntry.updated_at
            ]);
            console.log('📊 Inserted new company:', companyEntry.company_name);
          }
        }
      });

      console.log(`✅ Successfully stored ${companies.length} companies`);
    } catch (error) {
      console.error('❌ Failed to store companies:', error);
      throw error;
    }
  }

  // Get all companies
  async getCompanies(): Promise<UserConnection[]> {
    if (!this.db || !this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      console.log('📱 Retrieving companies from SQLite...');
      // Backfill empty company_name with conn_name to ensure offline display
      try {
        this.db.runSync(`
          UPDATE companies
          SET company_name = conn_name
          WHERE (company_name IS NULL OR TRIM(company_name) = '') AND conn_name IS NOT NULL AND TRIM(conn_name) != ''
        `);
      } catch {}

      const result = this.db.getAllSync(`
        SELECT * FROM companies 
        WHERE is_active = 1 
        ORDER BY company_name ASC
      `);

      console.log(`📱 Found ${result.length} companies in SQLite`);
      console.log('📱 Raw SQLite data:', JSON.stringify(result, null, 2));
      console.log('📱 Company statuses:', result.map(c => ({ company: c.company_name, status: c.status, guid: c.guid })));

      // Convert CompanyEntry to UserConnection format
      const companies = (result as any[]).map(entry => ({
        tallyloc_id: entry.tallyloc_id,
        conn_name: entry.conn_name,
        company: (entry.company_name && entry.company_name.trim() !== '') ? entry.company_name : (entry.conn_name || ''),
        guid: entry.guid,
        booksfrom: entry.booksfrom || '',
        shared_email: entry.shared_email || '',
        status: entry.status,
        access_type: entry.access_type || 'read'
      }));

      console.log('📱 Converted companies:', JSON.stringify(companies, null, 2));
      return companies;
    } catch (error) {
      console.error('❌ Failed to get companies:', error);
      throw error;
    }
  }

  // Update company data including booksfrom
  async updateCompanyData(identifier: string, companyData: any): Promise<void> {
    if (!this.db || !this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      console.log(`📱 Updating company data: ${identifier}`, companyData);
      
      // Try to update by GUID first, then by tallyloc_id if GUID is empty
      let result = this.db.runSync(`
        UPDATE companies 
        SET 
          company_name = ?, 
          conn_name = ?, 
          shared_email = ?, 
          access_type = ?, 
          booksfrom = ?, 
          -- backfill guid if provided (or keep existing)
          guid = COALESCE(NULLIF(?, ''), guid),
          status = ?, 
          last_sync_date = ?, 
          updated_at = ?
        WHERE guid = ? AND guid != ''
      `, [
        companyData.company || companyData.company_name || '',
        companyData.conn_name || '',
        companyData.shared_email || '',
        companyData.access_type || 'read',
        companyData.booksfrom || '',
        companyData.guid || '',
        'online',
        new Date().toISOString(),
        new Date().toISOString(),
        identifier
      ]);
      
      // If no rows were updated (empty GUID), try by tallyloc_id
      if (result.changes === 0) {
        console.log(`📱 No update by GUID, trying tallyloc_id: ${identifier}`);
        result = this.db.runSync(`
          UPDATE companies 
          SET 
            company_name = ?, 
            conn_name = ?, 
            shared_email = ?, 
            access_type = ?, 
            booksfrom = ?,
            -- backfill guid when we only had tallyloc earlier
            guid = COALESCE(NULLIF(?, ''), guid),
            status = ?, 
            last_sync_date = ?, 
            updated_at = ?
          WHERE tallyloc_id = ?
        `, [
          companyData.company || companyData.company_name || '',
          companyData.conn_name || '',
          companyData.shared_email || '',
          companyData.access_type || 'read',
          companyData.booksfrom || '',
          companyData.guid || '',
          'online',
          new Date().toISOString(),
          new Date().toISOString(),
          parseInt(identifier)
        ]);
      }
      
      console.log(`📱 Updated company data: ${result.changes} rows affected`);
    } catch (error) {
      console.error('❌ Failed to update company data:', error);
      throw error;
    }
  }

  // Update company status
  async updateCompanyStatus(identifier: string, status: 'online' | 'offline' | 'unknown'): Promise<void> {
    if (!this.db || !this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      console.log(`📱 Updating company status: ${identifier} -> ${status}`);
      
      // Try to update by GUID first, then by tallyloc_id if GUID is empty
      let result = this.db.runSync(`
        UPDATE companies 
        SET status = ?, last_sync_date = ?, updated_at = ?
        WHERE guid = ? AND guid != ''
      `, [status, new Date().toISOString(), new Date().toISOString(), identifier]);
      
      // If no rows were updated (empty GUID), try by tallyloc_id
      if (result.changes === 0) {
        console.log(`📱 No update by GUID, trying tallyloc_id: ${identifier}`);
        result = this.db.runSync(`
          UPDATE companies 
          SET status = ?, last_sync_date = ?, updated_at = ?
          WHERE tallyloc_id = ?
        `, [status, new Date().toISOString(), new Date().toISOString(), parseInt(identifier)]);
      }
      
      console.log(`📱 Status update result: ${result.changes} rows updated`);
      
    } catch (error) {
      console.error('❌ Failed to update company status:', error);
      throw error;
    }
  }

  // Update all companies status
  async updateAllCompaniesStatus(status: 'online' | 'offline' | 'unknown'): Promise<void> {
    if (!this.db || !this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      this.db.runSync(`
        UPDATE companies 
        SET status = ?, updated_at = ?
        WHERE is_active = 1
      `, [status, new Date().toISOString()]);
    } catch (error) {
      console.error('❌ Failed to update all companies status:', error);
      throw error;
    }
  }

  // Check if companies data exists
  async hasCompaniesData(): Promise<boolean> {
    if (!this.db || !this.isInitialized) {
      console.log('❌ Database not initialized for hasCompaniesData check');
      return false;
    }

    try {
      console.log('🔍 Checking companies table for data...');
      const result = this.db.getFirstSync(`
        SELECT COUNT(*) as count FROM companies WHERE is_active = 1
      `);

      const count = (result as any)?.count || 0;
      console.log('🔍 Found companies count:', count);
      return count > 0;
    } catch (error) {
      console.error('❌ Failed to check companies data:', error);
      return false;
    }
  }

  // Clear all companies data
  async clearAllCompanies(): Promise<void> {
    if (!this.db || !this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      this.db.runSync('DELETE FROM companies');
      console.log('✅ Cleared all companies data');
    } catch (error) {
      console.error('❌ Failed to clear companies data:', error);
      throw error;
    }
  }

  // Clear fallback companies (companies with fallback names)
  async clearFallbackCompanies(): Promise<void> {
    if (!this.db || !this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      console.log('🧹 Clearing fallback companies...');
      
      // Find and delete companies with fallback names
      const fallbackCompanies = this.db.getAllSync(`
        SELECT * FROM companies 
        WHERE (company_name = conn_name OR guid LIKE 'offline-%') 
        AND is_active = 1
      `);

      for (const company of fallbackCompanies) {
        this.db.runSync(`DELETE FROM companies WHERE id = ?`, [company.id]);
        console.log(`🗑️ Deleted fallback company: ${company.company_name} (ID: ${company.id})`);
      }
      
      console.log(`✅ Cleared ${fallbackCompanies.length} fallback companies`);
    } catch (error) {
      console.error('❌ Failed to clear fallback companies:', error);
      throw error;
    }
  }

  // Clear duplicate companies (keep only the latest one per tallyloc_id)
  async clearDuplicateCompanies(): Promise<void> {
    if (!this.db || !this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      console.log('🧹 Cleaning up duplicate companies...');
      
      // Get all companies grouped by GUID (primary identifier)
      const companies = this.db.getAllSync(`
        SELECT * FROM companies WHERE is_active = 1 ORDER BY guid, updated_at DESC
      `);

      const companyGroups = companies.reduce((groups: any, company: any) => {
        const key = company.guid || 'empty-guid';
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(company);
        return groups;
      }, {});

      // For each group, keep only the best company
      for (const [guid, companyList] of Object.entries(companyGroups)) {
        if ((companyList as any[]).length > 1) {
          console.log(`🧹 Found ${(companyList as any[]).length} duplicates for GUID ${guid}`);
          
          // Prefer original company name over fallback names
          const sortedCompanies = (companyList as any[]).sort((a, b) => {
            // Prefer companies with real names (not fallback names like "mytally")
            const aIsFallback = a.company_name === a.conn_name || a.guid.startsWith('offline-');
            const bIsFallback = b.company_name === b.conn_name || b.guid.startsWith('offline-');
            
            if (aIsFallback && !bIsFallback) return 1; // b is better
            if (!aIsFallback && bIsFallback) return -1; // a is better
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(); // Most recent
          });
          
          const keepCompany = sortedCompanies[0];
          const deleteCompanies = sortedCompanies.slice(1);
          
          console.log(`✅ Keeping company: ${keepCompany.company_name} (ID: ${keepCompany.id})`);
          
          // Delete the duplicates
          for (const duplicate of deleteCompanies) {
            this.db.runSync(`DELETE FROM companies WHERE id = ?`, [duplicate.id]);
            console.log(`🗑️ Deleted duplicate company: ${duplicate.company_name} (ID: ${duplicate.id})`);
          }
        }
      }
      
      console.log('✅ Duplicate cleanup completed');
    } catch (error) {
      console.error('❌ Failed to clear duplicate companies:', error);
      throw error;
    }
  }

  // Clear all data (companies and related data) - Only for manual user action
  async clearAllData(): Promise<void> {
    if (!this.db || !this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      console.log('🗑️ Clearing all company data from SQLite (manual user action)...');
      
      this.db.withTransactionSync(() => {
        // Clear all companies
        this.db!.runSync('DELETE FROM companies');
        console.log('✅ Cleared all companies from SQLite');
      });
      
    } catch (error) {
      console.error('❌ Error clearing all company data:', error);
      throw error;
    }
  }


  // Store a single company when it's loaded (for new companies)
  async storeCompany(company: any): Promise<void> {
    if (!this.db || !this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      console.log('📊 Storing single company:', company.company || company.company_name || 'Unknown Company');
      console.log('📊 Raw company data:', JSON.stringify(company, null, 2));
      
      // Use conn_name as fallback if company name is empty (for offline companies)
      const companyName = company.company || company.company_name || company.name || company.title || company.conn_name || 'Unknown Company';
      const companyEntry: CompanyEntry = {
        company_name: companyName,
        guid: company.guid || '',
        tallyloc_id: company.tallyloc_id || 0,
        conn_name: company.conn_name || '',
        shared_email: company.shared_email || '',
        access_type: company.access_type || 'read',
        booksfrom: company.booksfrom || '',
        status: company.status || 'online', // Preserve status if provided (e.g., 'offline')
        last_sync_date: new Date().toISOString(),
        is_active: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('📊 Processed company entry:', JSON.stringify(companyEntry, null, 2));

      this.db.withTransactionSync(() => {
        // If company has a GUID, try to find by GUID first
        if (companyEntry.guid && companyEntry.guid.trim() !== '') {
          const existingCompanyByGuid = this.db!.getFirstSync(`
            SELECT id, company_name, guid, tallyloc_id FROM companies 
            WHERE guid = ?
          `, [companyEntry.guid]);

          if (existingCompanyByGuid) {
            console.log('📊 Company already exists by GUID, updating:', companyEntry.company_name);
            // Update existing company by GUID
            this.db!.runSync(`
              UPDATE companies SET 
                company_name = ?, conn_name = ?, shared_email = ?, access_type = ?, booksfrom = ?,
                status = ?, last_sync_date = ?, updated_at = ?
              WHERE guid = ?
            `, [
              companyEntry.company_name,
              companyEntry.conn_name,
              company.shared_email || '',
              company.access_type || 'read',
              companyEntry.booksfrom,
              companyEntry.status,
              companyEntry.last_sync_date,
              companyEntry.updated_at,
              companyEntry.guid
            ]);
            console.log('📊 Updated existing company by GUID:', companyEntry.company_name);
            return; // Exit transaction
          }
        }

        // Check if there's a company with same tallyloc_id (for companies without GUIDs or GUID mismatch)
        const existingCompanyByTallyloc = this.db!.getFirstSync(`
          SELECT id, company_name, guid, tallyloc_id FROM companies 
          WHERE tallyloc_id = ?
        `, [companyEntry.tallyloc_id]);

        if (existingCompanyByTallyloc) {
          console.log('📊 Company exists by tallyloc_id, updating:', companyEntry.company_name);
          // Update existing company by tallyloc_id
          this.db!.runSync(`
            UPDATE companies SET 
              company_name = ?, conn_name = ?, shared_email = ?, access_type = ?, booksfrom = ?,
              guid = COALESCE(NULLIF(?, ''), guid), status = ?, last_sync_date = ?, updated_at = ?
            WHERE tallyloc_id = ?
          `, [
            companyEntry.company_name,
            companyEntry.conn_name,
            company.shared_email || '',
            company.access_type || 'read',
            companyEntry.booksfrom,
            companyEntry.guid, // Update GUID if it was empty before
            companyEntry.status,
            companyEntry.last_sync_date,
            companyEntry.updated_at,
            companyEntry.tallyloc_id
          ]);
          console.log('📊 Updated existing company by tallyloc_id:', companyEntry.company_name);
        } else {
          // Insert new company (doesn't exist yet)
          this.db!.runSync(`
            INSERT INTO companies (
              company_name, guid, tallyloc_id, conn_name, shared_email, access_type, booksfrom,
              status, last_sync_date, is_active, created_at, updated_at
            ) VALUES (?, NULLIF(?, ''), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            companyEntry.company_name,
            companyEntry.guid,
            companyEntry.tallyloc_id,
            companyEntry.conn_name,
            company.shared_email || '',
            company.access_type || 'read',
            companyEntry.booksfrom,
            companyEntry.status,
            companyEntry.last_sync_date,
            companyEntry.is_active,
            companyEntry.created_at,
            companyEntry.updated_at
          ]);
          console.log('📊 Inserted new company:', companyEntry.company_name);
        }
      });
      
    } catch (error) {
      console.error('❌ Error storing single company:', error);
      throw error;
    }
  }

  // Note: Company data clearing methods removed - user controls data deletion
  // Companies are preserved for offline use and user can clear them manually if needed

  // Close database
  close(): void {
    if (this.db) {
      this.db.closeSync();
      this.db = null;
      this.isInitialized = false;
    }
  }
}

export const companyDataService = new CompanyDataService();


