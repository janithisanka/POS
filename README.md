# Bakery POS Modern

A modernized version of the Bakery Point of Sale management system, built with a secure PHP REST API backend and a modern Tailwind CSS frontend.

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Installation](#installation)
- [Migration from Old System](#migration-from-old-system)
- [API Documentation](#api-documentation)
- [Security Improvements](#security-improvements)
- [Project Structure](#project-structure)

## Features

### Core Business Functionality (Preserved from Original)

- **POS Billing**: Process sales with product grid, cart management, discounts, and receipt printing
- **Order Management**: Pre-orders and custom orders with advance payments
- **Product Management**: Products and brands with images, pricing, and special pricing after 7 PM
- **Inventory Management**:
  - Daily stock tracking for bakery products
  - Secondary stock items (packaging, supplies)
- **User Management**: Role-based access with positions/roles
- **Supplier Management**: Supplier details and payment tracking
- **Reports & Analytics**: Daily/monthly sales, stock reports, top products

### New Features & Improvements

- Modern, responsive UI with Tailwind CSS
- RESTful API architecture
- JWT-based authentication
- Password hashing with bcrypt (replacing weak SHA1)
- Prepared statements preventing SQL injection
- Input validation and sanitization
- CORS support
- Mobile-friendly design
- Real-time cart calculations
- Enhanced reporting with charts

## Technology Stack

### Backend
- PHP 7.4+
- MySQL 5.7+
- PDO with prepared statements
- JWT authentication

### Frontend
- HTML5 / CSS3
- Tailwind CSS (via CDN)
- Vanilla JavaScript (ES6+)
- Font Awesome icons

## Installation

### Requirements

- XAMPP (or Apache + PHP 7.4+ + MySQL)
- Web browser (Chrome, Firefox, Safari, Edge)

### Steps

1. **Copy the project folder**
   ```
   Copy BakeryPOS-Modern to /Applications/XAMPP/xamppfiles/htdocs/
   ```

2. **Create the database**
   ```bash
   # Open terminal and navigate to the database folder
   cd /Applications/XAMPP/xamppfiles/htdocs/BakeryPOS-Modern/database

   # Create database and tables
   mysql -u root < schema.sql
   ```

3. **Configure database connection**
   Edit `api/config/database.php` if needed:
   ```php
   private string $host = 'localhost';
   private string $port = '3306';
   private string $database = 'bakerypos_modern';
   private string $username = 'root';
   private string $password = '';
   ```

4. **Access the application**
   ```
   http://localhost/BakeryPOS-Modern/public/
   ```

5. **Default login**
   - Username: `admin`
   - Password: `password` (change immediately after first login)

## Migration from Old System

To migrate data from the old `posdb` database:

1. Ensure both databases exist:
   - Old: `posdb`
   - New: `bakerypos_modern`

2. Run the migration script:
   ```bash
   cd /Applications/XAMPP/xamppfiles/htdocs/BakeryPOS-Modern/database
   php migrate_data.php
   ```

3. **Important Notes**:
   - All user passwords will be reset to `password123`
   - Users must change their passwords after migration
   - Review migrated data for accuracy

## API Documentation

### Authentication

All API endpoints (except login) require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

### Endpoints

#### Auth
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout
- `POST /api/auth/change-password` - Change password

#### Products
- `GET /api/products` - List all products
- `GET /api/products/pos` - Get products for POS (with current prices)
- `GET /api/products/{id}` - Get single product
- `POST /api/products` - Create product
- `PUT /api/products/{id}` - Update product
- `DELETE /api/products/{id}` - Delete product

#### Brands
- `GET /api/brands` - List all brands
- `GET /api/brands/active` - Get active brands
- `POST /api/brands` - Create brand
- `PUT /api/brands/{id}` - Update brand
- `DELETE /api/brands/{id}` - Delete brand

#### Stock
- `GET /api/stock/current` - Get current stock
- `GET /api/stock/today` - Get today's stock entries
- `POST /api/stock/add` - Add stock
- `POST /api/stock/{id}/clear` - Clear stock balance
- `GET /api/stock/items` - Get stock items
- `POST /api/stock/items` - Create stock item

#### POS
- `GET /api/pos/items` - Get all items for POS
- `POST /api/pos/bills` - Create bill
- `GET /api/pos/bills` - Get bills
- `GET /api/pos/bills/{id}` - Get bill details

#### Orders
- `GET /api/orders` - List orders
- `GET /api/orders/pending` - Get pending orders
- `POST /api/orders` - Create order
- `PUT /api/orders/{id}/status` - Update status
- `POST /api/orders/{id}/payment` - Add payment

#### Users
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PUT /api/users/{id}` - Update user
- `POST /api/users/{id}/toggle-status` - Toggle active/inactive

#### Suppliers
- `GET /api/suppliers` - List suppliers
- `POST /api/suppliers` - Create supplier
- `POST /api/suppliers/{id}/payments` - Add payment

#### Reports
- `GET /api/reports/dashboard` - Dashboard summary
- `GET /api/reports/daily-sales` - Daily sales report
- `GET /api/reports/monthly-sales` - Monthly sales report
- `GET /api/reports/stock` - Stock report
- `GET /api/reports/top-products` - Top selling products

## Security Improvements

| Issue | Old System | New System |
|-------|-----------|------------|
| Password Hashing | SHA1 (weak) | bcrypt with cost 12 |
| SQL Injection | Vulnerable (string concatenation) | Prepared statements |
| Authentication | Session-based | JWT tokens |
| Input Validation | Limited | Comprehensive validation |
| XSS Prevention | None | HTML escaping |
| CSRF Protection | None | Token-based |
| Database Credentials | Hardcoded | Configurable |

## Project Structure

```
BakeryPOS-Modern/
├── api/
│   ├── config/
│   │   ├── config.php          # Application config
│   │   └── database.php        # Database connection
│   ├── controllers/
│   │   ├── AuthController.php
│   │   ├── ProductController.php
│   │   ├── BrandController.php
│   │   ├── StockController.php
│   │   ├── POSController.php
│   │   ├── OrderController.php
│   │   ├── UserController.php
│   │   ├── SupplierController.php
│   │   └── ReportController.php
│   ├── middleware/
│   │   ├── Auth.php            # JWT authentication
│   │   └── Cors.php            # CORS handling
│   ├── models/
│   │   ├── BaseModel.php       # Base CRUD operations
│   │   ├── User.php
│   │   ├── Product.php
│   │   ├── Brand.php
│   │   ├── Stock.php
│   │   ├── StockItem.php
│   │   ├── Bill.php
│   │   ├── Order.php
│   │   └── Supplier.php
│   ├── utils/
│   │   ├── Response.php        # API response helper
│   │   └── Validator.php       # Input validation
│   ├── .htaccess
│   └── index.php               # API router
├── database/
│   ├── schema.sql              # Database schema
│   └── migrate_data.php        # Migration script
├── public/
│   ├── css/
│   │   └── app.css            # Custom styles
│   ├── js/
│   │   ├── api.js             # API client
│   │   ├── utils.js           # Utility functions
│   │   ├── components.js      # UI components
│   │   ├── app.js             # Main application
│   │   └── pages/
│   │       ├── dashboard.js
│   │       ├── pos.js
│   │       ├── orders.js
│   │       ├── products.js
│   │       ├── stock.js
│   │       ├── users.js
│   │       ├── suppliers.js
│   │       └── reports.js
│   ├── images/
│   │   ├── brands/
│   │   ├── products/
│   │   └── users/
│   └── index.html             # Main application
└── README.md
```

## Business Logic Preserved

The following core business rules from the original system have been preserved:

1. **Special Pricing**: Products can have special pricing after 7 PM (Rs. 50 by default)
2. **Daily Stock Tracking**: Stock is tracked per product per day with balance calculations
3. **Stock Deduction**: When a bill is created, stock is automatically deducted
4. **Dual Stock System**: Primary products (bakery) and secondary items (supplies) handled separately
5. **Order Workflow**: Pending → In Progress → Ready → Completed
6. **Advance Payments**: Orders can have partial advance payments with balance tracking
7. **Bill/Receipt Generation**: Generates printable receipts with all details

## License

This project is a modernized version of the original Bakery POS system.

## Support

For issues and feature requests, please contact the development team.
