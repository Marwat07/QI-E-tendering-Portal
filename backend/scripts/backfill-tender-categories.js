/*
 Backfill tender.category_id using the same 9 categories used in user creation.
 - Dry-run by default. Run with `--apply` to persist changes.

 Categories (slugs):
   electronics, construction, textiles, automotive, pharmaceuticals,
   food_beverages, machinery, chemicals, furniture

 Strategy:
 1) Load active categories from DB and map them to the 9 slugs by name patterns.
 2) Scan tenders missing category_id and infer a slug via keywords in title/description.
 3) If a slug is inferred and we have a matching category_id, update (only with --apply).
*/

const { query, getClient, connectDB, gracefulShutdown } = require('../config/database');

const SLUGS = [
  'electronics',
  'construction',
  'textiles',
  'automotive',
  'pharmaceuticals',
  'food_beverages',
  'machinery',
  'chemicals',
  'furniture',
];

// Map slugs to name patterns expected in the categories table
const SLUG_NAME_PATTERNS = {
  electronics: ['electronic', 'it &', 'it ', 'information technology', 'it services', 'software', 'it and'],
  construction: ['construction', 'infrastructure', 'civil', 'building'],
  textiles: ['textile', 'garment', 'apparel', 'fabric'],
  automotive: ['automotive', 'vehicle', 'fleet', 'transport', 'logistic'],
  pharmaceuticals: ['pharmaceutical', 'healthcare', 'medical', 'hospital'],
  food_beverages: ['food', 'beverage', 'catering', 'refreshment'],
  machinery: ['machinery', 'equipment', 'supplies & equipment', 'hardware'],
  chemicals: ['chemical', 'chemicals', 'energy', 'utilities'],
  furniture: ['furniture'],
};

// Keywords to infer slug from tender title/description
const SLUG_KEYWORDS = {
  electronics: ['software', 'portal', 'system', 'application', 'app ', 'web', 'website', 'technology', 'ict', 'it '],
  construction: ['construction', 'civil', 'road', 'bridge', 'infrastructure', 'renovation', 'building'],
  textiles: ['uniform', 'garment', 'textile', 'apparel', 'fabric', 'cloth'],
  automotive: ['vehicle', 'motor', 'car ', 'bus', 'truck', 'fleet', 'transport', 'logistic'],
  pharmaceuticals: ['medical', 'medicine', 'pharma', 'hospital', 'clinic', 'health'],
  food_beverages: ['canteen', 'catering', 'food', 'beverage', 'snack', 'refreshment'],
  machinery: ['equipment', 'machine', 'machinery', 'generator', 'printer', 'photocopier', 'hardware'],
  chemicals: ['chemical', 'reagent', 'lab ', 'laboratory', 'paint', 'solvent', 'fuel'],
  furniture: ['furniture', 'table', 'chair', 'desk', 'cabinet'],
};

function norm(s) { return (s || '').toString().toLowerCase(); }

async function mapCategoriesToSlugs() {
  const res = await query('SELECT id, name FROM categories WHERE is_active = true');
  const rows = res.rows.map(r => ({ id: r.id, name: r.name, lname: norm(r.name) }));

  const slugToId = {};
  for (const slug of SLUGS) {
    const patterns = SLUG_NAME_PATTERNS[slug] || [];
    const match = rows.find(r => patterns.some(p => r.lname.includes(p)));
    if (match) slugToId[slug] = match.id;
  }

  // Log mapping summary
  console.log('Category slug -> id mapping (from categories table):');
  SLUGS.forEach(slug => {
    console.log(`  ${slug.padEnd(18)} => ${slugToId[slug] || 'NOT FOUND'}`);
  });

  return slugToId;
}

function inferSlugFromText(text) {
  const t = norm(text);
  for (const slug of SLUGS) {
    const kws = SLUG_KEYWORDS[slug] || [];
    if (kws.some(k => t.includes(k))) return slug;
  }
  return null;
}

async function main() {
  const APPLY = process.argv.includes('--apply');
  console.log(`Backfill tender.category_id (dry-run=${!APPLY})`);

  // Ensure DB is connected for standalone script
  await connectDB();

  const slugToId = await mapCategoriesToSlugs();

  const tendersRes = await query('SELECT id, title, description FROM tenders WHERE category_id IS NULL');
  const tenders = tendersRes.rows;
  console.log(`Tenders missing category_id: ${tenders.length}`);

  const changes = [];
  let unmatched = 0;

  for (const t of tenders) {
    const text = `${t.title || ''} ${t.description || ''}`;
    const slug = inferSlugFromText(text);
    const category_id = slug ? slugToId[slug] : null;
    if (slug && category_id) {
      changes.push({ id: t.id, slug, category_id, title: t.title });
    } else {
      unmatched += 1;
    }
  }

  console.log(`Matched ${changes.length} tenders; unmatched ${unmatched}`);

  if (!APPLY) {
    console.log('Dry-run preview (first 20):');
    console.table(changes.slice(0, 20).map(c => ({ id: c.id, slug: c.slug, category_id: c.category_id, title: (c.title || '').slice(0, 40) })));
    console.log('Run with --apply to persist changes.');
    return;
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    for (const c of changes) {
      await client.query('UPDATE tenders SET category_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [c.category_id, c.id]);
    }
    await client.query('COMMIT');
    console.log(`Applied ${changes.length} updates.`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Failed to apply updates:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
  }
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
}).finally(async () => {
  try { await gracefulShutdown(); } catch (_) {}
});
