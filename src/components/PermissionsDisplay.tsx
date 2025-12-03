import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/colors';
import { Spacing } from '../constants/spacing';

interface Permission {
  id: number;
  permission_key: string;
  display_name: string;
  description: string | null;
  sort_order: number;
  permission_value: string | null;
  permission_type: string;
  permission_options: any;
  parent_permission_id: number | null;
  parent_permission_key: string | null;
  parent_permission_name: string | null;
  is_parent: boolean;
  is_child: boolean;
  children: any[];
}

interface Module {
  module_id: number;
  module_name: string;
  module_display_name: string;
  module_description: string;
  module_sort_order: number;
  permissions: Permission[];
}

interface PermissionsDisplayProps {
  allPermissions: any | null;
  userPermissions: any | null;
}

export const PermissionsDisplay: React.FC<PermissionsDisplayProps> = ({
  allPermissions,
  userPermissions,
}) => {
  if (!allPermissions) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading permissions...</Text>
      </View>
    );
  }

  // Support multiple payload shapes:
  // - { permissions: Module[] }
  // - { modules: Module[] }
  // - { data: { modules: Module[] } }
  // Filter to only show place_order module for mobile app
  const allModulesRaw = 
    allPermissions?.permissions ||
    allPermissions?.modules ||
    allPermissions?.data?.modules ||
    [];
  
  const modules: Module[] = allModulesRaw.filter((module: any) => module.module_name === 'place_order');
  const userPermissionsMap = new Map<string, boolean>();
  
  // Create a map of user permissions for quick lookup
  // Roles structure: { data: { modules: [{ permissions: [{ permission_key, granted }] }] } }
  const roleModules = userPermissions?.data?.modules || userPermissions?.modules || [];
  console.log('🔍 PermissionsDisplay - Building user permissions map:', {
    hasUserPermissions: !!userPermissions,
    roleModulesCount: roleModules?.length || 0,
    structure: userPermissions ? Object.keys(userPermissions) : []
  });
  
  if (roleModules && Array.isArray(roleModules)) {
    // Filter to only show place_order module permissions (for mobile app)
    const placeOrderModule = roleModules.find((module: any) => module.module_name === 'place_order');
    console.log('🔍 Found place_order module:', !!placeOrderModule);
    
    if (placeOrderModule && placeOrderModule.permissions) {
      placeOrderModule.permissions.forEach((permission: any) => {
        console.log(`  ➜ ${permission.permission_key}: ${permission.granted}, value: ${permission.permission_value}`);
        userPermissionsMap.set(permission.permission_key, {
          granted: permission.granted,
          value: permission.permission_value
        });
      });
    }
  }
  
  console.log('🔍 Total permissions in map:', userPermissionsMap.size);

  const hasPermission = (permissionKey: string): boolean => {
    return userPermissionsMap.get(permissionKey)?.granted || false;
  };

  const renderPermission = (permission: Permission, level: number = 0) => {
    const isGranted = hasPermission(permission.permission_key);
    const hasChildren = permission.children && permission.children.length > 0;
    
    // Get the user-specific permission value from rolesData
    const userPermissionEntry = userPermissionsMap.get(permission.permission_key);
    const userPermissionValue = userPermissionEntry?.value;
    const hasValue = userPermissionValue && userPermissionValue !== null;
    
    return (
      <View key={permission.id} style={[styles.permissionItem, { marginLeft: level * 14 }]}> 
        <View style={styles.permissionRowCompact}>
          <View style={styles.permissionTextContainer}>
            <Text style={styles.permissionNameCompact} numberOfLines={2}>{permission.display_name}</Text>
            {hasValue && (
              <Text style={styles.permissionValue} numberOfLines={1}>
                Value: {userPermissionValue}
              </Text>
            )}
          </View>
          <Text style={[styles.permissionBadge, { color: isGranted ? Colors.success : Colors.error }]}>
            {isGranted ? '✓' : '✗'}
          </Text>
        </View>
        
        {hasChildren && (
          <View style={styles.childrenContainer}>
            {permission.children.map((child: Permission) => 
              renderPermission(child, level + 1)
            )}
          </View>
        )}
      </View>
    );
  };

  const renderModule = (module: Module) => {
    const hasAnyPermission = module.permissions.some(permission => hasPermission(permission.permission_key));
    
    return (
      <View key={module.module_id} style={styles.moduleContainer}>
        <View style={styles.moduleHeader}>
          <Text style={styles.moduleName}>{module.module_display_name}</Text>
          <Text style={styles.moduleDescription}>{module.module_description}</Text>
          <View style={[
            styles.moduleStatusIndicator,
            { backgroundColor: hasAnyPermission ? Colors.success : Colors.error }
          ]}>
            <Text style={styles.moduleStatusText}>
              {hasAnyPermission ? 'Some permissions granted' : 'No permissions granted'}
            </Text>
          </View>
        </View>
        
        <View style={styles.permissionsList}>
          {module.permissions.map((permission: Permission) => 
            renderPermission(permission)
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={true}>
      {modules.map(renderModule)}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    marginTop: 20,
  },
  // Removed header/title/subtitle per request
  moduleContainer: {
    marginHorizontal: 0, // full width edge-to-edge
    marginTop: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: 0,
    borderWidth: 0,
  },
  moduleHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 8,
    borderTopColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  moduleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  moduleDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  moduleStatusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  moduleStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.white,
  },
  permissionsList: {
    paddingHorizontal: 0, // full width
    paddingVertical: Spacing.xs,
  },
  permissionItem: {
    marginBottom: 6,
  },
  permissionRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16, // comfortable edge padding while staying full-width
    backgroundColor: Colors.surface,
    borderRadius: 6,
  },
  permissionInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  permissionTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  permissionNameCompact: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    flexShrink: 1,
  },
  permissionValue: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
    fontStyle: 'italic',
  },
  permissionStatus: {
    alignItems: 'center',
    minWidth: 80,
  },
  permissionBadge: {
    fontSize: 18,
    fontWeight: '700',
  },
  childrenContainer: {
    marginTop: Spacing.xs,
  },
  // Removed footer legend per request
});
