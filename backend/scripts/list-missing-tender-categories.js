const { connectDB, query, gracefulShutdown } = require('../config/database');

async function listMissing() {
  try {
    await connectDB();
    const res = await query(`
      SELECT id, title, description, requirements
      FROM tenders
      WHERE category_id IS NULL
      ORDER BY id DESC
      LIMIT 50
    `);
    console.log(`Tenders missing category_id: ${res.rows.length}`);
    res.rows.forEach((r, i) => {
      const desc = (r.description || '').replace(/\s+/g, ' ').slice(0, 120);
      console.log(`${i+1}. #${r.id} ${r.title} :: ${desc}`);
    });
  } catch (e) {
    console.error('Error listing tenders:', e.message);
    process.exitCode = 1;
  } finally {
    await gracefulShutdown();
  }
}

if (require.main === module) listMissing();
