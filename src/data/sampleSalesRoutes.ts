import { MapSelection } from '../components/dashboard/MapLocationPicker';

export interface SampleCustomer extends MapSelection {
  id: string;
  name: string;
  addressLine: string;
  assignedSalesPersonId: string;
}

export interface SampleRoute {
  id: string;
  name: string;
  salesPersonId: string;
  plannedDate: string;
  plannedDayOfWeek?: string;
  customers: SampleCustomer[];
}

export const sampleSalesRoutes: SampleRoute[] = [
  {
    id: 'blr-central-001',
    name: 'Central Bangalore Morning Loop',
    salesPersonId: 'sp-001',
    plannedDate: new Date().toISOString().split('T')[0],
    plannedDayOfWeek: 'Monday',
    customers: [
      {
        id: 'cust-ub-city',
        name: 'UB City Retail',
        assignedSalesPersonId: 'sp-001',
        addressLine: 'UB City, Vittal Mallya Road, Bengaluru',
        latitude: 12.9718915,
        longitude: 77.5968478,
      },
      {
        id: 'cust-banashankari',
        name: 'Banashankari Wholesale',
        assignedSalesPersonId: 'sp-001',
        addressLine: 'Banashankari Stage II, Bengaluru',
        latitude: 12.9202486,
        longitude: 77.5600306,
      },
      {
        id: 'cust-commercial-street',
        name: 'Commercial Street Mart',
        assignedSalesPersonId: 'sp-001',
        addressLine: 'Commercial Street, Shivaji Nagar, Bengaluru',
        latitude: 12.9838532,
        longitude: 77.6056349,
      },
    ],
  },
  {
    id: 'blr-south-001',
    name: 'South Bangalore Afternoon Loop',
    salesPersonId: 'sp-002',
    plannedDate: new Date().toISOString().split('T')[0],
    plannedDayOfWeek: 'Tuesday',
    customers: [
      {
        id: 'cust-koramangala',
        name: 'Koramangala Supplies',
        assignedSalesPersonId: 'sp-002',
        addressLine: 'Koramangala 5th Block, Bengaluru',
        latitude: 12.9351929,
        longitude: 77.6244807,
      },
      {
        id: 'cust-hsr',
        name: 'HSR Layout Retailers',
        assignedSalesPersonId: 'sp-002',
        addressLine: 'HSR Layout Sector 2, Bengaluru',
        latitude: 12.9121183,
        longitude: 77.6445542,
      },
      {
        id: 'cust-btm',
        name: 'BTM Market',
        assignedSalesPersonId: 'sp-002',
        addressLine: 'BTM 2nd Stage, Bengaluru',
        latitude: 12.9202558,
        longitude: 77.5599032,
      },
      {
        id: 'cust-mg-road',
        name: 'MG Road Traders',
        assignedSalesPersonId: 'sp-002',
        addressLine: 'Mahatma Gandhi Road, Bengaluru',
        latitude: 12.9751717,
        longitude: 77.6049964,
      },
    ],
  },
];

