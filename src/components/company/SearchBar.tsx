import React, { memo } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
} from 'react-native';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = memo(({
  value,
  onChangeText,
  placeholder = "Search by company name or email...",
}) => {
  return (
    <View style={styles.searchContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor="#999"
        autoComplete="off"
        autoCorrect={false}
        autoCapitalize="none"
        spellCheck={false}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  searchContainer: {
    marginBottom: 0, // Removed padding below search box to maximize space
    // OLD: marginBottom: 25
  },
  searchInput: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

SearchBar.displayName = 'SearchBar';

export default SearchBar;


