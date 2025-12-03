import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { StandardHeader } from '../src/components/common';
import { voucherDataService } from '../src/services/voucherDataService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DrilldownParams {
  reservedName: string;
  vchType: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  company: string;
  guid: string;
  tallylocId: string;
}

const PAGE_SIZE = 50;

export default function VoucherDrilldownPage() {
  const params = useLocalSearchParams<Partial<DrilldownParams>>();

  const getParam = (val: any): string => {
    if (Array.isArray(val)) return (val[0] ?? '').toString();
    return (val ?? '').toString();
  };

  const reservedName = getParam(params.reservedName);
  const vchType = getParam(params.vchType);
  const startDate = getParam(params.startDate);
  const endDate = getParam(params.endDate);
  const company = getParam(params.company);
  const guid = getParam(params.guid);
  const tallylocIdStr = getParam(params.tallylocId);
  const tallylocId = tallylocIdStr ? parseInt(tallylocIdStr, 10) : NaN;

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<any[]>([]);
  const [groupedCards, setGroupedCards] = useState<any[]>([]);
  const [selectedCard, setSelectedCard] = useState<any | null>(null);
  const [summaryRows, setSummaryRows] = useState<any[]>([]); // kept but not shown
  const [typeSummary, setTypeSummary] = useState<any[]>([]);

  // Config state (persisted)
  type Periodicity = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  type AggLevel = 'party' | 'item' | 'group' | 'groupofgroup' | 'category';
  const [periodicity, setPeriodicity] = useState<Periodicity>('daily');
  const [aggregation, setAggregation] = useState<AggLevel>('item');
  const [scale, setScale] = useState<number>(1); // 1, 1e3, 1e5, 1e7
  const [filters, setFilters] = useState<{ party?: string; item?: string }>({});
  const [showConfig, setShowConfig] = useState(false);
  const [showDetails, setShowDetails] = useState<null | { periodKey: string; aggKey: string }>(null);

  const formatDdMmmYy = (yyyyMmDd: string): string => {
    if (!yyyyMmDd || yyyyMmDd.length < 10) return yyyyMmDd;
    const [y, m, d] = yyyyMmDd.split('-').map(Number);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dd = d.toString().padStart(2, '0');
    const mon = monthNames[(m - 1) as number];
    const yy = y.toString().slice(-2);
    return `${dd}-${mon}-${yy}`;
  };

  // Format period label like Mmm-YY for monthly, else pass through
  const formatPeriodLabel = (periodKey: string, p: string): string => {
    try {
      if (p === 'monthly') {
        const [y, m] = periodKey.split('-').map(x => parseInt(x, 10));
        const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][(m-1) as number];
        return `${mon}-${String(y).slice(-2)}`;
      }
      if (p === 'daily' && periodKey.length === 10) {
        return formatDdMmmYy(periodKey);
      }
      return periodKey;
    } catch { return periodKey; }
  };

  const loadPage = useCallback(async (pageIndex: number) => {
    if (!guid || !tallylocId || !startDate || !endDate || !reservedName || !vchType) {
      // Missing params; ensure we don't get stuck in loading state
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      await voucherDataService.initialize();
      const offset = pageIndex * PAGE_SIZE;
      console.log('🔎 Drilldown params:', {
        reservedName,
        vchType,
        startDate,
        endDate,
        guid,
        tallylocId,
        pageIndex,
        limit: PAGE_SIZE,
        offset
      });
      const { rows, total } = await voucherDataService.getVoucherItemsByTypePaginated(
        startDate,
        endDate,
        reservedName,
        vchType,
        guid,
        tallylocId,
        PAGE_SIZE,
        offset
      );
      console.log('📥 Drilldown result:', { total, rowsSample: rows.slice(0, 3) });
      setRows(rows);
      setTotal(total);

      // Group rows by voucher (mstid), then by ledger, with items nested under ledgers
      // Ensure each ledger belongs to its voucher and each item belongs to its ledger
      const cards: any[] = [];
      if (rows.length > 0) {
        const byVoucher = new Map<string, any>();
        
        for (const r of rows) {
          const vid = r.mstid;
          if (!vid) continue; // Skip rows without voucher ID
          
          // Initialize voucher if not exists
          if (!byVoucher.has(vid)) {
            byVoucher.set(vid, {
              mstid: vid,
              date: r.date,
              vchtype: r.vchtype || '',
              vchno: r.vchno || '',
              company,
              party: r.party || '',
              voucherAmtRaw: r.voucherAmt,
              ledgers: new Map<string, { ledger_id: string; ledger: string; isprty?: string | null; ledgerAmt: number; items: Array<{ item: string; qty: number; rate: number | null; amt: number }> }>()
            });
          }
          
          const voucher = byVoucher.get(vid)!;
          
          // Only process if we have a ledger_id (voucher with ledgers)
          if (r.ledger_id) {
            const lid = String(r.ledger_id);
            
            // Initialize ledger if not exists for this voucher
            if (!voucher.ledgers.has(lid)) {
              voucher.ledgers.set(lid, {
                ledger_id: lid,
                ledger: r.ledger || '',
                isprty: r.isprty,
                ledgerAmt: Number(r.ledgerAmt || 0),
                items: []
              });
            }
            
            const ledger = voucher.ledgers.get(lid)!;
            
            // Only add item if it exists and has content (not empty string)
            if (r.item && r.item.trim() !== '') {
              const qtyNum = Number(r.qty || 0);
              const amtNum = Number(r.amt || 0);
              const rate = qtyNum !== 0 ? (amtNum / qtyNum) : null;
              ledger.items.push({ 
                item: r.item.trim(), 
                qty: qtyNum, 
                rate, 
                amt: amtNum 
              });
            }
          }
          // If ledger_id is null, the voucher has no ledgers (which is fine - will show empty ledgers array)
        }
        
        // Convert Map to array and convert ledger Maps to arrays
        // Preserve order by sorting vouchers by date desc, then mstid
        for (const voucher of byVoucher.values()) {
          const ledgersArr = Array.from(voucher.ledgers.values());
          // Sort ledgers: party first, then with items (amt desc), then rest (amt desc)
          ledgersArr.sort((a: any, b: any) => {
            const aIsParty = (a.isprty === 'Yes') || (a.ledger && voucher.party && a.ledger.toLowerCase() === voucher.party.toLowerCase());
            const bIsParty = (b.isprty === 'Yes') || (b.ledger && voucher.party && b.ledger.toLowerCase() === voucher.party.toLowerCase());
            if (aIsParty !== bIsParty) return aIsParty ? -1 : 1;
            const aHasItems = (a.items?.length || 0) > 0;
            const bHasItems = (b.items?.length || 0) > 0;
            if (aHasItems !== bHasItems) return aHasItems ? -1 : 1;
            const aAmt = Number(a.ledgerAmt || 0);
            const bAmt = Number(b.ledgerAmt || 0);
            return bAmt - aAmt; // desc
          });

          // Parse voucher amount - should be a number from SQLite REAL
          let voucherAmtNumber = 0;
          const raw = voucher.voucherAmtRaw;
          
          if (typeof raw === 'number') {
            voucherAmtNumber = raw;
          } else if (typeof raw === 'string') {
            // Remove currency symbols and thousand separators
            const cleaned = raw.replace(/[^0-9.\-]/g, '');
            const n = parseFloat(cleaned);
            voucherAmtNumber = isNaN(n) ? 0 : n;
          }

          // Debug log for voucher amount
          if (voucher.mstid === '20391' || voucher.mstid === '19210') {
            console.log(`💰 Voucher ${voucher.mstid} amount:`, {
              raw,
              parsed: voucherAmtNumber,
              type: typeof raw,
              ledgersCount: ledgersArr.length,
              sumLedger: ledgersArr.reduce((acc: number, lg: any) => acc + (Number(lg.ledgerAmt || 0)), 0)
            });
          }

          // Fallback: if amount is 0 or very small, try to derive from ledgers
          // But only use fallback if the voucher amount is truly missing (0)
          if (voucherAmtNumber === 0) {
            const sumLedger = ledgersArr.reduce((acc: number, lg: any) => acc + Math.abs(Number(lg.ledgerAmt || 0)), 0);
            if (sumLedger > 0.5) {
              voucherAmtNumber = sumLedger;
            }
          }

          cards.push({
            mstid: voucher.mstid,
            date: voucher.date,
            vchtype: voucher.vchtype,
            vchno: voucher.vchno,
            company: voucher.company,
            party: voucher.party,
            voucherAmt: voucherAmtNumber,
            ledgers: ledgersArr
          });
        }
      }
      
      // Sort vouchers by date asc (properly parsing dates)
      cards.sort((a: any, b: any) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        
        // If dates are in ISO format (YYYY-MM-DD), string comparison works
        if (dateA.match(/^\d{4}-\d{2}-\d{2}$/) && dateB.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return dateA.localeCompare(dateB);
        }
        
        // Otherwise, try to parse as Date objects for comparison
        try {
          const parseDate = (d: string): Date | null => {
            // Try ISO format first
            if (d.match(/^\d{4}-\d{2}-\d{2}$/)) {
              return new Date(d);
            }
            // Try DD-Mmm-YY format
            const parts = d.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
            if (parts) {
              const [, day, month, year] = parts;
              const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
              const monthIdx = monthNames.findIndex(m => m.toLowerCase() === month.toLowerCase());
              if (monthIdx !== -1) {
                const fullYear = 2000 + parseInt(year, 10);
                return new Date(fullYear, monthIdx, parseInt(day, 10));
              }
            }
            return null;
          };
          
          const dA = parseDate(dateA);
          const dB = parseDate(dateB);
          
          if (dA && dB) {
            return dA.getTime() - dB.getTime();
          }
          
          // Fallback to string comparison
          return dateA.localeCompare(dateB);
        } catch {
          return dateA.localeCompare(dateB);
        }
      });

      setGroupedCards(cards);
    } catch (e) {
      console.error('Failed to load drilldown page:', e);
      setRows([]);
      setTotal(0);
      setGroupedCards([]);
    } finally {
      setLoading(false);
    }
  }, [guid, tallylocId, startDate, endDate, reservedName, vchType, company]);

  // Summary disabled for now for instant drilldown load
  const loadSummary = useCallback(async () => { setSummaryRows([]); }, []);

  const loadPeriodSummary = useCallback(async () => { /* disabled for now */ }, []);

  useEffect(() => {
    setPage(0);
    loadPage(0);
    // Load summary in background
    loadSummary();
    loadPeriodSummary();
    // Load type summary as fallback if no rows
    (async () => {
      try {
        if (guid && tallylocId && startDate && endDate) {
          const s = await voucherDataService.getVoucherTypeSummary(startDate, endDate, guid, tallylocId);
          setTypeSummary(s);
        }
      } catch (e) {
        setTypeSummary([]);
      }
    })();
  }, [loadPage, loadSummary, loadPeriodSummary]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StandardHeader
        title={`${reservedName} - ${vchType}`}
        onMenuPress={() => router.back()}
        showMenuButton={true}
        rightComponent={
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity style={{ padding: 8 }} onPress={() => setShowConfig(true)}>
              <Text style={{ fontSize: 18 }}>⚙️</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <View style={styles.metaBar}>
        <Text style={styles.metaText}>Period: {formatDdMmmYy(startDate)} to {formatDdMmmYy(endDate)}</Text>
        <Text style={styles.metaText}>Total: {total}</Text>
      </View>

      {/* Period summary disabled to ensure list-only drilldown */}

      {/* Summary disabled to prioritize instant details list */}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5D8277" />
        </View>
      ) : (
        <FlatList
          data={groupedCards}
          keyExtractor={(item, index) => `voucher-${item.mstid}-${index}`}
          contentContainerStyle={groupedCards.length === 0 ? styles.emptyContent : { paddingVertical: 12 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No vouchers found.</Text>}
          renderItem={({ item: card }) => (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={async () => {
                try {
                  await voucherDataService.debugCheckVoucherInventories(String(card.mstid), guid, tallylocId);
                } catch (e) {
                  console.warn('debugCheckVoucherInventories failed', e);
                }
                setSelectedCard(card);
              }}
            >
              <View style={styles.card}>
                <View>
                  <Text style={{ fontSize: 13, color: '#374151', fontWeight: '600' }}>{formatDdMmmYy(card.date)}</Text>
                  <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{card.vchtype}{card.vchno ? `  •  ${card.vchno}` : ''}</Text>
                  <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{card.party}</Text>
                  <Text style={{ fontSize: 16, color: '#111827', fontWeight: '700', textAlign: 'right', marginTop: 4 }}>₹{Number(card.voucherAmt || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Pagination */}
      <View style={styles.pager}>
        <TouchableOpacity
          style={[styles.pageButton, page <= 0 && styles.pageButtonDisabled]}
          disabled={page <= 0 || loading}
          onPress={() => { const p = Math.max(0, page - 1); setPage(p); loadPage(p); }}
        >
          <Text style={styles.pageButtonText}>Prev</Text>
        </TouchableOpacity>

        <Text style={styles.pageInfo}>{page + 1} / {totalPages}</Text>

        <TouchableOpacity
          style={[styles.pageButton, (page + 1) >= totalPages && styles.pageButtonDisabled]}
          disabled={(page + 1) >= totalPages || loading}
          onPress={() => { const p = Math.min(totalPages - 1, page + 1); setPage(p); loadPage(p); }}
        >
          <Text style={styles.pageButtonText}>Next</Text>
        </TouchableOpacity>
      </View>

      {/* Config modal (restored) */}
      <ConfigModal
        visible={showConfig}
        onClose={() => setShowConfig(false)}
        periodicity={periodicity}
        setPeriodicity={setPeriodicity}
        aggregation={aggregation}
        setAggregation={setAggregation}
        scale={scale}
        setScale={setScale}
        filters={filters}
        setFilters={setFilters}
        allRows={rows}
        onApply={() => { setShowConfig(false); loadPeriodSummary(); }}
      />

      {/* Details Modal */}
      {selectedCard && (
        <Modal transparent animationType="slide" visible={!!selectedCard} onRequestClose={() => setSelectedCard(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '600' }}>Details</Text>
                <TouchableOpacity onPress={() => setSelectedCard(null)}><Text style={{ fontSize: 18 }}>✖️</Text></TouchableOpacity>
              </View>

              <View style={{ marginTop: 8, marginBottom: 10 }}>
                <Text style={{ fontSize: 13, color: '#374151', fontWeight: '600' }}>{formatDdMmmYy(selectedCard.date)}  •  MstID: {selectedCard.mstid}</Text>
                <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{selectedCard.vchtype}{selectedCard.vchno ? `  •  ${selectedCard.vchno}` : ''}</Text>
                <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{selectedCard.company}</Text>
              </View>

              {selectedCard.ledgers.map((lg: any, idx: number) => (
                <View key={`${lg.ledger_id}-${idx}`} style={{ borderTopWidth: idx===0?0:1, borderTopColor: '#e5e7eb', paddingTop: idx===0?0:10, marginTop: idx===0?0:10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 13, color: '#374151', fontWeight: '600' }}>{lg.ledger || 'Ledger'}</Text>
                    <Text style={{ fontSize: 13, color: '#111827', fontWeight: '600' }}>₹{Number(lg.ledgerAmt || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
                  </View>
                  {lg.items.length > 0 && (
                    <View style={{ backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6 }}>
                      {lg.items.map((it: any, ix: number) => (
                        <View key={`${lg.ledger_id}-${it.item}-${ix}`} style={{ flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10, borderTopWidth: ix===0?0:1, borderTopColor: '#e5e7eb' }}>
                          <Text style={{ flex: 2, color: '#374151' }}>{it.item}</Text>
                          <Text style={{ flex: 1, textAlign: 'right', color: '#374151' }}>{it.qty}</Text>
                          <Text style={{ flex: 1, textAlign: 'right', color: '#374151' }}>{it.rate !== null ? it.rate.toFixed(2) : '-'}</Text>
                          <Text style={{ width: 100, textAlign: 'right', color: '#111827', fontWeight: '600' }}>₹{it.amt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  metaBar: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e9ecef' },
  metaText: { fontSize: 13, color: '#495057', textAlign: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row: { backgroundColor: '#fff', marginHorizontal: 12, marginVertical: 6, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e9ecef' },
  card: { backgroundColor: '#fff', marginHorizontal: 12, marginVertical: 12, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  cell: { marginBottom: 6 },
  label: { fontSize: 11, color: '#6c757d' },
  value: { fontSize: 13, color: '#374151' },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e9ecef' },
  pageButton: { backgroundColor: '#5D8277', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  pageButtonDisabled: { backgroundColor: '#cbd5e1' },
  pageButtonText: { color: '#fff', fontWeight: '600' },
  pageInfo: { marginHorizontal: 12, color: '#374151' },
  emptyContent: { padding: 40 },
  emptyText: { textAlign: 'center', color: '#6b7280' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
});

// Config Modal Component
const ConfigModal = ({ visible, onClose, periodicity, setPeriodicity, aggregation, setAggregation, scale, setScale, filters, setFilters, allRows, onApply }: any) => {
  const parties = useMemo(() => Array.from(new Set(allRows.map((r: any) => r.party))).sort(), [allRows]);
  const items = useMemo(() => Array.from(new Set(allRows.map((r: any) => r.item))).sort(), [allRows]);
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '600' }}>Configure</Text>
            <TouchableOpacity onPress={onClose}><Text style={{ fontSize: 18 }}>✖️</Text></TouchableOpacity>
          </View>
          <View style={{ marginTop: 12 }}>
            <Text>Periodicity</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
              {(['daily','weekly','monthly','quarterly','yearly'] as const).map(p => (
                <TouchableOpacity key={p} style={{ paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: periodicity===p?'#5D8277':'#e5e7eb', borderRadius: 6, marginRight: 8, marginBottom: 8, backgroundColor: periodicity===p?'#5D8277':'#fff' }} onPress={() => setPeriodicity(p)}>
                  <Text style={{ color: periodicity===p?'#fff':'#374151' }}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={{ marginTop: 12 }}>
            <Text>Aggregation Level</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
              {(['party','item','group','groupofgroup','category'] as const).map(a => (
                <TouchableOpacity key={a} style={{ paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: aggregation===a?'#5D8277':'#e5e7eb', borderRadius: 6, marginRight: 8, marginBottom: 8, backgroundColor: aggregation===a?'#5D8277':'#fff' }} onPress={() => setAggregation(a)}>
                  <Text style={{ color: aggregation===a?'#fff':'#374151' }}>{a}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={{ marginTop: 12 }}>
            <Text>Scale</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
              {[{label:'1',v:1},{label:'Thousands',v:1000},{label:'Lakhs',v:100000},{label:'Crores',v:10000000}].map(s => (
                <TouchableOpacity key={s.v} style={{ paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: scale===s.v?'#5D8277':'#e5e7eb', borderRadius: 6, marginRight: 8, marginBottom: 8, backgroundColor: scale===s.v?'#5D8277':'#fff' }} onPress={() => setScale(s.v)}>
                  <Text style={{ color: scale===s.v?'#fff':'#374151' }}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={{ marginTop: 12 }}>
            <Text>Filters</Text>
            <View style={{ flexDirection: 'row', marginTop: 6, justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>Party</Text>
                <FlatList horizontal data={parties} keyExtractor={(x)=>x} renderItem={({item}) => (
                  <TouchableOpacity onPress={()=> setFilters((prev: any)=>({...prev, party: prev.party===item? undefined : item}))} style={{ paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: filters.party===item?'#5D8277':'#e5e7eb', borderRadius: 6, marginRight: 8, backgroundColor: filters.party===item?'#5D8277':'#fff' }}>
                    <Text style={{ color: filters.party===item?'#fff':'#374151' }}>{item}</Text>
                  </TouchableOpacity>
                )} />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>Item</Text>
                <FlatList horizontal data={items} keyExtractor={(x)=>x} renderItem={({item}) => (
                  <TouchableOpacity onPress={()=> setFilters((prev: any)=>({...prev, item: prev.item===item? undefined : item}))} style={{ paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: filters.item===item?'#5D8277':'#e5e7eb', borderRadius: 6, marginRight: 8, backgroundColor: filters.item===item?'#5D8277':'#fff' }}>
                    <Text style={{ color: filters.item===item?'#fff':'#374151' }}>{item}</Text>
                  </TouchableOpacity>
                )} />
              </View>
            </View>
          </View>
          <View style={{ marginTop: 16, flexDirection: 'row', justifyContent: 'flex-end' }}>
            <TouchableOpacity onPress={onClose} style={{ paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, marginRight: 10 }}>
              <Text>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onApply} style={{ paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#5D8277', borderRadius: 6 }}>
              <Text style={{ color: '#fff' }}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Summary Table Component
const SummaryTable = ({ rows, scale, onViewDetails }: any) => {
  const scaleAmt = (n: number) => (n/scale);

  return (
    <View style={{ backgroundColor: '#fff', margin: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' }}>
      <View style={{ flexDirection: 'row', paddingVertical: 10, backgroundColor: '#5D8277' }}>
        <Text style={{ flex: 1, color: '#fff', textAlign: 'center' }}>Period</Text>
        <Text style={{ flex: 1, color: '#fff', textAlign: 'center' }}>Key</Text>
        <Text style={{ width: 80, color: '#fff', textAlign: 'center' }}>Qty</Text>
        <Text style={{ width: 120, color: '#fff', textAlign: 'center' }}>Value</Text>
        <Text style={{ width: 120, color: '#fff', textAlign: 'center' }}>Avg Rate</Text>
        <Text style={{ width: 110, color: '#fff', textAlign: 'center' }}>Details</Text>
      </View>
      {rows.map((row: any, idx: number) => (
        <View key={`${row.period}-${row.key}-${idx}`} style={{ flexDirection: 'row', paddingVertical: 8, borderTopWidth: idx===0?0:1, borderTopColor: '#e5e7eb', alignItems: 'center' }}>
          <Text style={{ flex: 1, textAlign: 'center' }}>{row.period}</Text>
          <Text style={{ flex: 1, textAlign: 'center' }}>{row.key}</Text>
          <Text style={{ width: 80, textAlign: 'right', paddingRight: 8 }}>{row.qty}</Text>
          <Text style={{ width: 120, textAlign: 'right', paddingRight: 8 }}>₹{scaleAmt(row.amt).toLocaleString('en-IN',{maximumFractionDigits:2})}</Text>
          <Text style={{ width: 120, textAlign: 'right', paddingRight: 8 }}>{row.avg.toFixed(2)}</Text>
          <View style={{ width: 110, alignItems: 'center' }}>
            <TouchableOpacity onPress={() => onViewDetails(row.period, row.key)} style={{ backgroundColor: '#5D8277', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }}>
              <Text style={{ color: '#fff' }}>View details</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
};


