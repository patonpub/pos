# Tushop - Point of Sale & Inventory Management System

A comprehensive Point of Sale (POS) and inventory management system built with Next.js, Supabase, and TypeScript. Designed for small to medium businesses with role-based access control and optimized database performance.

## 🚀 Features

### Core Functionality
- **Inventory Management**: Add, edit, delete, and track products with stock levels, categories, and suppliers
- **Sales Processing**: Complete sales transactions with receipt generation and payment tracking
- **Purchase Management**: Track purchases and automatically update inventory
- **Supplier Management**: Maintain supplier information and relationships
- **Breakages Tracking**: Record damaged or lost inventory items
- **Debtors Management**: Track customer debts and payments (Owner only)

### Role-Based Access
- **Owner**: Full access to all features including financial reports, expenses, assets, and debtors
- **Employee**: Limited access to sales, inventory, purchases, and breakages

### Advanced Features
- **Real-time Dashboard**: Live statistics and low stock alerts
- **Optimized Performance**: Database-level aggregation for unlimited data handling (10-100x faster)
- **Date Filtering**: Filter all reports and statistics by date range
- **Reporting System**: Comprehensive sales, inventory, and financial reports with charts
- **Bulk Import**: Import products and sales via CSV/Excel files
- **Authentication**: Secure user authentication with Supabase and Row Level Security
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **UI Components**: Radix UI, Tailwind CSS
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts
- **Icons**: Lucide React

## 📋 Prerequisites

