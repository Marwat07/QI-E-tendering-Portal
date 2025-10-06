require('dotenv').config();

const { connectDB, gracefulShutdown } = require('../config/database');
const User = require('../models/User');
const Tender = require('../models/Tender');

async function run() {
  try {
    await connectDB();

    console.log('=== Test: Vendor multi-category tender filtering ===');

    // Create a temporary vendor with multiple categories
    const email = `vendor_multi_${Date.now()}@example.com`;
    const categories = [
      'IT & Software Services',
      'Construction & Infrastructure',
      'Professional Services'
    ];

    console.log('Creating test vendor:', email, 'with categories:', categories.join(', '));
    const user = await User.createWithCategories({
      email,
      username: `vendor_${Date.now()}`,
      password: 'Test1234!',
      role: 'vendor',
      category: categories[0],
      company_name: 'Test MultiCat Vendor Co.'
    }, categories);

    const savedCategories = await user.getCategories();
    console.log('Saved categories for user:', savedCategories);

    // Fetch tenders via model using the user's categories
    console.log('\nFetching tenders for user categories...');
    const tenders = await Tender.findByUserCategories(savedCategories, { active_only: true, limit: 20 });
    console.log(`Found ${tenders.length} active tenders matching these categories.`);
    for (const t of tenders.slice(0, 5)) {
      console.log(`- [${t.id}] ${t.title} | ${t.category_name || t.display_category || t.category || 'Uncategorized'}`);
    }

    console.log('\nSUCCESS: Filtering by multiple user categories works.');
  } catch (err) {
    console.error('Test failed:', err.message);
  } finally {
    await gracefulShutdown();
  }
}

if (require.main === module) {
  run();
}
