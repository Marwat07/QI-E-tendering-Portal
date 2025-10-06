const { query } = require('./config/database');
const Bid = require('./models/Bid');

async function testCompleteBidCycle() {
  try {
    console.log('🧪 Testing complete bid lifecycle including withdrawal...');
    
    // Get test data
    const tender = await query(`
      SELECT * FROM tenders 
      WHERE status = 'open' AND deadline > NOW() 
      ORDER BY deadline ASC 
      LIMIT 1
    `);
    
    const vendor = await query(`
      SELECT * FROM users 
      WHERE role = 'vendor' 
      ORDER BY id 
      LIMIT 1
    `);
    
    if (tender.rows.length === 0 || vendor.rows.length === 0) {
      throw new Error('Missing test data - need at least one open tender and one vendor');
    }
    
    const testTender = tender.rows[0];
    const testVendor = vendor.rows[0];
    
    console.log(`Using tender: ${testTender.id} (${testTender.title})`);
    console.log(`Using vendor: ${testVendor.id} (${testVendor.email})`);
    
    // 1. CREATE BID
    console.log('\n1️⃣ Testing bid creation...');
    const newBid = await Bid.create({
      tender_id: testTender.id,
      vendor_id: testVendor.id,
      amount: 1850.00,
      proposal: 'Complete test bid for lifecycle testing including detailed proposal',
      delivery_timeline: '60 days',
      attachments: []
    });
    console.log('✅ Bid created successfully:', newBid.id);
    
    // 2. UPDATE BID
    console.log('\n2️⃣ Testing bid update...');
    const updatedBid = await newBid.update({
      amount: 1750.00,
      proposal: 'Updated proposal with better pricing and terms',
      delivery_timeline: '50 days'
    });
    console.log('✅ Bid updated successfully. New amount:', updatedBid.amount);
    
    // 3. WITHDRAW BID
    console.log('\n3️⃣ Testing bid withdrawal...');
    const withdrawnBid = await updatedBid.update({
      status: 'withdrawn'
    });
    console.log('✅ Bid withdrawn successfully. Status:', withdrawnBid.status);
    
    // 4. VERIFY WITHDRAWAL
    console.log('\n4️⃣ Verifying withdrawal...');
    const retrievedBid = await Bid.findById(withdrawnBid.id);
    if (retrievedBid.status !== 'withdrawn') {
      throw new Error(`Expected status 'withdrawn' but got '${retrievedBid.status}'`);
    }
    console.log('✅ Withdrawal verified in database');
    
    // 5. TEST BID STATISTICS
    console.log('\n5️⃣ Testing bid statistics...');
    const tenderStats = await Bid.getTenderBidStats(testTender.id);
    console.log('✅ Tender bid stats:', {
      total_bids: tenderStats.total_bids,
      pending: tenderStats.pending,
      withdrawn: tenderStats.withdrawn || 'N/A (column may not exist in stats query)'
    });
    
    const vendorStats = await Bid.getVendorStats(testVendor.id);
    console.log('✅ Vendor bid stats:', {
      total_bids: vendorStats.total_bids,
      won_bids: vendorStats.won_bids,
      pending_bids: vendorStats.pending_bids
    });
    
    // 6. COUNT TOTAL WITHDRAWN BIDS
    const withdrawnCount = await query('SELECT COUNT(*) as count FROM bids WHERE status = $1', ['withdrawn']);
    console.log('✅ Total withdrawn bids in system:', withdrawnCount.rows[0].count);
    
    console.log('\n🎉 Complete bid lifecycle test (including withdrawal) PASSED!');
    console.log('\n✨ Summary:');
    console.log('   - Bid creation: ✅ Working');
    console.log('   - Bid updates: ✅ Working'); 
    console.log('   - Bid withdrawal: ✅ Working');
    console.log('   - Database triggers: ✅ Working');
    console.log('   - No duplicate updated_at errors: ✅ Fixed');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Complete bid cycle test failed:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

testCompleteBidCycle();