- Node.js 18+ or higher
- pnpm package manager (recommended) or npm
- A Supabase account (free tier available at https://supabase.com)

## 🚀 Quick Start

### 1. Extract the Project
After downloading the zip file, extract it to your desired location:
```bash
unzip tushop.zip
cd tushop
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory (you can copy from `.env.example`):
```bash
cp .env.example .env.local
```

Then edit `.env.local` and add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**To get your Supabase credentials:**
1. Create a free account at https://supabase.com
2. Create a new project
3. Go to Settings > API
4. Copy your Project URL and anon/public key

### 4. Database Setup

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **"New Query"**
4. Open the `database.sql` file from the project root folder
5. Copy and paste the **entire contents** into the SQL Editor
6. Click **"Run"** to execute the script

This will create all tables, functions, indexes, and triggers needed for the application.

**Optional:** Individual migration files are available in the `scripts/` folder for reference.

**For detailed setup:** See `/docs/supabase-setup.txt`

### 5. Create Your First User
1. In Supabase dashboard, go to Authentication > Users
2. Click "Create user" or "Invite user"
3. Enter email and password
4. Go to Table Editor > user_profiles
5. Change the role from "employee" to "owner" for your admin account

### 6. Build and Run the Application

First, build the application to ensure everything is set up correctly:
```bash
pnpm build
```

Then start the application:
```bash
pnpm start
```

Visit `http://localhost:3000` and log in with your credentials.

**Note:** The build step is recommended to catch any configuration issues early. For development with hot-reload, you can use `pnpm dev` instead of `pnpm start`.

## 📁 Project Structure

```
tushop/
├── app/                      # Next.js app directory (pages & routes)
│   ├── api/                 # API routes for bulk imports and seeding
│   ├── assets/              # Assets management page
│   ├── breakages/           # Breakages tracking page
│   ├── debtors/             # Debtors management page
│   ├── expenses/            # Expenses tracking page
│   ├── inventory/           # Inventory management page
│   ├── purchases/           # Purchase orders page
│   ├── reports/             # Reports and analytics page
│   ├── sales/               # Sales processing page
│   ├── suppliers/           # Supplier management page
│   ├── layout.tsx           # Root layout with auth
│   └── page.tsx             # Dashboard homepage
├── components/              # Reusable React components
│   ├── ui/                 # UI components (Shadcn/Radix UI)
│   ├── add-*.tsx           # Add/Create forms
│   ├── edit-*.tsx          # Edit forms
│   ├── dashboard-layout.tsx # Main layout with navigation
│   ├── date-filter.tsx     # Date range picker
│   └── inventory-import.tsx # CSV/Excel import
├── contexts/               # React Context providers
│   ├── auth-context.tsx    # Authentication state
│   └── date-filter-context.tsx # Date filtering state
├── hooks/                  # Custom React hooks
├── lib/                    # Utility libraries
│   ├── database.ts         # Database operations & queries
│   ├── database-types.ts   # TypeScript type definitions
│   ├── supabase.ts         # Supabase client configuration
│   ├── validation.ts       # Zod validation schemas
│   └── utils.ts            # Utility functions
├── scripts/                # Individual migration SQL files (for reference)
├── database.sql            # Complete database setup (run this file)
├── docs/                   # Documentation
│   ├── README.md           # Documentation index
│   ├── supabase-setup.txt  # Setup guide
│   ├── database-optimization.txt # Performance guide
│   ├── date-filter-integration.txt # Date filtering guide
│   └── demo-user-setup.txt # Demo user guide
├── .env.example            # Environment variables template
└── README.md               # This file
```

## 🗄️ Database Schema

The system uses the following main tables:
- **user_profiles**: User roles and authentication info
- **products**: Inventory items with stock tracking and supplier links
- **suppliers**: Vendor information and contact details
- **sales/sale_items**: Sales transactions with line items
- **purchases/purchase_items**: Purchase orders with line items
- **expenses**: Business expenses tracking (owner only)
- **assets**: Business assets management (owner only)
- **debtors/debtor_items**: Customer debts and payment tracking (owner only)
- **breakages**: Damaged/lost inventory tracking
- **daily_floats**: Daily cash register float tracking

### Database Functions (Optimized Performance)
- **get_dashboard_stats()**: Real-time dashboard metrics
- **get_report_stats()**: Report statistics
- **get_top_products()**: Best-selling products
- **get_sales_by_category()**: Category breakdown
- **get_sales_by_date()**: Daily sales trends

These functions perform aggregation at the database level for optimal performance with large datasets.

## 🔐 Authentication & Permissions

### User Roles
- **Owner**: Complete access to all features including finances, reports, expenses, assets, and debtors
- **Employee**: Limited to inventory, sales, purchases, and breakages (no financial access)

### Security Features
- Row Level Security (RLS) on all tables enforced at database level
- JWT-based authentication via Supabase Auth
- Role-based route protection with ProtectedRoute components
- Automatic user profile creation on signup
- Database-level permission enforcement (cannot be bypassed)

## 📊 Available Commands

```bash
# Recommended workflow
pnpm build        # Build for production (do this first)
pnpm start        # Start production server at http://localhost:3000

# Development (with hot-reload)
pnpm dev          # Start development server at http://localhost:3000

# Other commands
pnpm lint         # Run ESLint

# Alternative: Using npm
npm run build     # Build for production
npm run start     # Start production server
npm run dev       # Start development server

# Database
# No CLI commands - run database.sql via Supabase dashboard SQL Editor
```

**Important:**
- Always run `pnpm build` first to verify your setup is correct before starting the server
- Use the single `database.sql` file for database setup (not individual migration files)

## 🔧 Configuration

### Environment Variables
Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL (from Supabase dashboard > Settings > API)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous/public key

### Customization Options
- **Product Categories**: Edit category options in `components/add-product-form.tsx` and `components/edit-product-form.tsx`
- **Units of Measurement**: Modify unit options in product form components
- **Payment Methods**: Update payment method options in sales forms
- **Expense Categories**: Customize categories in `components/add-expense-form.tsx`
- **Date Ranges**: Adjust default date ranges in `contexts/date-filter-context.tsx`

### Performance Optimization
The app uses database-level aggregation functions for optimal performance:
- Handles unlimited records without row limits
- 10-100x faster than client-side aggregation
- See `/docs/database-optimization.txt` for technical details

## 📱 Usage Guide

### For Owners
1. **Dashboard**: View real-time business metrics, sales statistics, and low stock alerts
2. **Inventory**: Manage products, stock levels, categories, and bulk import via CSV/Excel
3. **Sales**: Process transactions, track payments (cash/M-Pesa), and view sales history
4. **Purchases**: Create purchase orders, receive inventory, and auto-update stock
5. **Suppliers**: Maintain supplier contacts and relationships
6. **Reports**: Generate sales reports with charts, filter by date range, export data
7. **Expenses**: Track business expenses by category (owner only)
8. **Assets**: Manage business assets and depreciation (owner only)
9. **Debtors**: Track customer debts and manage payments (owner only)
10. **Breakages**: Record damaged or lost inventory

### For Employees
1. **Sales Processing**: Complete sales transactions and generate receipts
2. **Inventory Management**: Add/edit products, update stock levels
3. **Purchase Orders**: Create and receive purchase orders
4. **Breakages**: Record damaged or lost items
5. **Basic Dashboard**: View sales and inventory overview

## 📖 Documentation

Comprehensive documentation is available in the `/docs/` folder:

- **[README.md](/docs/README.md)**: Documentation index and quick reference
- **[supabase-setup.txt](/docs/supabase-setup.txt)**: Complete Supabase setup guide
- **[database-optimization.txt](/docs/database-optimization.txt)**: Performance optimization details
- **[date-filter-integration.txt](/docs/date-filter-integration.txt)**: Date filtering implementation

## 🐛 Troubleshooting

### Common Issues

**"Missing Supabase environment variables" error:**
- Ensure `.env.local` exists with correct credentials
- Restart the development server after creating/modifying `.env.local`
- Verify credentials in Supabase dashboard > Settings > API

**Build fails during "Collecting page data":**
- This is fixed in the current version with dynamic route configuration
- If you encounter this, ensure all API routes have `export const dynamic = 'force-dynamic'`

**Login not working:**
- Verify Supabase URL and anon key are correct
- Check that user exists in Supabase dashboard > Authentication > Users
- Ensure user_profiles table has a matching entry with correct role

**Data not showing:**
- Check Row Level Security (RLS) policies in Supabase
- Verify user is authenticated (check browser console for errors)
- Ensure migrations ran successfully in correct order

**Performance issues with large datasets:**
- The app uses optimized database functions (migration 017)
- Ensure migration `017_add_stats_functions.sql` was executed
- Check `/docs/database-optimization.txt` for details

## 📝 License

This software is licensed under a commercial license. By purchasing and using this software, you agree to the terms outlined in the `LICENSE.txt` file included with this project.

**Key Terms:**
- ✅ You may use, modify, and integrate this software into a single End Product (website, web app, or mobile app)
- ✅ You may use the End Product for personal or commercial purposes, including projects that generate revenue
- ✅ Full modification rights - create derivative works as needed
- ❌ You may not distribute, sell, or share the source code as a standalone product or template
- ❌ You may not create competing products or templates for sale using this software

**No Attribution Required** - You may remove all references to the original author from your End Product.

For complete licensing terms, please refer to the `LICENSE.txt` file.

## 🆘 Support

For support and questions:
1. Check the `/docs/` folder for detailed guides
2. Review this README and troubleshooting section
3. Verify your Supabase configuration
4. Contact support with your purchase details

## ✨ Features Roadmap

Future enhancements under consideration:
- Multi-store support
- Barcode scanning
- Receipt printing customization
- SMS notifications for low stock
- Multi-currency support
- Advanced reporting and analytics
- Mobile app (iOS/Android)

---

**Built with ❤️ for small businesses | Powered by Next.js & Supabase**