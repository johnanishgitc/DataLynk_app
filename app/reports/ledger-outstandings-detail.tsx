import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import LedgerOutstandingsDetail from '../../src/components/reports/LedgerOutstandingsDetail';

export default function LedgerOutstandingsDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  // Parse the vouchers data from the route params
  const vouchers = params.vouchers ? JSON.parse(params.vouchers as string) : [];

  const handleBack = () => {
    router.back();
  };

  return (
    <LedgerOutstandingsDetail
      ledgerName={params.ledgerName as string || ''}
      refNo={params.refNo as string || ''}
      vouchers={vouchers}
      onBack={handleBack}
    />
  );
}
