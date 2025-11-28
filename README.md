# 4D Analytics Inventory Management System

Enterprise-grade inventory management platform for complete lifecycle tracking from order creation through delivery, with comprehensive asset management and repair workflows.

## Overview

The 4D Analytics Inventory Management System provides end-to-end visibility and control over warehouse operations, including:

- **Order Management**: Create, track, and fulfill customer orders
- **Warehouse Operations**: Picking queues, dispatch workflows, and manifest generation
- **Stock Tracking**: Real-time inventory counts with barcode/QR scanning
- **Asset Management**: Complete device lifecycle tracking with repair and DOA workflows
- **DOA & RMA Processing**: Streamlined dead-on-arrival logging and supplier return management
- **Analytics & KPIs**: Performance metrics, SLA compliance, fault analysis, and operational dashboards
- **User Management**: Role-based access control with approval workflows
- **Offline Support**: Continue working without internet connectivity

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: Tailwind CSS + ShadCN UI Components
- **Backend**: Supabase (PostgreSQL)
- **Build Tool**: Vite
- **Authentication**: Supabase Auth with Row Level Security
- **Storage**: Supabase Storage for documents and images
- **Real-time**: Supabase Realtime for live updates

## Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- Supabase account with configured project

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd inventory-mangement-4d
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables (see Configuration section below)

4. Start the development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
```

## Configuration

Create a `.env.local` file in the project root with the following variables:

```ini
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Legacy Airtable Integration (Optional - if migrating from Airtable)
VITE_AIRTABLE_PAT=your_airtable_pat
VITE_AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
VITE_AIRTABLE_INVENTORY_TABLE_ID=tblXXXXXXXXXXXXXX
VITE_AIRTABLE_POINT_OF_PRESENCE_TABLE_ID=tblXXXXXXXXXXXXXX
VITE_AIRTABLE_BUSINESS_LINES_TABLE_ID=tblXXXXXXXXXXXXXX
VITE_AIRTABLE_UNIQUE_ORDERS_TABLE_ID=tblXXXXXXXXXXXXXX
VITE_AIRTABLE_ORDERS_TABLE_ID=tblXXXXXXXXXXXXXX

# N8N Webhooks (Order Automation)
VITE_N8N_SUBMIT_ORDER_WEBHOOK_URL=https://your-n8n-host/webhook/submit-order
VITE_N8N_ORDER_PLACED_WEBHOOK_URL=https://your-n8n-host/webhook/order-placed
```

## System Features

### Core Modules

1. **Stock Order**: Create and manage equipment orders with custom delivery addresses
2. **Picking Queue**: Warehouse picking workflows with business line filtering
3. **Dispatching Queue**: Order fulfillment and manifest generation with PDF export
4. **Stock Counts**: Mobile barcode scanning for inventory counts with fault tracking
5. **Asset Management**:
   - Device Registry with comprehensive tracking
   - Repair ticket management with 19 fault categories
   - DOA/Returns with RMA processing
   - Device movement tracking
6. **KPI Dashboard**: 8 comprehensive tabs with 30+ operational metrics
7. **User Management**: Role-based access control with approval workflows
8. **Point of Presence**: Technician roster and regional management
9. **Stock Administration**: Product catalog and inventory item management
10. **Stock Ingestion**: Batch device registration with barcode scanning
11. **Tracking**: Real-time shipment tracking with courier integration

### Key Capabilities

- **Barcode/QR Scanning**: Mobile camera and USB scanner support across all workflows
- **Business Line Management**: Cash Connect, ABSA, VPS, Accessories, Modems, Sim Management
- **Fault Tracking**: Intelligent fault auto-population from repair history
- **SLA Compliance**: Real-time monitoring with breach detection
- **Offline Mode**: Progressive Web App with offline capability
- **Data Integrity**: Exception monitoring for orphaned scans and duplicates
- **Audit Trail**: Comprehensive logging across all operations

## User Roles

- **Admin**: Full system access and configuration
- **Back Office**: Order management, asset tracking, and reporting
- **Picker**: Warehouse picking operations
- **Dispatcher**: Order fulfillment and shipping
- **Technician**: Field operations, stock counts, and repair logging
- **Field User**: Stock ordering and tracking

## Database Schema

The system uses Supabase PostgreSQL with the following core tables:

- `user_profiles`: User authentication and role management
- `inventory_items`: Product catalog and item master data
- `stock_levels`: Real-time inventory quantities by warehouse
- `stock_orders`: Order headers and delivery information
- `stock_order_items`: Order line items
- `stock_counts`: Inventory count records
- `stock_count_items`: Individual count line items
- `device_registry`: Asset tracking and serial number management
- `repair_tickets`: Fault tracking and repair workflows
- `device_movements`: Asset movement audit trail
- `point_of_presence`: Technician roster and regional assignments

## Deployment

### Production Build

```bash
npm run build
```

The build output will be in the `dist/` directory.

### Environment-Specific Builds

Ensure environment variables are properly configured for each deployment environment (development, staging, production).

### Hosting Recommendations

- **Vercel**: Zero-config deployment with automatic HTTPS
- **Netlify**: Continuous deployment with form handling
- **AWS S3 + CloudFront**: Enterprise-grade hosting with CDN
- **Custom Server**: Nginx/Apache with SSL certificate

## Support and Documentation

- **Product Documentation**: See `PRODUCT_DOCUMENTATION.md` for comprehensive feature documentation
- **API Documentation**: Supabase auto-generated API docs
- **Support**: Contact 4D Analytics support team

## Version History

- **v2.1** (November 28, 2024): Repair ticket management enhancements
  - Edit fault assessments
  - Technician repair logging
  - Intelligent fault auto-population
  - Assessment pending option
  - Repair history alerts

- **v2.0** (November 27, 2024): Business line dimensional analysis and exceptions monitoring
  - KPI Dashboard business line filtering
  - Exceptions tab for data integrity
  - DOA/RMA workflows
  - Fault analytics

## License

Proprietary software developed for 4D Analytics clients.

## Contact

**4D Analytics**
For technical support or inquiries, contact your account manager or support team.

---

*Last Updated: November 28, 2024*
