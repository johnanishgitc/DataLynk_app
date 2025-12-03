// Tally XML Request Templates
// This file contains all XML request templates used for communicating with Tally

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
  customerPaymentTerms?: string;
  customerDeliveryTerms?: string;
  customerNarration?: string;
  // GST and Address related fields
  customerStateName?: string;
  customerCountry?: string;
  customerGSTType?: string;
  customerMailingName?: string;
  // Consignee fields
  consigneeName?: string;
  consigneeAddress?: string;
  consigneeState?: string;
  consigneeCountry?: string;
  consigneePincode?: string;
  orderItems: Array<{
    name: string;
    quantity: number;
    rate: number;
    discountPercent: number;
    taxPercent: number;
    value: number;
    batch?: string;
    description?: string;
  }>;
  totalAmount: string;
  dueDate: string;
  voucherType: string;
  saveAsOptional?: boolean;
}

// Helper function to escape XML special characters
export const escapeXmlValue = (value: string): string => {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

// Helper function to generate order number in YYMMDDHHMMSS format using India timezone
export const generateOrderNumber = (): string => {
  try {
    // Get current time in India timezone (IST - UTC+5:30)
    const now = new Date();
    
    // Convert to India timezone using a more reliable method
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const indiaTime = new Date(utc + (5.5 * 3600000)); // IST is UTC+5:30
    
    const year = indiaTime.getFullYear().toString().slice(-2); // YY
    const month = (indiaTime.getMonth() + 1).toString().padStart(2, '0'); // MM
    const day = indiaTime.getDate().toString().padStart(2, '0'); // DD
    const hours = indiaTime.getHours().toString().padStart(2, '0'); // HH
    const minutes = indiaTime.getMinutes().toString().padStart(2, '0'); // MM
    const seconds = indiaTime.getSeconds().toString().padStart(2, '0'); // SS
    
    const orderNumber = `${year}${month}${day}${hours}${minutes}${seconds}`;
    
    // Validate the generated order number
    if (orderNumber.includes('NaN') || orderNumber.length !== 12) {
      throw new Error('Invalid order number generated');
    }
    
    return orderNumber;
  } catch (error) {
    // Fallback to timestamp-based order number if timezone conversion fails
    console.error('Error generating order number with timezone conversion:', error);
    const fallbackTime = new Date();
    const timestamp = fallbackTime.getTime().toString().slice(-12);
    return timestamp.padStart(12, '0');
  }
};

// Helper function to generate order number with prefix and suffix
export const generateOrderNumberWithPrefixSuffix = (prefix: string = '', suffix: string = ''): string => {
  const baseOrderNumber = generateOrderNumber();
  return `${prefix}${baseOrderNumber}${suffix}`;
};

// Helper function to split text into 20-character chunks for delivery terms
export const splitIntoChunks = (text: string, chunkSize: number = 20): string[] => {
  if (!text) return [];
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
};

// XML Request for getting Items from Tally (Standard)
export const getItemsXmlRequest = (company: string): string => {
  const escapedCompany = escapeXmlValue(company);
  
  return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>ODBC Report</REPORTNAME>
        <SQLREQUEST TYPE="General" METHOD="SQLExecute">select $Name as StockItem, $$Number:$ClosingBalance as Qty, $StandardPriceList[-1].Rate as Rate from stockitem</SQLREQUEST>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          <SVCURRENTCOMPANY>${escapedCompany}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;
};

// XML Request for getting Items from Tally with Price Levels
export const getItemsWithPriceLevelsXmlRequest = (company: string): string => {
  const escapedCompany = escapeXmlValue(company);
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD format
  
  return `<ENVELOPE>
    <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>Export</TALLYREQUEST>
        <TYPE>Data</TYPE>
        <ID>CP_Stockitem</ID>
    </HEADER>
    <BODY>
        <DESC>
            <STATICVARIABLES>
                <EXPORTFLAG>YES</EXPORTFLAG>
                <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                <SVCURRENTCOMPANY>${escapedCompany}</SVCURRENTCOMPANY>
                <VARVchDate>${today}</VARVchDate>
            </STATICVARIABLES>
            <TDL>
                <TDLMESSAGE>
                    <REPORT NAME="CP_Stockitem">
                        <FORMS>CP_Stockitem</FORMS>
                    </REPORT>
                    <FORM NAME="CP_Stockitem">
                        <TOPPARTS>CP_Stockitem</TOPPARTS>
                    </FORM>
                    <PART NAME="CP_Stockitem">
                        <TOPLINES>CP_Stockitem</TOPLINES>
                        <REPEAT>CP_Stockitem : CP_Stockitem Coll</REPEAT>
                        <SCROLLED>Vertical</SCROLLED>
                    </PART>
                    <PART NAME="CP_StockitemPL">
                        <TOPLINES>CP_StockitemPL</TOPLINES>
                        <REPEAT>CP_StockitemPL : PriceLevels</REPEAT>
                        <SCROLLED>Vertical</SCROLLED>
                    </PART>
                    <LINE NAME="CP_Stockitem">
                        <LEFTFIELDS>CP_Temp1, CP_Temp2, CP_Temp3, CP_Temp4, CP_Temp5</LEFTFIELDS>
                        <LEFTFIELDS>CP_Temp6, CP_Temp7, CP_Temp8</LEFTFIELDS>
                        <LOCAL>Field : CP_Temp1  : Set as : $NAME</LOCAL>
                        <LOCAL>Field : CP_Temp2  : Set as : $PARTNO</LOCAL>
                        <LOCAL>Field : CP_Temp3  : Set as : $BASEUNITS</LOCAL>
                        <LOCAL>Field : CP_Temp4 : Set as : $GSTHSNCode</LOCAL>
                        <LOCAL>Field : CP_Temp5 : Set as : $GSTIGSTRate</LOCAL>
                        <LOCAL>Field : CP_Temp6 : Set as : $$Number:$StandardPrice</LOCAL>
                        <LOCAL>Field : CP_Temp7 : Set as : $$Number:$LastSalePrice</LOCAL>
                        <LOCAL>Field : CP_Temp8 : Set as : $$FromValue:"":$$ToValue:##VARVchDate:$$Number:$CLOSINGBALANCE</LOCAL>
                        <LOCAL>Field : CP_Temp1  : Xml Tag : "NAME"</LOCAL>
                        <LOCAL>Field : CP_Temp2  : Xml Tag : "PARTNO"</LOCAL>
                        <LOCAL>Field : CP_Temp3  : Xml Tag : "BASEUNITS"</LOCAL>
                        <LOCAL>Field : CP_Temp4 : Xml Tag : "HSNCODE"</LOCAL>
                        <LOCAL>Field : CP_Temp5  : Xml Tag : "IGST"</LOCAL>
                        <LOCAL>Field : CP_Temp6  : Xml Tag : "STDPRICE"</LOCAL>
                        <LOCAL>Field : CP_Temp7 : Xml Tag : "LASTPRICE"</LOCAL>
                        <LOCAL>Field : CP_Temp8 : Xml Tag : "CLOSINGSTOCK"</LOCAL>
                        <EXPLODE>CP_StockitemPL : $$NumItems:PriceLevels > 0</EXPLODE>
                        <XMLTAG>"stockitem"</XMLTAG>
                    </LINE>
                    <LINE NAME="CP_StockitemPL">
                        <LEFTFIELDS>CP_Temp9, CP_Temp10</LEFTFIELDS>
                        <LOCAL>Field : CP_Temp9  : Set as : $PriceLevel</LOCAL>
                        <LOCAL>Field : CP_Temp9  : XMLTag : "PLNAME"</LOCAL>
                        <LOCAL>Field : CP_Temp10  : Set as : $$Number:$$GetPriceFromLevel:#CP_Temp1:$PriceLevel:##VARVchDate:1</LOCAL>
                        <LOCAL>Field : CP_Temp10  : XMLTag : "RATE"</LOCAL>
                        <REMOVEON>$$Number:#CP_Temp10 = 0</REMOVEON>
                        <XMLTAG>"pricelevels"</XMLTAG>
                    </LINE>
                    <FIELD NAME="CP_Temp1"></FIELD>
                    <FIELD NAME="CP_Temp2"></FIELD>
                    <FIELD NAME="CP_Temp3"></FIELD>
                    <FIELD NAME="CP_Temp4"></FIELD>
                    <FIELD NAME="CP_Temp5"></FIELD>
                    <FIELD NAME="CP_Temp6"></FIELD>
                    <FIELD NAME="CP_Temp7"></FIELD>
                    <FIELD NAME="CP_Temp8"></FIELD>
                    <FIELD NAME="CP_Temp9"></FIELD>
                    <FIELD NAME="CP_Temp10"></FIELD>
                    <COLLECTION NAME="CP_Stockitem Coll">
                        <TYPE>STOCKITEM</TYPE>
                        <FILTERS>CP_RemvEmptyUOM</FILTERS>
                    </COLLECTION>
                    <SYSTEM TYPE="Formulae" NAME="CP_RemvEmptyUOM">NOT $$IsSysName:$BASEUNITS</SYSTEM>
                </TDLMESSAGE>
            </TDL>
        </DESC>
    </BODY>
</ENVELOPE>`;
};

// XML Request for getting Customers from Tally
export const getCustomersXmlRequest = (company: string): string => {
  const escapedCompany = escapeXmlValue(company);
  
  return `<ENVELOPE>
	<HEADER>
		<VERSION>1</VERSION>
		<TALLYREQUEST>Export</TALLYREQUEST>
		<TYPE>Data</TYPE>
		<ID>ODBC Report</ID>
	</HEADER>
	<BODY>
		<DESC>
			<TDL>
				<TDLMESSAGE>
					<COLLECTION NAME="CP_LedgersColl">
						<COLLECTIONS>CP_LedgersDrsColl, CP_LedgersCrsColl, CP_LedgersBrnchColl</COLLECTIONS>
						<SORT>Default : $NAME</SORT>
					</COLLECTION>
					<COLLECTION NAME="CP_LedgersDrsColl" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No">
						<TYPE>LEDGER</TYPE>
						<CHILDOF>$$GroupSundryDebtors</CHILDOF>
						<BELONGSTO>Yes</BELONGSTO>
					</COLLECTION>
					<COLLECTION NAME="CP_LedgersCrsColl" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No">
						<TYPE>LEDGER</TYPE>
						<CHILDOF>$$GroupSundryCreditors</CHILDOF>
						<BELONGSTO>Yes</BELONGSTO>
					</COLLECTION>
					<COLLECTION NAME="CP_LedgersBrnchColl" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No">
						<TYPE>LEDGER</TYPE>
						<CHILDOF>$$GroupBranches</CHILDOF>
						<BELONGSTO>Yes</BELONGSTO>
					</COLLECTION>
					<SYSTEM TYPE="Formulae" NAME="CP_tallyRel3_0" ISMODIFY="No" ISFIXED="No" ISINTERNAL="No">(@@LatestRelasStr Starting With &quot;TallyPrime&quot; OR @@LatestRelasStr Starting With &quot;Tally Prime&quot;) AND $$Number:$$ProdInfo:ProdReleaseAsStr &gt;= $$Number:3   </SYSTEM>
					<SYSTEM TYPE="Formulae" NAME="CP_isSameMailid" ISMODIFY="No" ISFIXED="No" ISINTERNAL="No">$EMAIL Contains &quot;praveen@itcatalystindia.com&quot; OR $EMAILCC Contains &quot;praveen@itcatalystindia.com&quot;   </SYSTEM>
					<SYSTEM TYPE="Formulae" NAME="CP_gstinno" ISMODIFY="No" ISFIXED="No" ISINTERNAL="No">IF @@CP_tallyRel3_0 THEN $LEDGSTREGDETAILS[-1].GSTIN ELSE $PARTYGSTIN </SYSTEM>
					<SYSTEM TYPE="Formulae" NAME="CP_gstregtype" ISMODIFY="No" ISFIXED="No" ISINTERNAL="No">IF @@CP_tallyRel3_0 THEN $LEDGSTREGDETAILS[-1].GSTREGISTRATIONTYPE ELSE $GSTREGISTRATIONTYPE </SYSTEM>
				</TDLMESSAGE>
			</TDL>
			<SQLREQUEST TYPE="Prepare" METHOD="SQLPrepare">SELECT $NAME as CustomerName, $MAILINGNAME as CustomerMailName, $LEDGERCONTACT as Contact, $LedgerPhone as Phone, $LedgerMobile as Mobile, $$FullListEX:'|':ADDRESS:$ADDRESS as ADDRESS, $PINCODE as Pincode, $LEDSTATENAME as State, $COUNTRYOFRESIDENCE as Country, $EMAIL as Email, $EMAILCC as EmailCC, $PRICELEVEL as PriceLevel, @@CP_gstinno as GSTINNO, @@CP_gstregtype as GSTREGTYPE from CP_LedgersColl</SQLREQUEST>
			<STATICVARIABLES>
				<EXPLODEFLAG>Yes</EXPLODEFLAG>
				<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
				<SVCURRENTCOMPANY>${escapedCompany}</SVCURRENTCOMPANY>
			</STATICVARIABLES>
		</DESC>
	</BODY>
</ENVELOPE>`;
};

// XML Request for creating Orders in Tally
export const createOrderXmlRequest = (orderData: OrderData, showCustomerAddresses: boolean = true): string => {
  // Format date as DD-MM-YYYY for Tally
  const today = new Date();
  const day = today.getDate().toString().padStart(2, '0');
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const year = today.getFullYear();
  const formattedDate = `${day}-${month}-${year}`;
  
  // Generate XML for order creation
  
  // Create inventory entries XML
  const inventoryEntries = orderData.orderItems.map(item => `
    <ALLINVENTORYENTRIES.LIST>
      <STOCKITEMNAME>${escapeXmlValue(item.name)}</STOCKITEMNAME>
      <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
      <RATE>${item.rate}</RATE>
      <AMOUNT>${item.value.toFixed(2)}</AMOUNT>
      <ACTUALQTY>${item.quantity}</ACTUALQTY>
      <BILLEDQTY>${item.quantity}</BILLEDQTY>
      ${item.discountPercent > 0 ? `<DISCOUNT>${item.discountPercent}</DISCOUNT>` : ''}
      ${item.taxPercent > 0 ? `<TAXPERCENT>${item.taxPercent}</TAXPERCENT>` : ''}
      <BATCHALLOCATIONS.LIST>
        <BATCHNAME>${item.batch && item.batch.trim() ? escapeXmlValue(item.batch) : 'Primary Batch'}</BATCHNAME>
        <ORDERNO>${escapeXmlValue(orderData.orderNumber)}</ORDERNO>
        <ACTUALQTY>${item.quantity}</ACTUALQTY>
        <BILLEDQTY>${item.quantity}</BILLEDQTY>
        <AMOUNT>${item.value.toFixed(2)}</AMOUNT>
        <ORDERDUEDATE>${orderData.dueDate}</ORDERDUEDATE>
      </BATCHALLOCATIONS.LIST>
      ${item.description && item.description.trim() ? `
      <BASICUSERDESCRIPTION.LIST TYPE="String">
        ${item.description.split('\n').filter((line: string) => line.trim()).map((line: string) =>
          `<BASICUSERDESCRIPTION>${escapeXmlValue(line.trim())}</BASICUSERDESCRIPTION>`
        ).join('\n        ')}
      </BASICUSERDESCRIPTION.LIST>` : ''}
    </ALLINVENTORYENTRIES.LIST>
  `).join('');

  const xmlContent = `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXmlValue(orderData.companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER>
            <DATE>${formattedDate}</DATE>
            <VOUCHERTYPENAME>${escapeXmlValue(orderData.voucherType)}</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${escapeXmlValue(orderData.orderNumber)}</VOUCHERNUMBER>
            <PARTYNAME>${escapeXmlValue(orderData.customerName)}</PARTYNAME>
            <PARTYLEDGERNAME>${escapeXmlValue(orderData.customerName)}</PARTYLEDGERNAME>
            <ISOPTIONAL>${orderData.saveAsOptional ? 'Yes' : 'No'}</ISOPTIONAL>
            <REFERENCE>${escapeXmlValue(orderData.orderNumber)}</REFERENCE>
            <BASICORDERREF></BASICORDERREF>
            <PARTYGSTIN>${escapeXmlValue(orderData.customerGSTIN)}</PARTYGSTIN>
            <EFFECTIVEDATE>${formattedDate}</EFFECTIVEDATE>
            <BASICDUEDATEOFPYMT>${escapeXmlValue(orderData.customerPaymentTerms || '')}</BASICDUEDATEOFPYMT>
            <NARRATION>${escapeXmlValue(orderData.customerNarration || '')}</NARRATION>
            <STATENAME>${escapeXmlValue(showCustomerAddresses ? (orderData.customerStateName || '') : (orderData.customerStateName || ''))}</STATENAME>
            <COUNTRYOFRESIDENCE>${escapeXmlValue(showCustomerAddresses ? (orderData.customerCountry || '') : (orderData.customerCountry || ''))}</COUNTRYOFRESIDENCE>
            <PLACEOFSUPPLY>${escapeXmlValue(showCustomerAddresses ? (orderData.customerStateName || '') : (orderData.customerStateName || ''))}</PLACEOFSUPPLY>
            <GSTREGISTRATIONTYPE>${escapeXmlValue(showCustomerAddresses ? (orderData.customerGSTType || '') : (orderData.customerGSTType || ''))}</GSTREGISTRATIONTYPE>
            <CONSIGNEEGSTIN>${escapeXmlValue(orderData.customerGSTIN)}</CONSIGNEEGSTIN>
            <CONSIGNEEMAILINGNAME>${escapeXmlValue(orderData.consigneeName || (showCustomerAddresses ? (orderData.customerMailingName || orderData.customerName) : (orderData.customerMailingName || orderData.customerName)))}</CONSIGNEEMAILINGNAME>
            <CONSIGNEESTATENAME>${escapeXmlValue(orderData.consigneeState || (showCustomerAddresses ? (orderData.customerStateName || '') : (orderData.customerStateName || '')))}</CONSIGNEESTATENAME>
            <CONSIGNEECOUNTRYNAME>${escapeXmlValue(orderData.consigneeCountry || (showCustomerAddresses ? (orderData.customerCountry || '') : (orderData.customerCountry || '')))}</CONSIGNEECOUNTRYNAME>
            <BASICBASEPARTYNAME>${escapeXmlValue(showCustomerAddresses ? (orderData.customerMailingName || orderData.customerName) : (orderData.customerMailingName || orderData.customerName))}</BASICBASEPARTYNAME>
            <PARTYPINCODE>${escapeXmlValue(orderData.customerPincode || '')}</PARTYPINCODE>
            <CONSIGNEEPINCODE>${escapeXmlValue(orderData.consigneePincode || orderData.customerPincode || '')}</CONSIGNEEPINCODE>
            <ADDRESS.LIST TYPE="String">
              ${(orderData.customerAddress || '')
                .split(/\r?\n/)
                .filter(line => line.trim() !== '')
                .map(line => `<ADDRESS>${escapeXmlValue(line.trim())}</ADDRESS>`)
                .join('\n              ')}
              ${orderData.customerContact ? `<ADDRESS>${escapeXmlValue(orderData.customerContact)}</ADDRESS>` : ''}
              ${orderData.customerPhone ? `<ADDRESS>${escapeXmlValue(orderData.customerPhone)}</ADDRESS>` : ''}
              ${orderData.customerMobile ? `<ADDRESS>${escapeXmlValue(orderData.customerMobile)}</ADDRESS>` : ''}
              ${orderData.customerEmail ? `<ADDRESS>${escapeXmlValue(orderData.customerEmail)}</ADDRESS>` : ''}
            </ADDRESS.LIST>
            <BASICBUYERADDRESS.LIST TYPE="String">
              ${((orderData.consigneeAddress || orderData.customerAddress) || '')
                .split(/\r?\n/)
                .map(line => {
                  let cleanedLine = line.trim();
                  if (!cleanedLine) return '';
                  // Remove state and country values from address lines (case-insensitive)
                  const stateValue = (orderData.consigneeState || orderData.customerStateName || '').trim();
                  const countryValue = (orderData.consigneeCountry || orderData.customerCountry || '').trim();
                  
                  if (stateValue) {
                    // Remove state value, handling commas and spaces
                    const stateRegex = new RegExp(`\\s*${stateValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*,?\\s*`, 'gi');
                    cleanedLine = cleanedLine.replace(stateRegex, '');
                  }
                  
                  if (countryValue) {
                    // Remove country value, handling commas and spaces
                    const countryRegex = new RegExp(`\\s*,?\\s*${countryValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'gi');
                    cleanedLine = cleanedLine.replace(countryRegex, '');
                  }
                  
                  return cleanedLine.trim();
                })
                .filter(line => line.length > 0)
                .map(line => `<BASICBUYERADDRESS>${escapeXmlValue(line)}</BASICBUYERADDRESS>`)
                .join('\n              ')}
              ${orderData.customerContact ? `<BASICBUYERADDRESS>${escapeXmlValue(orderData.customerContact)}</BASICBUYERADDRESS>` : ''}
              ${orderData.customerPhone ? `<BASICBUYERADDRESS>${escapeXmlValue(orderData.customerPhone)}</BASICBUYERADDRESS>` : ''}
              ${orderData.customerMobile ? `<BASICBUYERADDRESS>${escapeXmlValue(orderData.customerMobile)}</BASICBUYERADDRESS>` : ''}
              ${orderData.customerEmail ? `<BASICBUYERADDRESS>${escapeXmlValue(orderData.customerEmail)}</BASICBUYERADDRESS>` : ''}
            </BASICBUYERADDRESS.LIST>
            ${orderData.customerDeliveryTerms ? `
            <BASICORDERTERMS.LIST TYPE="String">
              ${splitIntoChunks(orderData.customerDeliveryTerms, 20).map(chunk => 
                `<BASICORDERTERMS>${escapeXmlValue(chunk)}</BASICORDERTERMS>`
              ).join('\n              ')}
            </BASICORDERTERMS.LIST>` : ''}
            ${inventoryEntries}
            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXmlValue(orderData.customerName)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${orderData.totalAmount}</AMOUNT>
            </LEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

  // Log the XML being sent to Tally
  console.log('=== TALLY XML REQUEST ===');
  console.log('Order Data:', JSON.stringify(orderData, null, 2));
  console.log('Show Customer Addresses:', showCustomerAddresses);
  console.log('Customer GST/Address Data:');
  console.log('- State Name:', orderData.customerStateName);
  console.log('- Country:', orderData.customerCountry);
  console.log('- GST Type:', orderData.customerGSTType);
  console.log('- Mailing Name:', orderData.customerMailingName);
  console.log('- Pincode:', orderData.customerPincode);
  console.log('Generated XML:');
  console.log(xmlContent);
  console.log('=== END TALLY XML REQUEST ===');

  return xmlContent;
};

