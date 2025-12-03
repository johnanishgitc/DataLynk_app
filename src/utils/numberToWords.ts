// Number to words converter for Indian currency format
export const convertNumberToWords = (amount: number): string => {
  if (amount === 0) return 'Zero Only';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const scales = ['', 'Thousand', 'Lakh', 'Crore'];
  
  const convertHundreds = (num: number): string => {
    let result = '';
    
    if (num > 99) {
      result += ones[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }
    
    if (num > 19) {
      result += tens[Math.floor(num / 10)] + ' ';
      num %= 10;
    } else if (num > 9) {
      result += teens[num - 10] + ' ';
      return result.trim();
    }
    
    if (num > 0) {
      result += ones[num] + ' ';
    }
    
    return result.trim();
  };
  
  const convertThousands = (num: number): string => {
    let result = '';
    let scaleIndex = 0;
    
    while (num > 0) {
      const chunk = num % 1000;
      if (chunk !== 0) {
        const chunkWords = convertHundreds(chunk);
        if (scaleIndex > 0) {
          result = chunkWords + ' ' + scales[scaleIndex] + ' ' + result;
        } else {
          result = chunkWords;
        }
      }
      num = Math.floor(num / 1000);
      scaleIndex++;
    }
    
    return result.trim();
  };
  
  const integerPart = Math.floor(amount);
  const decimalPart = Math.round((amount - integerPart) * 100);
  
  let result = 'INR ' + convertThousands(integerPart);
  
  if (decimalPart > 0) {
    result += ' and ' + convertHundreds(decimalPart) + ' Paise';
  }
  
  result += ' Only';
  
  return result;
};

