# SummaryReport Component

A comprehensive summary report component with multi-level grouping and drilldown functionality for React Native applications.

## Features

- **Multi-level Grouping**: Group by customer, stock item, or date with various granularities
- **Drilldown Support**: Expand grouped rows to see detailed breakdowns
- **Date Range Filtering**: Filter data by date range
- **Text Search**: Search across customer and item names
- **CSV Export**: Export current view to CSV format
- **Performance Optimized**: Handles large datasets (50k+ rows) efficiently
- **Responsive Design**: Works on both mobile and tablet devices

## Usage

```tsx
import { SummaryReport, Txn } from './SummaryReport';

const transactions: Txn[] = [
  {
    date: '2023-06-15T10:00:00Z',
    customer: 'Customer A',
    stockitem: 'Item 1',
    qty: 10,
    rate: 100,
    amount: 1000,
  },
  // ... more transactions
];

function MyComponent() {
  return <SummaryReport data={transactions} />;
}
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `data` | `Txn[]` | Array of transaction data |

## Transaction Data Structure

```tsx
type Txn = {
  date: string;        // ISO date string
  customer: string;     // Customer name
  stockitem: string;   // Stock item name
  qty: number;         // Quantity
  rate: number;        // Rate per unit
  amount: number;      // Total amount (qty * rate)
};
```

## Grouping Options

### Primary Group By
- **Customer**: Group by customer name
- **Stock Item**: Group by stock item name
- **Date**: Group by date with configurable granularity

### Date Granularity (when Date is selected)
- **Day**: Group by individual days
- **Week**: Group by weeks (Monday start)
- **Month**: Group by months
- **Quarter**: Group by quarters
- **Year**: Group by years

### Second Group By
- **None**: No secondary grouping
- **Customer**: Secondary grouping by customer
- **Stock Item**: Secondary grouping by stock item
- **Date**: Secondary grouping by date

## Drilldown Examples

### Customer → Stock Item → Transactions
1. Group by Customer shows customer totals
2. Expand customer to see stock items for that customer
3. Expand stock item to see individual transactions

### Date → Customer → Transactions
1. Group by Date (Month) shows monthly totals
2. Expand month to see customers for that month
3. Expand customer to see individual transactions

## Performance Features

- **Memoized Computations**: All data transformations are memoized
- **Efficient Grouping**: Uses optimized grouping algorithms
- **Lazy Rendering**: Only renders visible rows
- **Memory Management**: Handles large datasets without memory issues

## CSV Export

The component includes built-in CSV export functionality that:
- Exports the current table view (respecting grouping and filters)
- Includes proper CSV escaping for special characters
- Supports both grouped and detailed views
- Formats numbers and dates consistently

## Dependencies

- `@tanstack/react-table`: Table functionality and grouping
- `date-fns`: Date manipulation and formatting
- `@react-native-picker/picker`: Dropdown controls

## Installation

```bash
npm install @tanstack/react-table date-fns @react-native-picker/picker
```

## Examples

### Basic Usage
```tsx
import { SummaryReport } from './SummaryReport';

function App() {
  const transactions = [
    // ... your transaction data
  ];
  
  return <SummaryReport data={transactions} />;
}
```

### With Mock Data
```tsx
import { SummaryReport } from './SummaryReport';
import { generateMockTransactions } from '../lib/mockData';

function App() {
  const transactions = generateMockTransactions({ count: 1000 });
  
  return <SummaryReport data={transactions} />;
}
```

## Testing

The component includes comprehensive unit tests covering:
- Date bucketing utilities
- CSV export functionality
- Component rendering
- Performance with large datasets

Run tests with:
```bash
npm test
```

## Performance Tips

1. **Use Memoization**: The component automatically memoizes expensive computations
2. **Limit Data Size**: For very large datasets, consider server-side filtering
3. **Optimize Grouping**: Use appropriate granularity levels for your data
4. **Monitor Memory**: Watch memory usage with very large datasets

## Troubleshooting

### Common Issues

1. **Slow Rendering**: Reduce dataset size or use server-side filtering
2. **Memory Issues**: Implement pagination for very large datasets
3. **Date Formatting**: Ensure dates are in ISO format
4. **Grouping Issues**: Check that grouping columns exist in your data

### Performance Optimization

1. **Use useMemo**: Wrap expensive computations in useMemo
2. **Avoid Re-renders**: Use React.memo for child components
3. **Optimize Filters**: Use efficient filtering algorithms
4. **Monitor Bundle Size**: Keep dependencies minimal

## Contributing

When contributing to this component:

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Consider performance implications
5. Test with large datasets

## License

This component is part of the DataLynk project and follows the same license terms.





