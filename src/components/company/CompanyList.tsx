import React, { memo, useCallback } from 'react';
import {
  View,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { UserConnection } from '../../config/api';
import CompanyCard from './CompanyCard';
import EmptyState from './EmptyState';
import { LightweightList } from '../common';

export interface CompanyListProps {
  companies: UserConnection[];
  isSelecting: boolean;
  searchText: string;
  onCompanyPress: (company: UserConnection) => void;
  onCompanyPressIn: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const CompanyList: React.FC<CompanyListProps> = memo(({
  companies,
  isSelecting,
  searchText,
  onCompanyPress,
  onCompanyPressIn,
  onRefresh,
  isRefreshing,
}) => {


  // Memoized render item function for LightweightList
  const renderCompanyItem = useCallback((item: UserConnection, onPress: () => void) => {
    return (
      <CompanyCard
        key={`${item.company}-${item.tallyloc_id}`}
        company={item}
        isSelecting={isSelecting}
        onPress={() => {
          // Call the onPress function that will trigger handleItemPress in LightweightList
          onPress();
        }}
        onPressIn={onCompanyPressIn}
      />
    );
  }, [isSelecting, onCompanyPressIn]);

  // Memoized empty component
  const ListEmptyComponentMemo = useCallback(() => (
    <EmptyState 
      searchText={searchText}
      onRetry={onRefresh}
    />
  ), [searchText, onRefresh]);



  return (
    <View style={styles.container}>
      <LightweightList
        data={companies}
        onItemSelect={onCompanyPress}
        loading={false}
        searchFields={[]} // No search needed as it's handled by parent
        renderItem={renderCompanyItem}
        emptyMessage=""
        loadingMessage=""
        itemHeight={95}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={10}
      />
      {isRefreshing && (
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          colors={['#007AFF']}
          tintColor="#007AFF"
          title="Pull to refresh"
          titleColor="#007AFF"
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: 20,
  },
});

CompanyList.displayName = 'CompanyList';

export default CompanyList;