// XML Request for getting Order List from Tally with Item Details
export const getOrderListXmlRequest = (company: string, startDate?: Date, endDate?: Date): string => {
  const escapedCompany = escapeXmlValue(company);
  
  // Use provided dates or default to current month start to today
  const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = endDate || new Date();
  
  // Format dates as YYYYMMDD (Tally format)
  const fromDate = start.getFullYear().toString() + 
                   (start.getMonth() + 1).toString().padStart(2, '0') + 
                   start.getDate().toString().padStart(2, '0');
  
  const toDate = end.getFullYear().toString() + 
                 (end.getMonth() + 1).toString().padStart(2, '0') + 
                 end.getDate().toString().padStart(2, '0');
  
  return `<ENVELOPE>
        <HEADER>
                <VERSION>1</VERSION>
                <TALLYREQUEST>Export</TALLYREQUEST>
                <TYPE>Data</TYPE>
                <ID>ODBC Report</ID>
        </HEADER>
        <BODY>
                <DESC>
                        <TDL>
                                <TDLMESSAGE>
                                   <COLLECTION NAME="ITC_OL Coll" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No">
                                        <Type>Vouchers : VoucherType</Type>
                                        <ChildOf>$$VchTypeSalesOrder</ChildOf>
                                        <NativeMethod>*.*</NativeMethod>
                                        <NativeMethod>MasterID</NativeMethod>
                                        <NativeMethod>Date</NativeMethod>
                                        <NativeMethod>Reference</NativeMethod>
                                        <NativeMethod>PartyLedgerName</NativeMethod>
                                        <Method>Amount : $AllLedgerEntries[1].Amount</Method>
                                   </COLLECTION>
                                </TDLMESSAGE>
                        </TDL>
                        <SQLREQUEST TYPE="Prepare" METHOD="SQLPrepare">select $MasterID as MasterID, $Date as Date, $Reference as OrderNo, $PartyLedgerName as Customer, $StockItemName as ItemName, $$Number:$ActualQty as Qty, $$Number:$Rate as Rate, $Amount from ITC_OLColl</SQLREQUEST>
                        <STATICVARIABLES>
                                <EXPLODEFLAG>Yes</EXPLODEFLAG>
                                <SVCURRENTCOMPANY>${escapedCompany}</SVCURRENTCOMPANY>
                                <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                                <SVFROMDATE>${fromDate}</SVFROMDATE>
                                <SVTODATE>${toDate}</SVTODATE>
                        </STATICVARIABLES>
                </DESC>
        </BODY>
</ENVELOPE>`;
};

