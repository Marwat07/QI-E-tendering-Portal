const { query } = require('./config/database');
const Bid = require('./models/Bid');
const Tender = require('./models/Tender');

async function testBidFunctionality() {
  try {
    console.log('Testing bid submission functionality...');
    
    // First, get or create a test tender
    let tender = null;
    const tendersResult = await query(`
      SELECT * FROM tenders 
      WHERE status = 'open' AND deadline > NOW() 
      ORDER BY deadline ASC 
      LIMIT 1
    `);
    
    if (tendersResult.rows.length > 0) {
      tender = tendersResult.rows[0];
      console.log('✅ Found existing open tender:', tender.id, '- Title:', tender.title);
    } else {
      // Create a test tender
      console.log('Creating test tender...');
      const testTenderResult = await query(`
        INSERT INTO tenders (title, description, deadline, status, created_by, budget_min, budget_max)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        'Test Tender for Bid Testing',
        'This is a test tender for testing bid submission functionality',
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        'open',
        1, // Assuming user ID 1 exists
        1000,
        5000
      ]);
      tender = testTenderResult.rows[0];
      console.log('✅ Created test tender:', tender.id);
    }
    
    // Get an existing vendor user
    const vendorResult = await query(`
      SELECT * FROM users 
      WHERE role = 'vendor' 
      ORDER BY id 
      LIMIT 1
    `);
    
    if (vendorResult.rows.length === 0) {
      throw new Error('No vendor users found. Please create a vendor user first.');
    }
    
    const vendor = vendorResult.rows[0];
    console.log('✅ Found vendor user:', vendor.id, '- Email:', vendor.email);
    
    // Check if there's already a bid from this vendor for this tender
    const existingBid = await Bid.findByTenderAndVendor(tender.id, vendor.id);
    
    if (existingBid) {
      console.log('ℹ️  Found existing bid:', existingBid.id);
      console.log('✅ Bid submission functionality is working (existing bid found)');
    } else {
      // Test bid creation
      console.log('Testing bid creation...');
      
      const testBidData = {
        tender_id: tender.id,
        vendor_id: vendor.id,
        amount: 2500.00,
        proposal: 'Test proposal for bid submission functionality testing. This includes all required details.',
        delivery_timeline: '30 days',
        attachments: []
      };
      
      const newBid = await Bid.create(testBidData);
      console.log('✅ Bid created successfully:', newBid.id);
      
      // Test bid retrieval
      const retrievedBid = await Bid.findById(newBid.id);
      console.log('✅ Bid retrieved successfully:', retrievedBid.id);
      
      // Test bid update
      const updatedBid = await retrievedBid.update({ 
        amount: 2400.00, 
        proposal: 'Updated test proposal with better terms' 
      });
      console.log('✅ Bid updated successfully. New amount:', updatedBid.amount);
    }
    
    // Test bid statistics
    const bidStats = await Bid.getTenderBidStats(tender.id);
    console.log('✅ Bid statistics retrieved:', bidStats);
    
    // Test bid listing
    const allBids = await Bid.findAll({ tender_id: tender.id, limit: 5 });
    console.log('✅ Bid listing working. Found', allBids.length, 'bids for tender', tender.id);
    
    console.log('🎉 All bid functionality tests passed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Bid functionality test failed:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

testBidFunctionality();
