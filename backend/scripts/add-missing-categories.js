const { connectDB, query, gracefulShutdown } = require('../config/database');

const MISSING_CATEGORIES = [
  { name: 'Textiles', description: 'Textiles, garments, and apparel' },
  { name: 'Pharmaceuticals', description: 'Medical supplies, healthcare, pharmaceuticals' },
  { name: 'Food & Beverages', description: 'Food, catering, and beverages' },
  { name: 'Chemicals', description: 'Industrial chemicals, reagents, paints' },
  { name: 'Furniture', description: 'Office and general furniture' },
  { name: 'Other', description: 'Miscellaneous services and products' },
];

async function ensureCategories() {
  try {
    await connectDB();

    let inserted = 0;
    let existing = 0;

    for (const c of MISSING_CATEGORIES) {
      const res = await query('SELECT id, is_active FROM categories WHERE name ILIKE $1 LIMIT 1', [c.name]);
      if (res.rows.length === 0) {
        await query(
          'INSERT INTO categories (name, description, is_active) VALUES ($1, $2, TRUE)',
          [c.name, c.description]
        );
        console.log(`✅ Inserted category: ${c.name}`);
        inserted++;
      } else {
        // If it exists but is inactive, activate it
        const row = res.rows[0];
        if (row.is_active === false) {
          await query('UPDATE categories SET is_active = TRUE WHERE id = $1', [row.id]);
          console.log(`🔄 Activated category: ${c.name}`);
        } else {
          console.log(`ℹ️  Category already exists: ${c.name}`);
        }
        existing++;
      }
    }

    console.log(`\nSummary: inserted=${inserted}, already_present=${existing}`);
  } catch (e) {
    console.error('Error ensuring categories:', e.message);
    process.exitCode = 1;
  } finally {
    await gracefulShutdown();
  }
}

if (require.main === module) {
  ensureCategories();
}
