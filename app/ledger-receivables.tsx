import React from 'react';
import { useUser } from '../src/context/UserContext';
import { LedgerReceivablesReport } from '../src/components/reports';

export default function LedgerReceivablesPage() {
  const { selectedCompany } = useUser();

  // Show loading if no company is selected
  if (!selectedCompany) {
    return null;
  }

  return (
    <LedgerReceivablesReport 
      companyName={selectedCompany.company}
      tallylocId={selectedCompany.tallyloc_id.toString()}
      guid={selectedCompany.GUID}
    />
  );
}

