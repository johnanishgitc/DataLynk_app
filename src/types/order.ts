// Types for the order entry system
export interface StockItem {
  id: string;
  name: string;
  availableQty: number;
  rate: number;
  igst?: number;
  closingStock?: number;
  priceLevels?: Array<{
    levelName: string;
    rate: number;
  }>;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  mobile: string;
  email: string;
  address: string;
  gstin: string;
  contact?: string;
  priceLevel?: string;
  // GST and Address related fields
  stateName?: string;
  country?: string;
  gstType?: string;
  mailingName?: string;
  pincode?: string;
}


export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  rate: number;
  discountPercent: number;
  taxPercent: number;
  value: number;
  availableQty: number;
  batch?: string;
  description?: string;
}

export interface OrderData {
  companyName: string;
  orderNumber: string;
  customerName: string;
  customerGSTIN: string;
  customerAddress: string;
  customerContact: string;
  customerPhone: string;
  customerMobile: string;
  customerEmail: string;
  customerPincode?: string;
  customerNarration?: string;
  customerPaymentTerms?: string;
  customerDeliveryTerms?: string;
  customerStateName?: string;
  customerCountry?: string;
  customerGSTType?: string;
  customerMailingName?: string;
  consigneeName?: string;
  consigneeAddress?: string;
  consigneeState?: string;
  consigneeCountry?: string;
  consigneePincode?: string;
  orderItems: OrderItem[];
  totalAmount: string;
  dueDate: string;
  voucherType: string;
  saveAsOptional?: boolean;
}


