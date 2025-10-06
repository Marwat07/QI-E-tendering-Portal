const { query } = require('./config/database');
const Bid = require('./models/Bid');

async function testBidWithdrawal() {
  try {
    console.log('Testing bid withdrawal functionality...');
    
    // Find a pending bid that can be withdrawn
    const pendingBidResult = await query(`
      SELECT b.*, t.title as tender_title, t.status as tender_status, t.deadline
      FROM bids b
      LEFT JOIN tenders t ON b.tender_id = t.id
      WHERE b.status = 'pending' AND t.status IN ('open', 'draft')
      ORDER BY b.id DESC
      LIMIT 1
    `);
    
    if (pendingBidResult.rows.length === 0) {
      // Create a test bid for withdrawal testing
      console.log('Creating a test bid for withdrawal testing...');
      
      // Get an open tender
      const openTenderResult = await query(`
        SELECT * FROM tenders 
        WHERE status = 'open' AND deadline > NOW() 
        ORDER BY deadline ASC 
        LIMIT 1
      `);
      
      if (openTenderResult.rows.length === 0) {
        throw new Error('No open tenders available for testing bid withdrawal');
      }
      
      const tender = openTenderResult.rows[0];
      
      // Get a vendor
      const vendorResult = await query(`
        SELECT * FROM users 
        WHERE role = 'vendor' 
        ORDER BY id 
        LIMIT 1
      `);
      
      if (vendorResult.rows.length === 0) {
        throw new Error('No vendor users available for testing bid withdrawal');
      }
      
      const vendor = vendorResult.rows[0];
      
      // Create a test bid
      const testBid = await Bid.create({
        tender_id: tender.id,
        vendor_id: vendor.id,
        amount: 3000.00,
        proposal: 'Test bid for withdrawal testing',
        delivery_timeline: '45 days',
        attachments: []
      });
      
      console.log('✅ Created test bid for withdrawal:', testBid.id);
      
      // Test the withdrawal
      const withdrawnBid = await testBid.update({
        status: 'withdrawn'
      });
      
      console.log('✅ Bid withdrawn successfully:', withdrawnBid.id);
      console.log('✅ New status:', withdrawnBid.status);
      
    } else {
      const existingBid = new Bid(pendingBidResult.rows[0]);
      console.log('✅ Found existing pending bid:', existingBid.id);
      console.log('  - Tender:', existingBid.tender_title);
      console.log('  - Amount:', existingBid.amount);
      console.log('  - Current Status:', existingBid.status);
      
      // Test withdrawal
      console.log('Testing withdrawal...');
      const withdrawnBid = await existingBid.update({
        status: 'withdrawn'
      });
      
      console.log('✅ Bid withdrawn successfully:', withdrawnBid.id);
      console.log('✅ New status:', withdrawnBid.status);
    }
    
    // Verify the withdrawal was recorded
    const withdrawnBids = await query('SELECT COUNT(*) FROM bids WHERE status = $1', ['withdrawn']);
    console.log('✅ Total withdrawn bids in database:', withdrawnBids.rows[0].count);
    
    console.log('🎉 Bid withdrawal functionality test passed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Bid withdrawal test failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

testBidWithdrawal();
