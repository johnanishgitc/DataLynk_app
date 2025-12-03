/**
 * SummaryReport Demo Component
 * 
 * Demonstrates the SummaryReport component with mock data
 * and various configuration options.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SummaryReport, Txn } from './SummaryReport';
import { 
  generateMockTransactions, 
  generateSmallDataset, 
  generateLargeDataset,
  generatePatternedDataset,
  generateEdgeCaseDataset,
  generateDatePatternDataset 
} from '../../lib/mockData';

export function SummaryReportDemo() {
  const [currentDataset, setCurrentDataset] = useState<Txn[]>([]);
  const [datasetName, setDatasetName] = useState<string>('');

  const loadDataset = (generator: () => Txn[], name: string) => {
    const data = generator();
    setCurrentDataset(data);
    setDatasetName(name);
  };

  const datasets = [
    {
      name: 'Small Dataset (50 records)',
      generator: generateSmallDataset,
      description: 'Quick testing with 50 records over 1 month',
    },
    {
      name: 'Patterned Dataset (45 records)',
      generator: generatePatternedDataset,
      description: 'Predictable patterns for testing grouping logic',
    },
    {
      name: 'Date Pattern Dataset (19 records)',
      generator: generateDatePatternDataset,
      description: 'Specific date patterns for testing date bucketing',
    },
    {
      name: 'Edge Cases Dataset (5 records)',
      generator: generateEdgeCaseDataset,
      description: 'Edge cases with zero values and large numbers',
    },
    {
      name: 'Medium Dataset (1,000 records)',
      generator: () => generateMockTransactions({ count: 1000 }),
      description: 'Medium-sized dataset for performance testing',
    },
    {
      name: 'Large Dataset (50,000 records)',
      generator: generateLargeDataset,
      description: 'Large dataset for performance testing (may be slow)',
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SummaryReport Demo</Text>
      
      <View style={styles.controls}>
        <Text style={styles.sectionTitle}>Load Dataset:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {datasets.map((dataset, index) => (
            <TouchableOpacity
              key={index}
              style={styles.datasetButton}
              onPress={() => loadDataset(dataset.generator, dataset.name)}
            >
              <Text style={styles.datasetButtonText}>{dataset.name}</Text>
              <Text style={styles.datasetDescription}>{dataset.description}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {currentDataset.length > 0 && (
        <View style={styles.reportContainer}>
          <Text style={styles.datasetInfo}>
            Loaded: {datasetName} ({currentDataset.length} records)
          </Text>
          <SummaryReport data={currentDataset} />
        </View>
      )}

      {currentDataset.length === 0 && (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            Select a dataset above to see the SummaryReport in action
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  controls: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#495057',
  },
  datasetButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    marginRight: 8,
    borderRadius: 8,
    minWidth: 200,
  },
  datasetButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  datasetDescription: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
  },
  reportContainer: {
    flex: 1,
  },
  datasetInfo: {
    padding: 12,
    backgroundColor: '#e9ecef',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  placeholderText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
});





