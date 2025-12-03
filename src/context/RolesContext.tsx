import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface UserRole {
  role_id: string;
  role_name: string;
  permissions: string[];
  is_active: boolean;
}

export interface CompanyRole {
  company_guid: string;
  company_name: string;
  user_roles: UserRole[];
  access_level: 'read' | 'write' | 'admin' | 'owner';
  is_active: boolean;
}

export interface RolesData {
  user_id: string;
  user_email: string;
  companies: CompanyRole[];
  default_permissions: string[];
}

interface RolesContextType {
  rolesData: RolesData | null;
  currentCompanyRoles: CompanyRole | null;
  isLoading: boolean;
  error: string | null;
  setRolesData: (data: RolesData | null) => void;
  setCurrentCompanyRoles: (companyRoles: CompanyRole | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearRoles: () => void;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
}

const RolesContext = createContext<RolesContextType | undefined>(undefined);

export const useRoles = () => {
  const context = useContext(RolesContext);
  if (context === undefined) {
    throw new Error('useRoles must be used within a RolesProvider');
  }
  return context;
};

interface RolesProviderProps {
  children: ReactNode;
}

export const RolesProvider: React.FC<RolesProviderProps> = ({ children }) => {
  const [rolesData, setRolesData] = useState<RolesData | null>(null);
  const [currentCompanyRoles, setCurrentCompanyRoles] = useState<CompanyRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setLoading = (loading: boolean) => {
    setIsLoading(loading);
  };

  const clearRoles = () => {
    setRolesData(null);
    setCurrentCompanyRoles(null);
    setError(null);
    setIsLoading(false);
  };

  const hasPermission = (permission: string): boolean => {
    if (!currentCompanyRoles) return false;
    
    // Check if user has the permission in any of their roles
    return currentCompanyRoles.user_roles.some(role => 
      role.is_active && role.permissions.includes(permission)
    );
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!currentCompanyRoles) return false;
    
    // Check if user has any of the specified permissions
    return permissions.some(permission => hasPermission(permission));
  };

  const value: RolesContextType = {
    rolesData,
    currentCompanyRoles,
    isLoading,
    error,
    setRolesData,
    setCurrentCompanyRoles,
    setLoading,
    setError,
    clearRoles,
    hasPermission,
    hasAnyPermission,
  };

  return (
    <RolesContext.Provider value={value}>
      {children}
    </RolesContext.Provider>
  );
};





