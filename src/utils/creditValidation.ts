import { apiService } from '../services/api';

export interface CreditLimitInfo {
  CREDITLIMIT: number;
  CLOSINGBALANCE: number;
}

export interface OverdueBill {
  DATE: string;
  REFNO: string;
  OPENINGBALANCE: number;
  CLOSINGBALANCE: number;
  DUEON: string;
  OVERDUEDAYS: number;
}

export interface CreditDaysLimitResponse {
  ledgername: string;
  fromdate: string;
  todate: string;
  creditLimitInfo: CreditLimitInfo;
  overdueBills: OverdueBill[];
}

export interface CreditValidationResult {
  shouldPostAsOptional: boolean;
  reason?: string;
  creditLimitExceeded?: boolean;
  hasOverdueBills?: boolean;
  creditLimitInfo?: CreditLimitInfo;
  overdueBills?: OverdueBill[];
}

/**
 * Validates credit conditions for a customer order
 * @param tallylocId - Tally location ID
 * @param company - Company name
 * @param guid - Company GUID
 * @param ledgerName - Customer ledger name
 * @param orderValue - Total order value
 * @returns Promise<CreditValidationResult>
 */
export const validateCreditConditions = async (
  tallylocId: string,
  company: string,
  guid: string,
  ledgerName: string,
  orderValue: number
): Promise<CreditValidationResult> => {
  try {
    console.log('🔍 Validating credit conditions:', { ledgerName, orderValue });
    
    // Set a timeout for credit check (15 seconds max to allow for slower connections)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Credit check timeout after 15 seconds')), 15000);
    });
    
    const response = await Promise.race([
      apiService.getCreditDaysLimit(tallylocId, company, guid, ledgerName),
      timeoutPromise
    ]);
    
    if (!response.success || !response.data) {
      console.log('❌ Failed to fetch credit data:', response.error);
      return {
        shouldPostAsOptional: false,
        reason: 'Failed to fetch credit information'
      };
    }

    const creditData: CreditDaysLimitResponse = response.data;
    console.log('📊 Credit data received:', creditData);

    const { creditLimitInfo, overdueBills } = creditData;
    
    // Check if credit limit is set (non-zero)
    const creditLimit = Math.abs(creditLimitInfo.CREDITLIMIT); // Convert to positive
    const hasCreditLimit = creditLimit > 0;
    
    // Only check credit limit if it's set
    let creditLimitExceeded = false;
    if (hasCreditLimit) {
      const currentBalance = Math.abs(creditLimitInfo.CLOSINGBALANCE); // Convert to positive
      const availableCredit = creditLimit - currentBalance;
      creditLimitExceeded = orderValue > availableCredit;
      
      console.log('🔍 Credit limit analysis:', {
        currentBalance,
        creditLimit,
        availableCredit,
        orderValue,
        creditLimitExceeded
      });
    } else {
      console.log('ℹ️ Credit limit not set (0), skipping credit limit check');
    }
    
    const hasOverdueBills = overdueBills && overdueBills.length > 0;
    
    console.log('🔍 Credit analysis:', {
      hasCreditLimit,
      creditLimitExceeded,
      hasOverdueBills,
      overdueBillsCount: overdueBills?.length || 0
    });

    const shouldPostAsOptional = creditLimitExceeded || hasOverdueBills;
    
    let reason = '';
    if (creditLimitExceeded && hasOverdueBills) {
      reason = 'Order exceeds credit limit and customer has overdue bills';
    } else if (creditLimitExceeded) {
      reason = 'Order exceeds available credit limit';
    } else if (hasOverdueBills) {
      reason = 'Customer has overdue bills';
    }

    console.log('✅ Credit validation result:', {
      shouldPostAsOptional,
      reason,
      creditLimitExceeded,
      hasOverdueBills
    });

    return {
      shouldPostAsOptional,
      reason,
      creditLimitExceeded,
      hasOverdueBills,
      creditLimitInfo,
      overdueBills
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error validating credit conditions:', errorMessage);
    
    // If timeout or error, allow order to proceed as regular order (not optional)
    // Better to let the order through than block it due to slow credit check
    console.log('⚠️ Credit validation failed/timed out - allowing order as regular order');
    return {
      shouldPostAsOptional: false,
      reason: `Credit validation skipped: ${errorMessage}`
    };
  }
};

