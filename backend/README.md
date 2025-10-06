# E-Tendering Portal Backend

A robust Node.js backend API for an e-tendering portal built with Express.js and PostgreSQL.

## Features

- 🔐 **Authentication & Authorization**: JWT-based authentication with role-based access control
- 👥 **User Management**: Admin, Buyer, and Supplier roles
- 📋 **Tender Management**: Complete CRUD operations for tenders
- 💰 **Bid Management**: Suppliers can submit and manage bids
- 🏷️ **Category Management**: Organize tenders by categories
- 📊 **Statistics & Analytics**: Comprehensive statistics for all entities
- 🔒 **Security**: Rate limiting, input validation, and secure headers
- 📝 **Logging**: Comprehensive logging with Winston
- 🗄️ **Database**: PostgreSQL with connection pooling

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator
- **Logging**: Winston
- **Security**: Helmet, CORS, Rate Limiting

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn package manager

## Installation

1. **Clone the repository** (if not already done)
   ```bash
   cd "C:\Users\Talal Khan\etendering portal\backend"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env` file and update the values:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=etendering_db
   DB_USER=postgres
   DB_PASSWORD=your_password_here

   # JWT Configuration
   JWT_SECRET=your_very_secure_jwt_secret_key_here
   JWT_EXPIRES_IN=7d

   # Server Configuration
   PORT=5000
   NODE_ENV=development
   CLIENT_URL=http://localhost:3000
   ```

4. **Create PostgreSQL database**
   ```sql
   CREATE DATABASE etendering_db;
   ```

5. **Run database migration**
   ```bash
   npm run migrate
   ```

6. **Seed the database (optional)**
   ```bash
   npm run seed
   ```

7. **Start the server**
   ```bash
   # Development mode with auto-reload
   npm run dev

   # Production mode
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password

### Users (Admin only)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get single user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Categories
- `GET /api/categories` - Get all categories (public)
- `GET /api/categories/:id` - Get single category (public)
- `POST /api/categories` - Create category (admin only)
- `PUT /api/categories/:id` - Update category (admin only)
- `DELETE /api/categories/:id` - Delete category (admin only)

### Tenders
- `GET /api/tenders` - Get all tenders
- `GET /api/tenders/:id` - Get single tender
- `POST /api/tenders` - Create tender (buyers/admins only)
- `PUT /api/tenders/:id` - Update tender (owner/admin only)
- `DELETE /api/tenders/:id` - Delete tender (owner/admin only)
- `GET /api/tenders/:id/bids` - Get tender bids (owner/admin only)
- `GET /api/tenders/stats` - Get tender statistics

### Bids
- `GET /api/bids` - Get all bids
- `GET /api/bids/:id` - Get single bid
- `POST /api/bids` - Create bid (suppliers only)
- `PUT /api/bids/:id` - Update bid (owner only)
- `DELETE /api/bids/:id` - Delete bid (owner only)
- `POST /api/bids/:id/accept` - Accept bid (tender owner/admin only)
- `POST /api/bids/:id/reject` - Reject bid (tender owner/admin only)

### File Upload & Management
- `POST /api/upload` - Upload single file (authenticated users only)
- `POST /api/upload/multiple` - Upload multiple files (authenticated users only)
- `GET /api/upload/view/:filename` - View file inline in browser (public access)
- `GET /api/upload/download/:filename` - Download file as attachment (public access)
- `DELETE /api/upload/:filename` - Delete uploaded file (authenticated users only)

## User Roles

### Admin
- Full access to all endpoints
- Can manage users, categories, tenders, and bids
- Can view system statistics

### Buyer
- Can create and manage their own tenders
- Can view and manage bids on their tenders
- Can accept/reject bids

### Supplier
- Can view open tenders
- Can submit and manage their own bids
- Can view their bid statistics

## Sample Login Credentials

After running the seed script, you can use these credentials:

- **Admin**: admin@etendering.com / admin123
- **Buyer**: buyer@company.com / buyer123
- **Supplier**: supplier@vendor.com / supplier123

## Database Schema

### Users Table
- id, email, password, first_name, last_name
- company_name, phone, address, role
- is_verified, is_active, created_at, updated_at

### Categories Table
- id, name, description, is_active
- created_at, updated_at

### Tenders Table
- id, title, description, category_id
- budget_min, budget_max, deadline, status
- requirements, attachments, created_by
- created_at, updated_at

### Bids Table
- id, tender_id, supplier_id, amount
- proposal, attachments, status
- submitted_at, updated_at

## Security Features

- JWT token-based authentication
- Password hashing with bcryptjs
- Rate limiting to prevent abuse
- Input validation and sanitization
- CORS configuration
- Security headers with Helmet
- SQL injection prevention with parameterized queries

## Error Handling

- Centralized error handling middleware
- Comprehensive logging with Winston
- Detailed error messages in development
- Sanitized error responses in production

## Development

```bash
# Run in development mode with auto-reload
npm run dev

# Run database migration
npm run migrate

# Seed database with sample data
npm run seed
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Use a secure JWT secret
3. Configure proper database credentials
4. Set up SSL/TLS
5. Use a process manager like PM2
6. Configure reverse proxy (nginx)

## API Response Format

All API responses follow this format:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data here
  }
}
```

Error responses:

```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    // Validation errors (if any)
  ]
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
