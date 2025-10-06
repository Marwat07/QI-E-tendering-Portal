require('dotenv').config();
const { query } = require('../config/database');

const updateTenderStatus = async () => {
  try {
    console.log('Updating tender status to open...');
    
    // Update all tenders to have status 'open'
    const result = await query(
      `UPDATE tenders SET status = 'open' WHERE status IS NULL OR status != 'open'`,
      []
    );
    
    console.log(`Updated ${result.rowCount} tenders to 'open' status`);
    
    // Show all tenders
    const tenders = await query('SELECT id, title, status, deadline FROM tenders');
    console.log('\nAll tenders:');
    tenders.rows.forEach(tender => {
      console.log(`- ID: ${tender.id}, Title: ${tender.title}, Status: ${tender.status}, Deadline: ${tender.deadline}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating tender status:', error);
    process.exit(1);
  }
};

updateTenderStatus();
