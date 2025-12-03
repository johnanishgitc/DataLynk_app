import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PeriodSelector } from './PeriodSelector';

// Example 1: Basic usage
export const BasicPeriodSelectorExample: React.FC = () => {
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());

  const handlePeriodChange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
    console.log('Period changed:', { start, end });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Basic Period Selector</Text>
      <PeriodSelector
        onPeriodChange={handlePeriodChange}
        initialStartDate={startDate}
        initialEndDate={endDate}
      />
      <Text style={styles.info}>
        Selected: {startDate.toLocaleDateString()} to {endDate.toLocaleDateString()}
      </Text>
    </View>
  );
};

// Example 2: With custom styling
export const StyledPeriodSelectorExample: React.FC = () => {
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());

  const handlePeriodChange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
    console.log('Period changed:', { start, end });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Styled Period Selector</Text>
      <PeriodSelector
        onPeriodChange={handlePeriodChange}
        initialStartDate={startDate}
        initialEndDate={endDate}
        containerStyle={styles.customStyle}
      />
      <Text style={styles.info}>
        Selected: {startDate.toLocaleDateString()} to {endDate.toLocaleDateString()}
      </Text>
    </View>
  );
};

// Example 3: In a form or settings screen
export const FormPeriodSelectorExample: React.FC = () => {
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());

  const handlePeriodChange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
    // You can trigger other actions here like:
    // - Save to local storage
    // - Update API calls
    // - Refresh data
    // - Update other form fields
  };

  const handleSubmit = () => {
    console.log('Form submitted with period:', { startDate, endDate });
    // Submit form logic here
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Form with Period Selector</Text>
      
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Report Period</Text>
        <PeriodSelector
          onPeriodChange={handlePeriodChange}
          initialStartDate={startDate}
          initialEndDate={endDate}
        />
      </View>

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Other Form Fields</Text>
        <Text style={styles.info}>Add your other form fields here...</Text>
      </View>

      <View style={styles.buttonContainer}>
        <Text style={styles.submitButton} onPress={handleSubmit}>
          Generate Report
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  info: {
    fontSize: 14,
    color: '#666',
    marginTop: 15,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  customStyle: {
    backgroundColor: '#E8F5E8',
    borderTopColor: '#4CAF50',
    borderBottomColor: '#4CAF50',
  },
  formSection: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  buttonContainer: {
    marginTop: 20,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    color: 'white',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    overflow: 'hidden',
  },
});

/*
USAGE EXAMPLES:

1. Basic Usage:
```tsx
import { PeriodSelector } from '../common/PeriodSelector';

const MyComponent = () => {
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());

  const handlePeriodChange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
    // Your logic here
  };

  return (
    <PeriodSelector
      onPeriodChange={handlePeriodChange}
      initialStartDate={startDate}
      initialEndDate={endDate}
    />
  );
};
```

2. With Custom Styling:
```tsx
<PeriodSelector
  onPeriodChange={handlePeriodChange}
  initialStartDate={startDate}
  initialEndDate={endDate}
  containerStyle={{
    backgroundColor: '#E8F5E8',
    borderTopColor: '#4CAF50',
    borderBottomColor: '#4CAF50',
  }}
/>
*/
