require('dotenv').config();

const User = require('../models/User');
const Category = require('../models/Category');
const Tender = require('../models/Tender');
const logger = require('../utils/logger');

const seedData = async () => {
  try {
    logger.info('Starting database seeding...');

    // Create admin user
    const adminExists = await User.findByEmail('admin@etendering.com');
    if (!adminExists) {
      await User.create({
        email: 'admin@etendering.com',
        password: 'admin123',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin'
      });
      console.log('✅ Admin user created');
    }

    // Create sample buyer
    const buyerExists = await User.findByEmail('buyer@company.com');
    if (!buyerExists) {
      await User.create({
        email: 'buyer@company.com',
        password: 'buyer123',
        first_name: 'John',
        last_name: 'Buyer',
        company_name: 'ABC Corporation',
        phone: '+1234567890',
        address: '123 Business Street, City',
        role: 'buyer'
      });
      console.log('✅ Sample buyer created');
    }

    // Create sample supplier
    const supplierExists = await User.findByEmail('supplier@vendor.com');
    if (!supplierExists) {
      await User.create({
        email: 'supplier@vendor.com',
        password: 'supplier123',
        first_name: 'Jane',
        last_name: 'Supplier',
        company_name: 'XYZ Suppliers Ltd',
        phone: '+0987654321',
        address: '456 Vendor Avenue, City',
        role: 'supplier'
      });
      console.log('✅ Sample supplier created');
    }

    // Create categories
    const categories = [
      {
        name: 'Construction & Infrastructure',
        description: 'Building construction, road works, and infrastructure development'
      },
      {
        name: 'IT & Software Services',
        description: 'Software development, IT consulting, and technology services'
      },
      {
        name: 'Office Supplies & Equipment',
        description: 'Office furniture, stationery, and business equipment'
      },
      {
        name: 'Professional Services',
        description: 'Consulting, legal, accounting, and other professional services'
      },
      {
        name: 'Transportation & Logistics',
        description: 'Vehicle services, shipping, and logistics solutions'
      }
    ];

    for (const categoryData of categories) {
      const existing = await Category.findByName(categoryData.name);
      if (!existing) {
        await Category.create(categoryData);
        console.log(`✅ Category created: ${categoryData.name}`);
      }
    }

    // Create sample tenders
    const buyer = await User.findByEmail('buyer@company.com');
    const itCategory = await Category.findByName('IT & Software Services');
    const constructionCategory = await Category.findByName('Construction & Infrastructure');

    if (buyer && itCategory) {
      const tender1Exists = await Tender.findAll({ title: 'Website Development Project', created_by: buyer.id });
      if (tender1Exists.length === 0) {
        await Tender.create({
          title: 'Website Development Project',
          description: 'We need a modern, responsive website for our company with e-commerce functionality.',
          category_id: itCategory.id,
          budget_min: 10000,
          budget_max: 25000,
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          requirements: `
            - Modern responsive design
            - E-commerce functionality
            - Content management system
            - SEO optimization
            - Mobile-friendly
            - Cross-browser compatibility
          `,
          created_by: buyer.id,
          status: 'open'
        });
        console.log('✅ Sample tender 1 created');
      }
    }

    if (buyer && constructionCategory) {
      const tender2Exists = await Tender.findAll({ title: 'Office Building Renovation', created_by: buyer.id });
      if (tender2Exists.length === 0) {
        await Tender.create({
          title: 'Office Building Renovation',
          description: 'Complete renovation of our 5-story office building including interior and exterior work.',
          category_id: constructionCategory.id,
          budget_min: 500000,
          budget_max: 750000,
          deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
          requirements: `
            - Interior renovation of all floors
            - Exterior facade upgrade
            - HVAC system upgrade
            - Electrical system modernization
            - Compliance with building codes
            - Project completion within 6 months
          `,
          created_by: buyer.id,
          status: 'open'
        });
        console.log('✅ Sample tender 2 created');
      }
    }

    logger.info('Database seeding completed successfully!');
    console.log('✅ Database seeding completed successfully!');
    console.log('\n📋 Sample Login Credentials:');
    console.log('Admin: admin@etendering.com / admin123');
    console.log('Buyer: buyer@company.com / buyer123');
    console.log('Supplier: supplier@vendor.com / supplier123');
    
  } catch (error) {
    logger.error('Database seeding failed:', error);
    console.error('❌ Database seeding failed:', error.message);
    process.exit(1);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedData().then(() => {
    process.exit(0);
  });
}

module.exports = seedData;
