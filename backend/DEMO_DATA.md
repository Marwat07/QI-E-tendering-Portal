# E-Tendering Portal - Demo Data Guide

## Overview

This document provides comprehensive demo data examples for the e-tendering portal, including:
- Text content for tender uploads
- User creation form data samples
- File upload demonstrations
- API request/response examples

## Table of Contents

1. [User Demo Data](#user-demo-data)
2. [Tender Demo Data](#tender-demo-data)
3. [File Upload Demo Data](#file-upload-demo-data)
4. [Bid Submission Demo Data](#bid-submission-demo-data)
5. [API Testing Samples](#api-testing-samples)
6. [Form Validation Examples](#form-validation-examples)

---

## User Demo Data

### Admin User Creation

```json
{
  "email": "admin@etendering.com",
  "password": "admin123",
  "first_name": "Admin",
  "last_name": "User",
  "role": "admin",
  "is_active": true,
  "is_verified": true
}
```

### Buyer User Creation Form

```json
{
  "email": "buyer@company.com",
  "password": "buyer123",
  "first_name": "John",
  "last_name": "Buyer",
  "company_name": "ABC Corporation",
  "phone": "+1234567890",
  "address": "123 Business Street, City, State 12345",
  "role": "buyer",
  "category": "construction",
  "tax_number": "TAX123456789",
  "registration_number": "REG987654321"
}
```

### Vendor/Supplier User Creation Form

```json
{
  "email": "supplier@vendor.com",
  "password": "supplier123",
  "first_name": "Jane",
  "last_name": "Supplier",
  "company_name": "XYZ Suppliers Ltd",
  "phone": "+0987654321",
  "address": "456 Vendor Avenue, City, State 54321",
  "role": "vendor",
  "category": "it_services",
  "tax_number": "TAX987654321",
  "registration_number": "REG123456789"
}
```

### Auto-Generated User Creation (Admin Only)

```json
{
  "email": "newuser@company.com",
  "company_name": "New Company Ltd",
  "phone": "+1122334455",
  "address": "789 New Street, City, State 67890",
  "role": "vendor",
  "category": "professional_services",
  "tax_number": "TAX445566778",
  "registration_number": "REG778899001",
  "auto_generate_credentials": true
}
```

**Response Example:**
```json
{
  "success": true,
  "message": "User created successfully. Credentials have been emailed to the user.",
  "data": {
    "user": {
      "id": 123,
      "email": "newuser@company.com",
      "username": "newuser_comp_001",
      "company_name": "New Company Ltd",
      "role": "vendor",
      "created_at": "2024-01-15T10:30:00Z"
    }
  },
  "debug_credentials": {
    "username": "newuser_comp_001",
    "password": "TempPass123!"
  }
}
```

---

## Tender Demo Data

### IT & Software Services Tender

```json
{
  "title": "Website Development Project",
  "description": "We need a modern, responsive website for our company with e-commerce functionality. The website should be built using modern technologies and include a content management system.",
  "category_id": 2,
  "budget_min": 10000,
  "budget_max": 25000,
  "deadline": "2024-03-15T23:59:59Z",
  "requirements": "- Modern responsive design\n- E-commerce functionality with payment gateway integration\n- Content management system (CMS)\n- SEO optimization\n- Mobile-friendly responsive design\n- Cross-browser compatibility (Chrome, Firefox, Safari, Edge)\n- SSL certificate implementation\n- Google Analytics integration\n- Contact forms with email notifications\n- Social media integration\n- Performance optimization (page load speed < 3 seconds)\n- Accessibility compliance (WCAG 2.1 AA)\n- Basic training for content management",
  "attachments": [
    "tender-1640995200000-123456789.pdf",
    "requirements-1640995300000-987654321.docx"
  ],
  "status": "open"
}
```

### Construction & Infrastructure Tender

```json
{
  "title": "Office Building Renovation",
  "description": "Complete renovation of our 5-story office building including interior and exterior work. The project involves modernizing the building infrastructure while maintaining operations.",
  "category_id": 1,
  "budget_min": 500000,
  "budget_max": 750000,
  "deadline": "2024-04-30T17:00:00Z",
  "requirements": "- Interior renovation of all floors (approx. 15,000 sq ft per floor)\n- Exterior facade upgrade and cleaning\n- HVAC system upgrade to energy-efficient models\n- Electrical system modernization with LED lighting\n- Plumbing system inspection and upgrades\n- Fire safety system compliance updates\n- Elevator modernization (2 passenger elevators)\n- Conference room renovations (5 rooms)\n- Kitchen and break room upgrades\n- Accessibility improvements (ADA compliance)\n- Security system installation\n- Compliance with all local building codes\n- Project completion within 6 months\n- Minimal disruption to business operations\n- Proper waste disposal and environmental compliance",
  "attachments": [
    "building-plans-1640995400000-112233445.pdf",
    "specifications-1640995500000-556677889.xlsx"
  ],
  "status": "open"
}
```

### Professional Services Tender

```json
{
  "title": "Digital Marketing Strategy Consultation",
  "description": "Seeking comprehensive digital marketing strategy development and implementation support for expanding our market reach in the next fiscal year.",
  "category_id": 4,
  "budget_min": 15000,
  "budget_max": 30000,
  "deadline": "2024-02-28T18:00:00Z",
  "requirements": "- Market analysis and competitor research\n- Brand positioning strategy\n- Social media marketing plan\n- Content marketing strategy\n- SEO/SEM strategy development\n- Email marketing campaign setup\n- Analytics and reporting framework\n- 6-month implementation roadmap\n- Monthly progress reviews\n- Team training sessions\n- Performance KPI definitions\n- Budget allocation recommendations",
  "attachments": [
    "company-profile-1640995600000-334455667.pdf"
  ],
  "status": "open"
}
```

---

## File Upload Demo Data

### Supported File Types and Examples

#### Text Files (.txt)
**Sample Content for requirement-details.txt:**
```
TENDER REQUIREMENTS SPECIFICATION

Project: Website Development

Technical Requirements:
- Framework: React.js or Vue.js
- Backend: Node.js with Express
- Database: PostgreSQL or MongoDB
- Hosting: Cloud-based solution (AWS, Azure, or Google Cloud)
- SSL Certificate: Required
- Backup System: Daily automated backups

Functional Requirements:
- User registration and authentication
- Product catalog with search functionality
- Shopping cart and checkout process
- Payment gateway integration (Stripe/PayPal)
- Order management system
- Customer support chat
- Admin dashboard
- Inventory management

Design Requirements:
- Modern, clean design
- Brand colors: #003366 (primary), #FF6600 (accent)
- Mobile-first approach
- Loading time: < 3 seconds
- Accessibility: WCAG 2.1 AA compliance

Deliverables:
- Complete source code
- Deployment guide
- User documentation
- Admin training materials
- 3 months of technical support
```

#### PDF Documents
Sample PDF document names and purposes:
- `tender-specifications-2024-001.pdf` - Detailed project specifications
- `company-profile-certified.pdf` - Company information and certifications
- `financial-requirements.pdf` - Budget breakdown and payment terms
- `technical-drawings-v2.pdf` - Architectural or technical drawings
- `compliance-checklist.pdf` - Regulatory compliance requirements

#### Excel/Spreadsheet Files (.xlsx)
**Sample Content Structure for budget-breakdown.xlsx:**
```
Item                    | Quantity | Unit Price | Total Price | Notes
------------------------|----------|------------|-------------|------------------
Frontend Development    | 1        | $8,000     | $8,000      | React.js
Backend Development     | 1        | $6,000     | $6,000      | Node.js API
Database Setup         | 1        | $2,000     | $2,000      | PostgreSQL
UI/UX Design           | 1        | $4,000     | $4,000      | Responsive
Testing & QA           | 1        | $3,000     | $3,000      | Automated
Deployment             | 1        | $1,500     | $1,500      | Cloud hosting
Documentation          | 1        | $1,000     | $1,000      | User guides
Total                  |          |            | $25,500     |
```

### File Upload API Examples

#### Single File Upload
```bash
curl -X POST \
  http://localhost:5000/api/upload \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: multipart/form-data' \
  -F 'file=@/path/to/tender-requirements.pdf'
```

**Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "filename": "file-1640995200000-123456789.pdf",
    "originalName": "tender-requirements.pdf",
    "path": "/uploads/file-1640995200000-123456789.pdf",
    "size": 2048576,
    "mimetype": "application/pdf"
  }
}
```

#### Multiple File Upload
```bash
curl -X POST \
  http://localhost:5000/api/upload/multiple \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: multipart/form-data' \
  -F 'files=@/path/to/specs.pdf' \
  -F 'files=@/path/to/drawings.xlsx' \
  -F 'files=@/path/to/requirements.txt'
```

---

## Bid Submission Demo Data

### IT Services Bid

```json
{
  "tender_id": 1,
  "amount": 18500,
  "proposal": "We propose to develop a cutting-edge e-commerce website using React.js and Node.js. Our team has 5+ years of experience in similar projects.\n\nProject Timeline:\n- Week 1-2: Requirements analysis and UI/UX design\n- Week 3-6: Frontend development and API integration\n- Week 7-8: Testing, optimization, and deployment\n- Week 9: Training and handover\n\nWhy Choose Us:\n- Experienced team with proven track record\n- 24/7 technical support for 6 months\n- Mobile-responsive design guaranteed\n- SEO optimization included\n- Free SSL certificate and basic hosting setup\n\nDeliverables:\n- Complete source code with documentation\n- Admin training sessions (2 hours)\n- 6 months of technical support\n- Performance optimization report",
  "attachments": [
    "portfolio-samples-1641000000000-111222333.pdf",
    "project-timeline-1641000100000-444555666.xlsx"
  ],
  "estimated_completion_days": 60,
  "additional_notes": "We can start immediately and provide weekly progress updates. Payment terms: 30% upfront, 40% at milestone completion, 30% on final delivery."
}
```

### Construction Bid

```json
{
  "tender_id": 2,
  "amount": 680000,
  "proposal": "ABC Construction Ltd. is pleased to submit our proposal for the complete renovation of your 5-story office building.\n\nProject Approach:\nPhase 1 (Months 1-2): Exterior facade and structural assessments\nPhase 2 (Months 2-4): HVAC and electrical system upgrades\nPhase 3 (Months 4-5): Interior renovations floor by floor\nPhase 4 (Month 6): Final inspections and certifications\n\nOur Advantages:\n- 15+ years in commercial renovations\n- Licensed and bonded contractors\n- Comprehensive insurance coverage\n- Sustainable building practices\n- Minimal business disruption approach\n\nIncluded Services:\n- Project management and coordination\n- All permits and inspections\n- Waste disposal and site cleanup\n- Quality assurance inspections\n- 2-year warranty on all work",
  "attachments": [
    "contractor-license-1641001000000-777888999.pdf",
    "previous-projects-1641001100000-101112131.pdf",
    "material-specifications-1641001200000-141516171.xlsx"
  ],
  "estimated_completion_days": 180,
  "additional_notes": "We propose working during non-business hours for critical areas to minimize disruption. Emergency contact available 24/7 during project duration."
}
```

---

## API Testing Samples

### User Registration Test Data

```bash
# Test 1: Valid vendor registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testvendor@example.com",
    "password": "TestPass123!",
    "company_name": "Test Vendor Solutions",
    "phone": "+1555123456",
    "address": "123 Test Street, Test City, TC 12345",
    "role": "vendor",
    "category": "it_services"
  }'
```

### Tender Creation Test Data

```bash
# Test: Create IT services tender
curl -X POST http://localhost:5000/api/tenders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Mobile App Development",
    "description": "Native iOS and Android app development for inventory management",
    "category_id": 2,
    "budget_min": 25000,
    "budget_max": 40000,
    "deadline": "2024-05-15T17:00:00Z",
    "requirements": "- Native iOS (Swift) and Android (Kotlin) development\n- Offline functionality\n- Barcode scanning capability\n- Real-time synchronization\n- User authentication\n- Reporting dashboard",
    "attachments": []
  }'
```

---

## Form Validation Examples

### Valid Form Submissions

#### User Creation Form (Frontend)
```html
<form id="userCreationForm">
  <!-- Email field -->
  <input type="email" 
         name="email" 
         value="newuser@company.com" 
         required 
         pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$">
  
  <!-- Company name -->
  <input type="text" 
         name="company_name" 
         value="New Tech Solutions Ltd" 
         required 
         minlength="2" 
         maxlength="100">
  
  <!-- Phone number -->
  <input type="tel" 
         name="phone" 
         value="+1-555-123-4567" 
         required 
         pattern="[+]?[0-9\s\-\(\)]+">
  
  <!-- Role selection -->
  <select name="role" required>
    <option value="">Select Role</option>
    <option value="buyer">Buyer</option>
    <option value="vendor" selected>Vendor</option>
  </select>
  
  <!-- Category selection -->
  <select name="category" required>
    <option value="">Select Category</option>
    <option value="it_services" selected>IT Services</option>
    <option value="construction">Construction</option>
    <option value="professional_services">Professional Services</option>
    <option value="transportation">Transportation</option>
    <option value="other">Other</option>
  </select>
</form>
```

### Invalid Form Examples (for testing validation)

#### Invalid Email Formats
```json
{
  "email": "invalid-email",           // Missing @ and domain
  "email": "user@",                  // Missing domain
  "email": "@domain.com",            // Missing username
  "email": "user@domain",            // Missing TLD
  "email": "user name@domain.com"    // Space in username
}
```

#### Invalid Phone Numbers
```json
{
  "phone": "123",                    // Too short
  "phone": "abcd1234567",           // Contains letters
  "phone": "",                      // Empty (if required)
  "phone": "123-456-78901234567890" // Too long
}
```

---

## Sample Categories Data

```json
[
  {
    "id": 1,
    "name": "Construction & Infrastructure",
    "description": "Building construction, road works, and infrastructure development projects",
    "is_active": true
  },
  {
    "id": 2,
    "name": "IT & Software Services",
    "description": "Software development, IT consulting, and technology services",
    "is_active": true
  },
  {
    "id": 3,
    "name": "Office Supplies & Equipment",
    "description": "Office furniture, stationery, and business equipment procurement",
    "is_active": true
  },
  {
    "id": 4,
    "name": "Professional Services",
    "description": "Consulting, legal, accounting, and other professional services",
    "is_active": true
  },
  {
    "id": 5,
    "name": "Transportation & Logistics",
    "description": "Vehicle services, shipping, and logistics solutions",
    "is_active": true
  }
]
```

---

## Quick Test Commands

### Database Seeding
```bash
# Seed database with demo data
npm run seed

# Check database health
npm run health:db

# Test user creation
npm run test:user-creation

# Test email functionality
npm run test:email
```

### Sample Login Credentials (After Seeding)
```
Admin:    admin@etendering.com     / admin123
Buyer:    buyer@company.com        / buyer123  
Supplier: supplier@vendor.com      / supplier123
```

---

## File Upload Limits and Restrictions

### Supported File Types
- `.pdf` - PDF documents
- `.doc`, `.docx` - Microsoft Word documents
- `.txt` - Text files
- `.xls`, `.xlsx` - Microsoft Excel spreadsheets

### File Size Limits
- **Maximum file size**: 10MB per file
- **Maximum files per upload**: 10 files
- **Total storage**: Configured by system admin

### File Naming Conventions
- Generated filename format: `fieldname-timestamp-random.extension`
- Example: `file-1640995200000-123456789.pdf`
- Original filename preserved in metadata

---

## Testing Checklist

### User Creation Testing
- [ ] Valid email registration
- [ ] Duplicate email prevention
- [ ] Password strength validation
- [ ] Role-based access control
- [ ] Auto-generated credentials (admin only)
- [ ] Email notifications

### Tender Upload Testing
- [ ] File type validation
- [ ] File size limits
- [ ] Multiple file uploads
- [ ] File download/view functionality
- [ ] Authentication requirements
- [ ] Storage location verification

### Form Validation Testing
- [ ] Required field validation
- [ ] Email format validation
- [ ] Phone number format validation
- [ ] Text length limits
- [ ] Special character handling
- [ ] SQL injection prevention

---

## Support Information

For additional demo data or testing scenarios, refer to:
- `scripts/seed.js` - Database seeding script
- `scripts/test-*.js` - Various testing scripts
- API documentation in `README.md`
- Environment configuration in `.env.example`

**Generated**: 2024-01-15  
**Version**: 1.0.0  
**Last Updated**: Current