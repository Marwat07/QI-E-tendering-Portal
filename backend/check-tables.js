const { query } = require('./config/database');

async function checkTables() {
  try {
    console.log('Checking table structures...');
    
    // Check tenders table structure
    const tendersResult = await query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'tenders' 
      ORDER BY ordinal_position
    `);
    
    console.log('Tenders table columns:');
    console.log(tendersResult.rows);
    
    // Check if specific columns exist
    const hasPublishedAt = tendersResult.rows.some(row => row.column_name === 'published_at');
    console.log('Has published_at column:', hasPublishedAt);
    
    // Check bids table structure
    const bidsResult = await query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'bids' 
      ORDER BY ordinal_position
    `);
    
    console.log('Bids table columns:');
    console.log(bidsResult.rows);
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking tables:', error);
    process.exit(1);
  }
}

checkTables();
