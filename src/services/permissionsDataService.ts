import * as SQLite from 'expo-sqlite';

export interface PermissionsEntry {
  id?: number;
  company_guid: string;
  tallyloc_id: number;
  roles_data: string; // JSON string of roles data
  last_sync_date: string;
  created_at: string;
  updated_at: string;
}

class PermissionsDataService {
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized && this.db) {
      console.log('📱 PermissionsDataService already initialized');
      return;
    }

    try {
      this.db = await SQLite.openDatabaseAsync('PermissionsData.db');
      await this.createTables();
      this.isInitialized = true;
      console.log('📱 PermissionsDataService initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize PermissionsDataService:', error);
      throw error;
    }
  }

  private createTables(): void {
    if (!this.db) throw new Error('Database not initialized');

    try {
      this.db.execSync(`
        CREATE TABLE IF NOT EXISTS permissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company_guid TEXT NOT NULL,
          tallyloc_id INTEGER NOT NULL,
          roles_data TEXT NOT NULL,
          last_sync_date TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(company_guid, tallyloc_id)
        )
      `);

      console.log('✅ Permissions table created or already exists');
    } catch (error) {
      console.error('❌ Failed to create permissions table:', error);
      throw error;
    }
  }

  // Store permissions data for a company
  async storePermissions(companyGuid: string, tallylocId: number, rolesData: any): Promise<void> {
    if (!this.db || !this.isInitialized) {
      await this.initialize();
    }

    try {
      if (!companyGuid || companyGuid.trim() === '') {
        console.log('⚠️ Cannot store permissions: company GUID is empty');
        return;
      }

      console.log(`📊 Storing permissions for company: ${companyGuid}`);
      
      const rolesDataJson = JSON.stringify(rolesData);
      const now = new Date().toISOString();

      this.db!.withTransactionSync(() => {
        // Use INSERT OR REPLACE to update if exists
        this.db!.runSync(`
          INSERT OR REPLACE INTO permissions (
            company_guid, tallyloc_id, roles_data, last_sync_date, created_at, updated_at
          ) VALUES (?, ?, ?, ?, COALESCE((SELECT created_at FROM permissions WHERE company_guid = ? AND tallyloc_id = ?), ?), ?)
        `, [
          companyGuid,
          tallylocId,
          rolesDataJson,
          now,
          companyGuid,
          tallylocId,
          now,
          now
        ]);
      });

      console.log(`✅ Successfully stored permissions for company: ${companyGuid}`);
    } catch (error) {
      console.error('❌ Failed to store permissions:', error);
      throw error;
    }
  }

  // Get permissions data for a company
  async getPermissions(companyGuid: string, tallylocId?: number): Promise<any | null> {
    if (!this.db || !this.isInitialized) {
      await this.initialize();
    }

    try {
      if (!companyGuid || companyGuid.trim() === '') {
        console.log('⚠️ Cannot get permissions: company GUID is empty');
        return null;
      }

      let result;
      if (tallylocId !== undefined) {
        result = this.db!.getFirstSync(`
          SELECT * FROM permissions 
          WHERE company_guid = ? OR (company_guid = '' AND tallyloc_id = ?)
          ORDER BY company_guid DESC
          LIMIT 1
        `, [companyGuid, tallylocId]);
      } else {
        result = this.db!.getFirstSync(`
          SELECT * FROM permissions 
          WHERE company_guid = ?
          LIMIT 1
        `, [companyGuid]);
      }

      if (!result) {
        console.log(`📊 No permissions found for company: ${companyGuid}`);
        return null;
      }

      const entry = result as any;
      const rolesData = JSON.parse(entry.roles_data);
      
      console.log(`✅ Retrieved permissions for company: ${companyGuid}`);
      return rolesData;
    } catch (error) {
      console.error('❌ Failed to get permissions:', error);
      return null;
    }
  }

  // Check if permissions exist for a company
  async hasPermissions(companyGuid: string, tallylocId?: number): Promise<boolean> {
    if (!this.db || !this.isInitialized) {
      await this.initialize();
    }

    try {
      if (!companyGuid || companyGuid.trim() === '') {
        return false;
      }

      let result;
      if (tallylocId !== undefined) {
        result = this.db!.getFirstSync(`
          SELECT COUNT(*) as count FROM permissions 
          WHERE company_guid = ? OR (company_guid = '' AND tallyloc_id = ?)
        `, [companyGuid, tallylocId]);
      } else {
        result = this.db!.getFirstSync(`
          SELECT COUNT(*) as count FROM permissions 
          WHERE company_guid = ?
        `, [companyGuid]);
      }

      const count = (result as any)?.count || 0;
      return count > 0;
    } catch (error) {
      console.error('❌ Failed to check permissions:', error);
      return false;
    }
  }

  // Clear permissions for a company
  async clearCompanyPermissions(companyGuid: string, tallylocId?: number): Promise<void> {
    if (!this.db || !this.isInitialized) {
      await this.initialize();
    }

    try {
      if (tallylocId !== undefined) {
        this.db!.runSync(`
          DELETE FROM permissions 
          WHERE company_guid = ? OR (company_guid = '' AND tallyloc_id = ?)
        `, [companyGuid, tallylocId]);
      } else {
        this.db!.runSync(`
          DELETE FROM permissions 
          WHERE company_guid = ?
        `, [companyGuid]);
      }

      console.log(`✅ Cleared permissions for company: ${companyGuid}`);
    } catch (error) {
      console.error('❌ Failed to clear permissions:', error);
      throw error;
    }
  }

  // Clear all permissions
  async clearAllPermissions(): Promise<void> {
    if (!this.db || !this.isInitialized) {
      await this.initialize();
    }

    try {
      this.db!.runSync('DELETE FROM permissions');
      console.log('✅ Cleared all permissions');
    } catch (error) {
      console.error('❌ Failed to clear all permissions:', error);
      throw error;
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
}

export const permissionsDataService = new PermissionsDataService();

