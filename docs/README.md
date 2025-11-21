# Tushop Documentation

Technical documentation for the Tushop POS application.

## Contents

### [Supabase Setup](./supabase-setup.txt)
Complete guide to setting up Supabase authentication and database for the application.

**Key Topics:**
- Creating and configuring a Supabase project
- Setting up environment variables
- Database schema initialization
- User roles (Owner/Employee) and permissions
- Row Level Security (RLS) configuration
- First account creation

### [Database Optimization](./database-optimization.txt)
Implementation details for high-performance database operations using server-side aggregation.

**Key Topics:**
- Database-level aggregation functions (5 core functions)
- Performance benefits (10-100x faster than client-side aggregation)
- Migration file: `018_add_stats_functions.sql`
- Usage examples for dashboard and reports
- Technical implementation using CTEs
- Performance comparison and troubleshooting

### [Date Filter Integration](./date-filter-integration.txt)
How the date filtering system integrates with optimized database functions.

**Key Topics:**
- Date format conversion flow (YYYY-MM-DD to ISO timestamps)
- DateFilterContext API and usage patterns
- Integration with optimized database functions
- Common date range patterns (today, last 7 days, current month, etc.)
- Timezone handling
- Testing and backwards compatibility

## Quick Reference

### Database Functions
```typescript
// Dashboard stats
getDashboardStatsOptimized(startDate?, endDate?)

// Report stats
getReportStatsOptimized(startDate?, endDate?)
getTopProductsOptimized(startDate?, endDate?, limit)
getSalesByCategoryOptimized(startDate?, endDate?)
getSalesByDateOptimized(startDate?, endDate?)
```

### User Roles
- **Owner**: Full access to all features
- **Employee**: Limited access (no suppliers, expenses, assets, debtors, reports)

### Database Setup
- **`database.sql`** (root folder) - Complete database setup script
- `scripts/` folder - Individual migration files for reference

## Getting Started

1. Follow [Supabase Setup](./supabase-setup.txt) to configure your database
2. Run the `database.sql` file in Supabase SQL Editor
3. Create your first owner account via Supabase dashboard

## Architecture Notes

The application uses:
- **Next.js** for the frontend framework
- **Supabase** for authentication and database (PostgreSQL)
- **Database-level aggregation** for optimal performance with large datasets
- **Row Level Security (RLS)** for data protection and role-based access
- **Server-side functions** to eliminate client-side data processing
