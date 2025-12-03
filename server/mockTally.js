// Mock Tally integration - replace with real adapter
async function pushPaymentToTally(paymentData) {
  console.log('📊 Mock Tally Payment Push:', paymentData);
  
  // Simulate Tally API call
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('✅ Payment pushed to Tally successfully');
      resolve({ success: true, tallyId: 'TALLY_' + Date.now() });
    }, 1000);
  });
}

module.exports = { pushPaymentToTally };