// XML Request for getting specific Order Details from Tally
export const getOrderDetailsXmlRequest = (customerName: string, orderNo: string, company: string): string => {
  const escapedCustomerName = escapeXmlValue(customerName);
  const escapedOrderNo = escapeXmlValue(orderNo);
  const escapedCompany = escapeXmlValue(company);
  
  return `<ENVELOPE>
	<HEADER>
		<VERSION>1</VERSION>
		<TALLYREQUEST>Export</TALLYREQUEST>
		<TYPE>Data</TYPE>
		<ID>ODBC Report</ID>
	</HEADER>
	<BODY>
		<DESC>		
			<STATICVARIABLES>
				<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVCURRENTCOMPANY>${escapedCompany}</SVCURRENTCOMPANY>
			</STATICVARIABLES>	
			<TDL>  <TDLMESSAGE>
			   <REPORT NAME="ODBC Report" ISMODIFY="Yes" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No">
				<Add>Variable : LedgerName, StockItemName, ITCOrderName</Add>
				<Set>LedgerName : "${escapedCustomerName}"</Set>
				<Set>StockItemName : ""</Set>
				<Set>ITCOrderName : "${escapedOrderNo}"</Set>	
			   </REPORT>
			   <COLLECTION NAME="ITCAllOrders" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No">
				<Collections>ITCSaleCldOrderOfCompany, ITCSalePosOrderOfCompany Src</Collections>
			   </COLLECTION>
			   <COLLECTION NAME="ITCSaleCldOrderOfCompany" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No">
				<Use>ITCSalePosOrderOfCompany Src</Use>
				<Cleared>Yes</Cleared>
			   </COLLECTION>
			   <COLLECTION NAME="ITCSalePosOrderOfCompany Src" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No">
				<Type>Sales Orders</Type>
				<Filters>OrderOfLedgerName</Filters>
			   </COLLECTION>
			   <VARIABLE NAME="ITCOrderName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No">
				<Type>String</Type>
			   </VARIABLE>
			   <SYSTEM TYPE="Formulae" NAME="ITCOrderofOrderName" ISMODIFY="No" ISFIXED="No" ISINTERNAL="No">If $$IsEmpty:##ITCOrderName Then Yes Else $Name = ##ITCOrderName   </SYSTEM>
			</TDLMESSAGE>
			</TDL>
			<SQLREQUEST TYPE="Prepare" METHOD="SQLPrepare">select $Name as OrderNo, $Date as Date, $Parent as StockItem, $TrackLedger as Customer, $$Number:$OrderOpeningBalance as OrderQty, $$Number:$OrderBilledQty as BilledQty, $$Number:$ClosingBalance as PendingQty, $$Number:$ClosingValue as PendingValue from ITCAllOrders where ($TrackLedger=##LedgerName AND $Name=##ITCOrderName)</SQLREQUEST>
		</DESC>
	</BODY>
</ENVELOPE>`;
};

// Helper function to convert XML entities back to regular characters for Tally
export const convertXmlEntitiesForTally = (value: string): string => {
  if (!value) return '';
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#13;/g, '\r')
    .replace(/&#10;/g, '\n')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    // Handle dash characters that might be encoded
    .replace(/&#45;/g, '-')
    .replace(/&#x2D;/g, '-')
    .replace(/&ndash;/g, '–')
  .replace(/&#x2013;/g, '–') // en dash hex
  .replace(/&#x2014;/g, '—'); // em dash hex
};

// Get voucher types from Tally
export const getVoucherTypesXmlRequest = (): string => {
  return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>ODBC Report</REPORTNAME>
        <SQLREQUEST TYPE="General" METHOD="SQLExecute">select $Name as VoucherType from VoucherType where $$IsBelongsTo:$$VchTypeSalesOrder:$VoucherTypeName</SQLREQUEST>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;
};

