# 4D Analytics Inventory Management System
## Complete Product Documentation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [User Stories](#user-stories)
3. [App Modules](#app-modules)
4. [Backend Integrations & Storage](#backend-integrations--storage)
5. [User Roles & Permissions](#user-roles--permissions)
6. [Business Rules & Validation](#business-rules--validation)
7. [Technical Architecture](#technical-architecture)

---

## Executive Summary

The **4D Analytics Inventory Management System** is a comprehensive web-based platform designed to manage the complete lifecycle of inventory operations. From order creation through picking, dispatching, and delivery tracking, the system provides end-to-end visibility and control over warehouse operations.

### Key Capabilities

- **Order Management**: Create, track, and fulfill customer orders
- **Warehouse Operations**: Picking queues, dispatch workflows, and manifest generation
- **Stock Tracking**: Real-time inventory counts with barcode/QR scanning
- **Asset Management**: Complete device lifecycle tracking with repair and DOA workflows
- **DOA & RMA Processing**: Streamlined dead-on-arrival logging and supplier return management
- **Analytics & KPIs**: Performance metrics, SLA compliance, fault analysis, and operational dashboards with business line filtering
- **User Management**: Role-based access control with approval workflows
- **Offline Support**: Continue working without internet connectivity

### Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: Tailwind CSS + ShadCN UI Components
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Automation**: N8N Workflow Webhooks
- **State Management**: TanStack React Query with offline persistence

---

## User Stories

### Field Operations

#### Stock Order Management

**As a field technician**, I want to:
- Create orders for equipment I need in the field
- Select from multiple product categories (Cash Connect, ABSA, VPS, Modems, Accessories)
- Specify delivery location and recipient details
- Track my order status from creation to delivery
- Receive order confirmation with an order number (e.g., ORD-0042)

**As a regional manager**, I want to:
- Place orders on behalf of technicians in my region
- Order equipment for regional warehouses
- View order history for my region
- Monitor order fulfillment rates

**As a non-technician staff member**, I want to:
- Order equipment with custom delivery addresses
- Provide recipient contact information
- Track orders to my specified location

#### Stock Counting

**As a warehouse staff member**, I want to:
- Perform daily, mid-month, or monthly stock counts
- Scan barcodes/QR codes using USB scanners
- Record item quantities and conditions
- Capture serial numbers for serialised equipment
- Submit counts that automatically update inventory levels

**As a technician**, I want to:
- Count stock at my location
- Report faulty or damaged equipment during stock counts
- Use "Assessment Pending" as a fault reason when the device hasn't been fully diagnosed yet
- Perform stock counts even before completing fault assessments
- Have fault reasons auto-populated from previous repair tickets when scanning known devices
- See repair history alerts when scanning devices with existing repair tickets
- Record serial numbers for audit purposes
- View my count history

**As an admin**, I want to:
- View all stock counts across all users
- Filter counts by user, period, or count type
- Export stock count reports for auditing
- Monitor inventory accuracy across locations

#### Asset Management & DOA Processing

**As a warehouse receiving clerk**, I want to:
- Quickly log DOA (Dead on Arrival) devices when receiving stock
- Select the appropriate business line for scanning workflow
- Scan QR codes for Cash Connect devices automatically
- Scan individual serial numbers for ABSA/VPS/Accessories devices
- Use my phone camera or USB scanner for serial capture
- Record supplier information and purchase order details
- Capture the date received and fault description
- Have the system automatically create a repair ticket and mark device as faulty

**As a back office staff member**, I want to:
- View all DOA devices in one place
- Search for specific devices by serial number
- Filter DOA devices by RMA status
- Initiate RMA (Return Merchandise Authorization) processes with suppliers
- Track RMA numbers and expected resolution dates
- Add supplier communication notes
- Monitor RMA status progression (Pending → Shipped → Received → Resolved)

**As a repair technician**, I want to:
- View all repair tickets organized by status
- See detailed fault information including DOA flags
- Track which devices are with suppliers for RMA
- Update repair status as I work through tickets
- Access device history and previous repair records
- Log new repair tickets directly when I encounter faulty devices
- Edit fault assessments when devices are diagnosed
- Update fault categories and descriptions after initial triage

**As an operations manager**, I want to:
- View fault analytics and repair metrics on the KPI dashboard
- Identify top fault categories for resource planning
- Monitor DOA rates by supplier and business line
- Track repair resolution rates and times
- Use fault data to negotiate with suppliers
- Plan repair resource allocation based on fault volume

### Warehouse Operations

#### Picking Queue

**As a warehouse picker**, I want to:
- See all orders waiting to be picked
- Filter orders by business line (Cash Connect, ABSA, etc.)
- View order details before starting to pick
- See color-coded status indicators (Not Picked, Pending, Partially Picked, Picked)

**As a warehouse supervisor**, I want to:
- Monitor picking queue depth
- Identify bottlenecks in the picking process
- Track pick status across all orders

#### Picking Cart

**As a warehouse picker**, I want to:
- Open an order and see all items to be picked
- View product images and descriptions
- Record which items I've picked and quantities
- Capture serial numbers for serialised items (Terminal, Cradle, Charger, Cash Connect)
- Note stock availability issues
- Record packer details
- Mark items as "Picked in full", "Partially picked", or "Not picked"

**As a quality controller**, I want to:
- Verify items match the order requirements
- Scan item codes to validate against order
- Ensure serial numbers are correctly recorded

#### Dispatch Queue

**As a logistics coordinator**, I want to:
- View all picked orders ready for dispatch
- Filter by business line
- See both pick and dispatch statuses
- Prioritize orders based on urgency

#### Dispatch Cart

**As a dispatcher**, I want to:
- View the complete picked order with serial numbers
- Select dispatch method (Courier, In-house Delivery, Pickup, etc.)
- Record waybill numbers
- Add package references for tracking
- Generate and download PDF manifests
- Mark orders as dispatched

**As a shipping manager**, I want to:
- Track dispatch completion rates
- Monitor courier assignments
- View waybill numbers for tracking

### Analytics & Reporting

#### KPI Dashboard

**As an operations manager**, I want to:
- View real-time order fulfillment metrics
- Monitor SLA compliance rates
- Track cycle times (order to dispatch)
- See stock availability distribution
- Analyze aging orders (< 24h, 24-48h, 48-72h, > 72h)
- View queue depths for picking and dispatch

**As a warehouse manager**, I want to:
- Monitor device health rates
- View stock alert counts (Out of Stock, Critical, Warning)
- Analyze fault patterns
- Track orders by region and contractor

**As an executive**, I want to:
- See high-level fulfillment rates
- Monitor SLA breach percentages
- View monthly and yearly trends
- Compare performance across business lines

#### Stock Counts Report

**As an auditor**, I want to:
- View historical stock count records
- Filter by count type, period, and user
- Search for specific devices or items
- Export data for analysis
- Verify count accuracy

### Administration

#### User Management

**As an admin**, I want to:
- View all registered users
- Approve pending user registrations
- Reject unauthorized users
- Assign roles (Admin, Back Office, User)
- Revoke access from former employees

**As a new user**, I want to:
- Register with my email and password
- Understand that I need admin approval
- See my pending status while waiting for approval
- Access the system once approved

### System Features

#### Offline Support

**As a field user**, I want to:
- Continue using the app when I have no internet
- See cached data from previous sessions
- Have my actions queued for when I'm back online
- See a clear indicator when I'm offline

#### Barcode Scanning

**As a warehouse staff member**, I want to:
- Use my device camera to scan barcodes and QR codes
- Have scanned data automatically populate forms
- Switch between front and back cameras
- See a scanning overlay for accurate positioning

---

## App Modules

### 1. Landing Page (Home Dashboard)

**Purpose**: Central hub for navigating to all system modules

**Features**:
- Welcome message with user name
- Two organized sections:
  - **Field Operations**: Stock Order, Stock Counts, Asset Management (Active), Tracking
  - **Admin Workspace**: Picking Queue, Dispatching Queue, Point of Presence, Stock Alerts
- Status badges showing Active/Coming Soon features
- Quick access to KPI Dashboard and Exceptions Dashboard
- Theme toggle (Light/Dark mode)
- Responsive grid layout
- Role-based navigation (shows appropriate modules based on user role)

**Navigation Path**: `/`

---

### 2. Stock Order Module

**Purpose**: Create and manage equipment orders

**Features**:
- **Order Creation Form**:
  - Date picker for order date
  - Item category and nature selection
  - Delivery party selection (Technician, Regional Warehouse, Non-Technician)
  - Dynamic form fields based on delivery party:
    - Technician: Contractor, Region, Technician selection
    - Regional Warehouse: Region selection
    - Non-Technician: Direct contact info

- **Shopping Cart**:
  - Add multiple items to order
  - Set quantities per item
  - View cart summary
  - Remove items from cart

- **Product Search**:
  - Search by item name or code
  - Filter by category
  - View product images and descriptions

- **Order Submission**:
  - Validation of all required fields
  - Email validation for contacts
  - Confirmation with order number
  - N8N webhook trigger for processing

**Navigation Path**: `/stock-order`

---

### 3. Picking Module

#### 3a. Picking Queue

**Purpose**: View and manage orders awaiting picking

**Features**:
- Queue display organized by business line
- Filter by business line (Cash Connect, ABSA, VPS, etc.)
- Sort by order date and quantity
- Color-coded status badges:
  - Red: Not Picked
  - Amber: Pending / Partially Picked
  - Green: Picked
- Collapsible order details
- Quick action buttons to enter picking cart
- Order count and total quantities

**Navigation Path**: `/picking`

#### 3b. Picking Cart

**Purpose**: Detailed interface for picking individual orders

**Features**:
- **Order Header**:
  - Order number and date
  - Delivery party and recipient info
  - Total items to pick
  - Progress bar showing completion

- **Line Item Display**:
  - Device type with images
  - Quantity ordered vs. quantity to pick
  - Item code and description
  - Stock availability indicator

- **Item Picking Dialog**:
  - Stock availability selection
  - Pick status (Picked in full, Partially picked, Not picked)
  - Quantity picked
  - Serial number capture:
    - Terminal Serial Number
    - Cradle Serial Number
    - Charger Serial Number
    - Cash Connect Serial Number
  - Packing details (Charger packed, Cables)
  - Packer name/ID

- **Item Validation**:
  - Scan item code to verify match
  - Case-insensitive matching
  - Error messages for mismatches

- **Actions**:
  - Submit picking data
  - Remove/undo picked items
  - Cancel and return to queue

**Navigation Path**: `/picking/cart/:recordId`

---

### 4. Dispatching Module

#### 4a. Dispatch Queue

**Purpose**: Queue of orders ready for dispatch after picking

**Features**:
- Similar layout to Picking Queue
- Shows both pick and dispatch statuses
- Filters for ready-to-dispatch orders
- Organized by business line
- Quick navigation to dispatch carts

**Navigation Path**: `/dispatching`

#### 4b. Dispatch Cart

**Purpose**: Detailed interface for dispatching picked orders

**Features**:
- **Order Manifest Display**:
  - All picked items with serial numbers
  - Quantity and availability info
  - Product images

- **Dispatch Entry**:
  - Dispatch method selection:
    - Courier
    - In-house Delivery
    - Pickup
    - Collection
    - Other
  - Waybill number (required for most methods)
  - Dispatcher name
  - Package reference(s)
  - Dispatch notes

- **Package Management**:
  - Single package mode (one reference for all items)
  - Multiple packages mode (comma-separated references)
  - Complete dispatch toggle

- **PDF Manifest Generation**:
  - Download order manifest
  - Includes customer info, items, serials
  - Print-ready format

- **Status Updates**:
  - Mark items as dispatched
  - Update dispatch status in system
  - Trigger N8N notifications

**Navigation Path**: `/dispatching/cart/:recordId`

---

### 5. Stock Counts Module

**Purpose**: Capture inventory counts with audit trails

**Features**:
- **Count Configuration**:
  - Count type selection (Monthly, Mid-Month, Daily)
  - Stock holder identification
  - Location/warehouse name

- **Item Entry**:
  - Item category filter
  - Item code input (manual or scanned)
  - Device type and description
  - Quantity counting
  - Item nature (Serialised/Non-serialised)

- **Barcode Scanning**:
  - Camera-based QR/barcode scanning
  - Multiple camera support
  - Cash Connect serial extraction from QR codes
  - Auto-population of item codes

- **Serial Number Capture** (for Serialised items):
  - Manufacture Serial Number
  - QR Code Serial Number
  - Xlink Serial Number
  - Cradle Serial Number
  - Charger Serial Number

- **Item Condition Tracking**:
  - Item status (Functional, Faulty)
  - Overall condition (New, Good, Fair, Poor)
  - Auto-default to "Faulty" when item status is "Faulty"

- **Intelligent Fault Tracking (NEW)**:
  - **Assessment Pending option**: Allows stock counts before full device diagnosis
  - **Auto-populated fault reasons**: System queries repair ticket history when scanning a device
  - **Repair history alerts**: Shows previous fault category and description for known devices
  - **18 predefined fault reasons** matching repair ticket categories for consistency
  - Reduces manual data entry and improves fault categorization accuracy

- **Count Items Table**:
  - List of all counted items
  - Edit and delete functionality
  - Serial number display

- **Duplicate Prevention**:
  - Validation against existing serial numbers
  - Category-specific duplicate rules
  - Clear error messages

- **User Tracking**:
  - Automatic capture of user email
  - Count period calculation
  - Historical record keeping

**Navigation Path**: `/stock-counts`

---

### 6. Stock Counts Report

**Purpose**: View and analyze stock count history

**Features**:
- **Filtering Options**:
  - Count type (Monthly, Mid-Month, Daily, All)
  - Count period selection
  - User who performed count
  - Search by device type or description

- **Results Display**:
  - Sortable data table
  - Columns: Date, Stock Holder, Device, Item Code, Quantity, Status, User
  - Badge-based status indicators
  - Pagination for large datasets

- **Export Functionality**:
  - Download report to CSV
  - Full filtered dataset

- **Role-Based Access**:
  - Admins see all counts
  - Users see only their own counts

**Navigation Path**: `/stock-counts-report`

---

### 7. KPI Dashboard

**Purpose**: Comprehensive metrics tracking and performance monitoring with business intelligence

**Features**:

#### Multi-Tab Dashboard Organization

**Overview Tab**:
- High-level operational metrics
- Order fulfillment summary
- Real-time queue status
- SLA compliance overview

**Orders Tab**:
- Detailed order lifecycle metrics
- Business line performance comparison
- Cycle time analysis by business line
- Fulfillment rate tracking

**Stock Tab**:
- Inventory availability metrics
- Stock alert monitoring
- Fill rate calculations
- Warehouse-level stock status

**Repairs Tab** (NEW):
- **Fault Analysis Metrics**:
  - Total faults count
  - Active faults (Reported, Assessing, In-Repair, Quality-Check)
  - Resolved faults (Repaired, Returned)
  - Resolution rate percentage

- **Fault Categories Visualization**:
  - 18 fault categories with color-coded progress bars
  - Top fault categories highlighted
  - Fault count and percentage distribution

- **Resource Planning Recommendations**:
  - Top 3 fault categories identified
  - Priority levels (High/Medium/Low) based on fault volume
  - Resource allocation suggestions
  - Repair workflow optimization insights

#### Order Lifecycle Metrics
- Total orders count
- Dispatched orders (count and percentage)
- Partial orders (count and percentage)
- Pending orders (count and percentage)
- Cancelled orders (count and percentage)
- Fulfillment rate calculation

#### Business Line Performance (NEW)
- **Business Line Filter**:
  - Filter all metrics by specific business line
  - Options: All, Cash Connect, ABSA, VPS, Accessories, Modems, Sim Management
  - Real-time metric updates on selection

- **Business Line Breakdown**:
  - Total orders per business line
  - Dispatched vs pending comparison
  - Fulfillment rates per business line
  - Performance comparison visualization

#### Cycle Time Analysis
- Average cycle time in hours
- Order to dispatch duration
- Breakdown by business line
- Time-to-fulfillment trends

#### SLA Compliance
- SLA rules:
  - Orders before 12 PM: Same day completion required
  - Orders after 12 PM: 3 PM next day completion required
- SLA breach count
- Compliance rate percentage
- Aging buckets (< 24h, 24-48h, 48-72h, > 72h)

#### Stock Availability Metrics
- Available items percentage
- Not available percentage
- Backordered percentage
- Partial stock percentage
- Stock out rate
- Fill rate calculation

#### Pick Status Analysis
- Picked in full count
- Partially picked count
- Pending picks count
- Not picked count

#### Queue Management
- Picking queue depth
- Dispatch queue depth
- Bottleneck identification

#### Device Health Metrics
- Total devices in system
- Functional devices count
- Faulty devices count
- Device health rate
- Fault reason breakdown

#### Stock Alert System
- Out of stock alerts (0 units)
- Critical alerts (1-5 units or ≤3 days stock)
- Warning alerts (6-10 units or ≤7 days stock)
- Velocity-based intelligent thresholds
- Alert aggregation by item/warehouse

#### Operational Distribution
- Orders by region
- Orders by contractor
- Orders by dispatch method
- Orders by warehouse

#### Business Line Dimensional Analysis (NEW)
- **Integrated across all tabs** for complete dimensional view:
  - **Overview Tab**: Business line order fulfillment comparison
  - **Pipeline Tab**: Pending orders breakdown by business line
  - **Devices Tab**: Stock distribution and health by business line
  - **Repairs Tab**: Note on future enhancement for business line fault analysis
- **Compact visualizations** showing:
  - Order volumes per business line
  - Fulfillment rates comparison
  - Stock health rates per business line
  - Device inventory distribution
- Only shown when "All Business Lines" filter is selected

#### Exceptions Tab (NEW)
- **Data Integrity Monitoring**:
  - **Orphaned Stock Count Serials**: Devices scanned in stock counts but not found in device registry
  - **Duplicate Serial Numbers**: Serial numbers appearing multiple times in device registry
  - Total exception count with badge notification
- **Exception Details**:
  - Serial number
  - Location and user who scanned
  - Scan date
  - Visual highlighting for priority
- **Use Cases**:
  - Identify devices needing ingestion after stock counts
  - Detect data entry errors
  - Maintain registry data integrity
  - Operational discrepancy tracking

#### Filtering Options
- Year selection
- Month selection
- All-time view
- Business line filter (Cash Connect, ABSA, VPS, Accessories, Modems, Sim Management)
- Auto-refresh capability

**Navigation Path**: `/kpi`

---

### 8. User Management (Admin Only)

**Purpose**: Manage user access and roles

**Features**:
- **User List Display**:
  - All registered users
  - Filter by status (All, Pending, Approved, Rejected)
  - User details card layout

- **User Information**:
  - Full name and email
  - Current role
  - Approval status
  - Join date
  - Approval timestamp and approver

- **Admin Actions**:
  - Approve pending users
  - Reject unauthorized users
  - Revoke access from approved users
  - Change user roles (Admin, Back Office, User)

- **Role Assignment**:
  - Admin: Full system access
  - Back Office: Operations access
  - User: Standard access

- **Notifications**:
  - Toast messages for action confirmations
  - Badge indicators for pending approvals

**Navigation Path**: `/admin/users`

---

### 9. Asset Management Module

**Purpose**: Complete device lifecycle tracking with repair and DOA management

**Features**:

#### Device Registry Tab
- Comprehensive device tracking with serial numbers
- Device status management (Available, In Use, Faulty, In Repair, etc.)
- Device type categorization by business line
- Serial number search and filtering
- Device history and audit trail

#### Repairs Tab
- **Complete repair ticket workflow**:
  - Reported → Assessing → In-Repair → Quality-Check → Repaired → Returned

- **Log Repair Ticket (ENHANCED)**:
  - Accessible to all users (technicians and back office staff)
  - **Business line selection** (Cash Connect, ABSA, VPS, Accessories, Modems)
  - **Mobile camera barcode scanning** with BarcodeScanner component
  - **Business line-specific scanning workflows**:
    - **Cash Connect**: QR code parsing with comma-counting logic
    - **Other lines**: Multiple serial fields (Manufacture, Xlink, Cradle, Charger)
  - **Camera scan buttons** on all serial input fields with Camera icon
  - **USB scanner optimizations** (7 input attributes for seamless scanning)
  - **Item status and overall condition** capture (Functional/Faulty, New/Good/Fair/Poor)
  - Real-time device validation (green for found, red for not found)
  - Fault category dropdown with 19 predefined categories
  - Optional fault severity selection (Low, Medium, High, Critical)
  - Fault description text area
  - Auto-populated reporter from authenticated user
  - **Complete uniformity** with Stock Counts scanning workflow

- **Edit Fault Assessment (NEW)**:
  - Edit existing repair tickets
  - Update fault category after diagnosis
  - Modify fault description
  - Add assessment notes
  - Available to all users for collaborative fault assessment

- **18+ fault categories** including:
  - Dead On Arrival
  - Screen Damaged
  - Battery Issues
  - Power Button Faulty
  - Keypad Not Working
  - Camera Faulty
  - Speaker/Microphone Issues
  - Charging Port Damaged
  - Software Malfunction
  - Network/Connectivity Issues
  - Printer Not Working
  - Card Reader Faulty
  - Touch Screen Not Responsive
  - Physical Damage
  - Water Damage
  - Overheating
  - Assessment Pending (NEW - for devices requiring further diagnosis)
  - Other

- **Repair ticket features**:
  - Fault description capture
  - Repair assessment notes
  - Status tracking and updates
  - Technician assignment
  - Repair metrics and analytics

#### DOA/Returns Tab
- **Summary Cards**:
  - Total DOA devices count
  - RMA status breakdown (Pending, Shipped, Received, Resolved)

- **Log DOA Device Workflow**:
  - Business line selection (Cash Connect, ABSA, VPS, Accessories, Modems)
  - Business line-specific scanning:
    - **Cash Connect**: QR code parsing (comma-separated format)
    - **Other lines**: Individual serial fields (Manufacture, Xlink, Cradle, Charger)
  - Mobile camera scanning with barcode/QR support
  - USB scanner optimization (auto-complete disabled, auto-select on focus)
  - Supplier and purchase order capture
  - Date received tracking
  - Fault description entry
  - Automatic device status update to "Faulty"
  - Creates repair ticket with "Dead On Arrival" category

- **RMA Initiation**:
  - RMA number assignment
  - RMA date tracking
  - Expected resolution date
  - Supplier notes and communication tracking
  - RMA status progression:
    - Pending → Shipped → Received by Supplier → Replaced/Refunded/Rejected

- **Device Search & Filtering**:
  - Search by serial number
  - Filter by RMA status
  - Searchable table with all DOA devices
  - View complete DOA history

#### Movements Tab
- Device location tracking
- Movement history and audit trail
- Transfer records between locations
- Assignment to technicians or warehouses

#### Installations Tab
- **End-of-Lifecycle Management**: Record the final installation of devices at customer sites.
- **Scanning Integration**: Barcode scanning to quickly identify devices for installation.
- **Status Updates**: Automatically updates device status to 'Installed' and holder to 'Customer'.
- **Movement Logging**: Creates an audit trail of the installation movement.
- **History View**: View a log of recent installations.

**Scanning Consistency**:
All scanning workflows use identical patterns:
- Cash Connect: QR code parsing with comma-counting logic
- Other Business Lines: Manufacture + Xlink + Cradle + Charger serial capture
- USB Scanner Optimizations: 7 input attributes for optimal scanning
- Mobile Camera Support: BarcodeScanner component integration

**Navigation Path**: `/asset-management`

---

### 10. Tracking Module

**Purpose**: Monitor shipments and delivery milestones with courier integration

**Features**:
- **Real-time Shipment Tracking**:
  - Collivery API integration for courier tracking
  - Waybill number search and validation
  - Delivery status updates
  - ETA calculations

- **Timeline Visualization**:
  - Order lifecycle timeline
  - Key milestone tracking (Ordered → Picked → Dispatched → In Transit → Delivered)
  - Status color coding
  - Timestamp tracking for all events

- **Order Search & Filtering**:
  - Search by order ID or waybill number
  - Filter by delivery status
  - Filter by date range
  - Multiple order tracking

- **Delivery Details**:
  - Recipient information display
  - Delivery address tracking
  - Courier service details
  - Package references

**Navigation Path**: `/tracking`

---

### 11. Point of Presence Module

**Purpose**: Technician roster and regional management

**Features**:
- **Technician Directory**:
  - Complete technician roster
  - Search by name, ID, or contractor
  - Filter by region
  - Contact information management

- **Regional Assignments**:
  - Technician-to-region mapping
  - Contractor company associations
  - Regional coverage visualization
  - Service area management

- **Contact Management**:
  - Email addresses
  - Phone numbers
  - Physical addresses
  - GPS coordinates (latitude/longitude)

- **Data Import/Export**:
  - Bulk technician import
  - CSV export functionality
  - Data validation
  - Duplicate prevention

**Navigation Path**: `/point-of-presence`

---

### 12. Stock Ingestion Module

**Purpose**: Register new devices into inventory with batch processing

**Features**:
- **Batch Information**:
  - Receiving warehouse selection
  - Supplier information
  - Purchase order number tracking
  - Date received capture
  - Batch notes and documentation

- **Device Entry**:
  - Business line selection
  - Device type gallery selection
  - Item nature (Serialised/Non-serialised)
  - Serial number entry with validation
  - Cradle and charger serial capture

- **Serial Number Processing**:
  - Cash Connect QR code parsing
  - Duplicate serial detection
  - Real-time validation
  - Bulk paste support (multiple serials)
  - Auto-focus for rapid entry

- **Batch Processing**:
  - Process up to 4000+ devices per batch
  - 100-device sub-batches for API optimization
  - Progress tracking with percentage
  - Success/failure count reporting
  - Automatic movement record creation

- **USB Scanner Optimization**:
  - 7 input attributes for seamless scanning
  - Auto-select on focus
  - No autocomplete interference

**Navigation Path**: `/stock-ingestion`

---

### 13. Product Catalog (Stock Admin)

**Purpose**: Manage inventory item master data

**Features**:
- **Item Management**:
  - Add new inventory items
  - Edit existing item details
  - Delete unused items
  - Item activation/deactivation

- **Item Details**:
  - Item name and description
  - Item code assignment
  - Business line categorization
  - Item nature (Serialised/Non-serialised)
  - Product images and URLs

- **Bulk Operations**:
  - Import items from CSV
  - Export catalog to CSV
  - Batch updates
  - Data validation

**Navigation Path**: `/stock-admin`

---

### 14. System Completeness

**Feature Implementation Status**: 24/24 modules fully implemented (100% complete)

All planned features have been successfully implemented:
- ✅ Order management workflow (Stock Order, Picking, Dispatch, Tracking)
- ✅ Asset Management with 4 integrated tabs (Registry, Repairs, DOA/Returns, Movements)
- ✅ KPI Dashboard with 8 comprehensive tabs including Business Line Analysis and Exceptions
- ✅ Point of Presence (technician roster management)
- ✅ Stock Administration and Ingestion
- ✅ User Management and Authentication

**Recent Enhancements**:
- **Business Line Dimensional Analysis**: Integrated across Overview, Pipeline, and Devices tabs in KPI Dashboard
- **Exceptions Tab**: Real-time data integrity monitoring for orphaned scans and duplicate serials
- **Velocity-based Stock Alerts**: Intelligent threshold calculations in addition to static thresholds

**Note**: The system is production-ready with no pending "Coming Soon" features.

---

### 15. Xlink-Sage (AI-Powered System Guide)

**Purpose**: Intelligent, context-aware chatbot that serves as an "Old Sage of Inventory Wisdom" - providing instant answers to user questions by searching through comprehensive system documentation using AI-powered vector similarity search.

**Feature Implementation Status**: Fully implemented with conversation memory, role-based responses, and navigable links

#### Key Features

**Conversational Intelligence**:
- **Conversation Memory**: Remembers the last 5 message exchanges in each session for natural multi-turn interactions
- **Session Persistence**: Conversations persist across page refreshes using localStorage
- **Context-Aware**: Maintains conversation context to understand follow-up questions
- **Smart Persona**: Responds in plain, jargon-free language with light wit and sage-like wisdom

**Knowledge Retrieval**:
- **Vector Similarity Search**: Uses OpenAI embeddings (`text-embedding-3-small`) to find the most relevant documentation
- **Real-time Context**: Searches knowledge base in real-time for every query
- **Source Attribution**: Shows which documentation sections were used in the response
- **Accuracy-First**: Only provides information from actual documentation - never guesses or makes up answers

**Role-Based Guidance**:
- **Admin Users**: Advanced tips about 90-day forecasting, user management, approval workflows, and system configuration
- **Back Office Users**: Focus on order management, reporting, asset tracking, KPI dashboard, and picking queue operations
- **Field Users**: Mobile-friendly workflows like stock ordering, barcode scanning, stock counts, device tracking, and repair logging
- **User Context**: Automatically detects user profile (role, warehouse, company) and personalizes responses

**Navigable Links**:
- **In-App Navigation**: Bot responses can include clickable buttons using syntax `[NAVIGATE:Label|/path]`
- **Quick Access**: Direct navigation to relevant pages like `/stock-order`, `/kpi`, `/user-management`, `/tracking`
- **Seamless Flow**: Users can ask "How do I create an order?" and click a button to go directly to the order page

**System-Specific Guidance**:
- **Dropdown Instructions**: Guides users to "select the appropriate option" instead of hardcoding dropdown values
- **Workflow Assistance**: Understands all system workflows (orders, picking, dispatch, assets, repairs, stock counts)
- **Best Practices**: Provides context-aware tips based on user role and current workflow

#### Technical Architecture

**Frontend Component**: `src/components/SystemGuideBot.tsx`
- Session ID generation for conversation isolation
- localStorage-based conversation history (last 5 exchanges)
- Auto-save on message changes
- Supports both direct Netlify function and n8n fallback
- Navigable link parsing with regex
- User context extraction from profile
- Error handling with user-friendly messages

**Backend Function**: `netlify/functions/chat.js`

Workflow:
1. Receive user message + conversation history + user context
2. Generate embedding using OpenAI (`text-embedding-3-small`)
3. Search Supabase for similar documents using pgvector
4. Format context from top 5 matching documents
5. Generate response using OpenAI (`gpt-4o-mini`) with:
   - System prompt (Xlink-Sage persona with role-specific guidance)
   - Conversation history (last 5 exchanges)
   - Retrieved knowledge context
   - Current user message
6. Return answer + sources

**Knowledge Base Sources**:
- `PRODUCT_DOCUMENTATION.md`: Complete product documentation (70 chunks)
- `KNOWLEDGE_BASE_WORKFLOW_GUIDE.md`: Step-by-step workflows (75 chunks)

**Update Process**:
1. Edit documentation markdown files
2. Run ingestion script: `python scripts/ingest_documents.py`
3. Documents automatically chunked and embedded using LangChain
4. Bot uses updated information immediately on next query

#### Bot Analytics & Usage Tracking

**Database Table**: `bot_usage_logs`

Comprehensive analytics system tracks all bot interactions for insights and improvements:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | References user_profiles(id) |
| user_email | TEXT | User email for reporting |
| user_role | TEXT | admin, back_office, user |
| user_company | TEXT | Company name |
| user_warehouse | TEXT | Warehouse location |
| session_id | TEXT | Conversation session identifier |
| query | TEXT | User's question |
| response | TEXT | Bot's answer |
| sources | JSONB | Documentation sources used |
| tokens_used | INTEGER | OpenAI tokens consumed |
| response_time_ms | INTEGER | Response latency |
| is_work_related | BOOLEAN | Query classification |
| satisfaction_rating | INTEGER | 1-5 star rating |
| satisfaction_feedback | TEXT | User feedback comments |
| created_at | TIMESTAMPTZ | Query timestamp |
| rated_at | TIMESTAMPTZ | Rating timestamp |

**Metrics Captured**:
1. **Usage Metrics**: Total queries per period, queries per user, peak usage times, average response time, token consumption
2. **Quality Metrics**: User satisfaction ratings (1-5 stars), satisfaction feedback text, most helpful responses, common question patterns
3. **Work Classification**: Work-related vs. non-work queries, most common work topics, off-topic usage patterns
4. **User Insights**: Top users by query count, role-specific usage patterns, question types by role, time to resolution

**KPI Dashboard Integration**: Dedicated "Xlink-Sage Analytics" tab displays:
- **Overview Cards**: Total queries this month, average satisfaction rating, most active user, total sessions
- **Usage Trends** (Line Chart): Queries over time, satisfaction ratings trend, work vs. non-work split
- **Top Questions** (Table): Most frequently asked questions, average satisfaction per question type, response time per question type
- **User Engagement** (Bar Chart): Queries by user role, top 10 users by query count, average queries per session
- **Satisfaction Breakdown** (Pie Chart): Distribution of 1-5 star ratings
- **Response Performance** (Histogram): Response time distribution, token usage distribution, session length distribution
- **Topic Analysis** (Word Cloud): Most common keywords in queries, top documentation sections accessed
- **Work Classification** (Donut Chart): Work-related vs. non-work queries percentage

**Installations Analytics**:
- Dedicated "Installations" tab in the KPI Dashboard.
- Currently displays "Awaiting Vendor Information" until analytics requirements are finalized.

**Satisfaction Rating UI**:
- After each bot response, users can rate the answer with 1-5 stars
- Optional feedback textarea appears after rating
- "Skip" option to dismiss without rating
- Thank you message after submission

#### System Prompt & Persona

The bot operates with a carefully crafted personality:

> "You are Xlink-Sage, a witty but grounded guide to the inventory system. Think of yourself as that friend who's seen it all and can point people in the right direction without the corporate speak.
>
> **Your style**:
> - Plain talk, no jargon storms. If a 10-year-old can't get it, rephrase it.
> - Witty but not silly. A light touch of humor keeps things human.
> - Sage-like: you know the patterns, you've read the docs, you stick to what's real.
> - Short answers win. Give them the path, not the entire forest.
>
> **Your rules**:
> - Only say what the docs actually say. No making stuff up, no guessing, no 'probably works like...'
> - If the answer's in the context, give it straight: 'Go here, click this, you'll see that.'
> - If it's not in the context, be honest: 'That's not in my scrolls. Check the guide or ask support.'
> - Keep it friendly but factual. You're helpful, not a salesperson."

#### Error Handling

User-friendly error messages for common issues:

| Error Type | User-Friendly Message |
|-----------|---------------------|
| Quota exceeded | "⚠️ The AI service has reached its usage quota. Please contact your system administrator to add credits at platform.openai.com" |
| Rate limit | "⏱️ Too many requests at once. Please wait a moment and try again." |
| Invalid API key | "🔑 The AI service is not properly configured. Please contact your system administrator." |
| Service unavailable | "🔧 The AI service is temporarily down. Please try again in a few minutes." |
| Network error | "I couldn't reach the knowledge base. Please try again or contact support." |

#### Configuration

**Environment Variables Required**:
```env
# Supabase credentials (for vector search)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI API key (for embeddings + chat)
OPENAI_API_KEY=sk-your-openai-api-key

# Chat endpoint (set automatically in Netlify)
VITE_CHAT_ENDPOINT=/.netlify/functions/chat
```

#### Cost Analysis

**Current Usage**:
- **Embedding Model**: text-embedding-3-small ($0.00002 / 1K tokens)
- **Chat Model**: gpt-4o-mini ($0.000150 / 1K input, $0.000600 / 1K output)

**Example Monthly Costs (1000 queries)**:
```
USD Pricing:
Embeddings: 1000 queries × 50 tokens avg × $0.00002 = $1.00
Chat Input: 1000 queries × 500 tokens avg × $0.00015 = $75.00
Chat Output: 1000 queries × 150 tokens avg × $0.00060 = $90.00
Total: ~$166/month USD (~R3,071/month ZAR at R18.5 exchange rate)

Per Query: ~$0.17 USD (~R3.07 ZAR)
```

**KPI Dashboard Display**:

- Costs displayed in South African Rand (ZAR) with USD reference
- Breakdown: Embeddings cost vs. Chat cost
- Average cost per query in ZAR
- **Automatic exchange rate updates**: Fetches current USD/ZAR rate weekly from Exchange Rate API
- Cached in localStorage for 7 days
- Fallback to R18.5 if API unavailable
- Shows last updated timestamp

**Cost Optimization**:
- Conversation memory reduces redundant context
- Document chunking minimizes token usage
- Cache common queries (future enhancement)

#### Performance

- **Average Response Time**: 2-4 seconds
- **Embedding Generation**: ~500ms
- **Vector Search**: ~200ms
- **Chat Completion**: 1-3 seconds
- **Total Latency**: Primarily driven by OpenAI API

#### Best Practices

**For Users**:
- Ask specific questions about features or workflows
- Use clear, simple language (e.g., "How do I add items to a cart?")
- Refer to specific modules by name
- Use follow-ups - the bot remembers your last 5 exchanges
- Rate responses to help improve answer quality

**For Administrators**:
- Keep documentation up-to-date and comprehensive
- Re-run ingestion after major documentation updates
- Monitor OpenAI costs monthly via KPI dashboard
- Set API spending limits as needed
- Review feedback for low-rated responses to improve documentation
- Check Netlify function logs for technical issues

#### User Experience

- **Fixed Position**: Always accessible from bottom-right corner (z-index 9999)
- **Responsive Design**: Works on desktop and mobile devices
- **Loading Indicators**: Clear visual feedback during processing
- **Accessibility**: Screen reader support and keyboard navigation
- **Branding**: "Old Sage of Inventory Wisdom" subtitle reinforces sage-like persona

**Navigation Path**: Fixed floating button (bottom-right corner, all pages)

---

## Backend Integrations & Storage

### Database Architecture (Supabase PostgreSQL)

#### Core Tables

##### 1. user_profiles
**Purpose**: User authentication and role management

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (references auth.users) |
| email | TEXT | User email (unique, indexed) |
| full_name | TEXT | User's full name |
| role | ENUM | admin, back_office, user |
| approval_status | ENUM | pending, approved, rejected |
| approved_by | UUID | Admin who approved |
| approved_at | TIMESTAMP | Approval timestamp |
| warehouse | TEXT | Assigned warehouse |

##### 2. inventory_items
**Purpose**: Master product catalog

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| item_name | TEXT | Product name (unique) |
| item_url | TEXT | Product image/info URL |
| item_category | ENUM | Business line category |
| item_description | TEXT | Product description |
| item_nature | ENUM | Serialised, Non-serialised |

##### 3. point_of_presence
**Purpose**: Technicians, contractors, and field personnel directory

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| tech_id | TEXT | Technician identifier |
| name_surname | TEXT | Full name |
| contractor | TEXT | Company name |
| region | TEXT | Service region |
| email_address | TEXT | Contact email |
| contact_number | TEXT | Phone number |
| physical_address | TEXT | Location address |
| latitude/longitude | NUMERIC | GPS coordinates |

##### 4. unique_orders
**Purpose**: Master orders table with aggregated status

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| order_id | BIGSERIAL | Auto-increment order number |
| date_ordered | TIMESTAMP | Order date/time |
| item_category | TEXT | Business line |
| quantity_ordered | INTEGER | Total items |
| region | TEXT | Delivery region |
| contractor_company | TEXT | Contractor name |
| technician | TEXT | Technician name |
| ordered_by | TEXT | Email of orderer |
| recipient_name | TEXT | Recipient name |
| recipient_address | TEXT | Delivery address |
| recipient_email | TEXT | Recipient email |
| pick_status | ENUM | Picking status |
| dispatch_status | ENUM | Dispatch status |
| waybill_number | TEXT | Tracking number |

##### 5. stock_order
**Purpose**: Individual line items for each order

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| order_id | BIGINT | FK to unique_orders |
| device_type | TEXT | Product name |
| quantity_ordered | INTEGER | Qty ordered |
| qty_dispatched | INTEGER | Qty picked/dispatched |
| item_description | TEXT | Item details |
| pick_status | ENUM | Item pick status |
| dispatch_status | ENUM | Item dispatch status |
| stock_availability | ENUM | Availability status |

##### 6. dispatch_log
**Purpose**: Records all dispatch transactions

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| order_id | BIGINT | FK to unique_orders |
| date_dispatched | DATE | Dispatch date |
| device_type | TEXT | Product name |
| quantity | INTEGER | Qty dispatched |
| terminal_serial_number | TEXT | Terminal serial |
| cradle_serial_number | TEXT | Cradle serial |
| charger_serial_number | TEXT | Charger serial |
| cashconnect_serial_number | TEXT | CC serial |
| dispatch_method | ENUM | How dispatched |
| waybill_number | TEXT | Tracking number |
| packer | TEXT | Who packed |
| dispatcher | TEXT | Who dispatched |

##### 7. stock_levels
**Purpose**: Current inventory state (source of truth)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| device_type | TEXT | Product name |
| item_code | TEXT | Item identifier |
| quantity | INTEGER | Current stock level |
| bin_location | TEXT | Warehouse location |
| stock_holder | TEXT | Who holds stock |
| item_status | TEXT | Functional/Faulty/etc. |
| overall_condition | TEXT | New/Good/Fair/Damaged |
| tech_id | TEXT | Technician ID |

##### 8. stock_counts
**Purpose**: Historical stock count records with user audit trail

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_email | TEXT | Who performed count |
| count_type | ENUM | Monthly, Mid-Month, Daily |
| count_period | TEXT | Calculated period |
| device_type | TEXT | Product name |
| quantity | INTEGER | Counted quantity |
| item_status | TEXT | Condition status |
| manufacture_serial_number | TEXT | Serial numbers |
| created_at | TIMESTAMP | When counted |

---

### Enums (Data Types)

```
business_line_enum:
  - Accessories
  - Absa
  - Cash Connect
  - VPS
  - Modems
  - Sim Management
  - Other

item_nature_enum:
  - Serialised
  - Non-serialised

delivery_party_enum:
  - Technician
  - Regional Warehouse
  - Non Technician

pick_status_enum:
  - Pending
  - Picked
  - Partially Picked
  - Not Picked

dispatch_status_enum:
  - Pending
  - Dispatched
  - Partial
  - Cancelled
  - Returned

stock_availability_enum:
  - Available
  - Not Available
  - Backordered
  - Partial

dispatch_method_enum:
  - Courier
  - In-house Delivery
  - Pickup
  - Other

user_role_enum:
  - admin
  - back_office
  - user

approval_status_enum:
  - pending
  - approved
  - rejected

count_type:
  - Monthly
  - Mid-Month
  - Daily
```

---

### N8N Webhook Integrations

The system integrates with N8N for workflow automation:

#### 1. Order Placed Webhook
**Trigger**: When a new order is submitted
**Purpose**: Create stock_order line items and trigger notifications
**Payload Includes**:
- Order ID and date
- All cart items with quantities
- Delivery party information
- Recipient details
- Complete form snapshot

#### 2. Order Picked Webhook
**Trigger**: When picking is completed
**Purpose**: Update backend systems with picking data
**Payload Includes**:
- Order details
- Picked items with serial numbers
- Stock availability updates

#### 3. Order Dispatched Webhook
**Trigger**: When dispatch is confirmed
**Purpose**: Notify recipients and update tracking
**Payload Includes**:
- Dispatch details
- Waybill numbers
- Dispatch method
- Package references

#### 4. Order Manifest Webhook
**Trigger**: When manifest PDF is generated
**Purpose**: Document generation and archiving
**Payload Includes**:
- Complete order manifest data
- All items with serial numbers

---

### State Management & Caching

#### TanStack React Query Configuration

```javascript
{
  gcTime: 24 hours,        // Garbage collection time
  staleTime: 5 minutes,    // Data freshness window
  retry: 2 attempts,       // Retry failed requests
  networkMode: 'offlineFirst'  // Work offline first
}
```

#### Cache Persistence
- **Storage**: localStorage
- **Key**: '4d-inventory-cache'
- **Behavior**: Survives page refreshes and browser restarts

#### Stale Times by Data Type
- **Orders**: 60 seconds (frequently changing)
- **Inventory Items**: 5 minutes (stable data)
- **Reference Data** (categories, contractors): 10 minutes

---

### Authentication Flow

1. **User Signs Up**
   - Email and password submitted to Supabase Auth
   - User profile created with `role='user'` and `approval_status='pending'`
   - Admins with whitelisted emails are auto-approved

2. **Admin Approves User**
   - Admin views User Management page
   - Sets `approval_status='approved'`
   - Records `approved_by` and `approved_at`

3. **User Signs In**
   - Credentials verified by Supabase Auth
   - JWT token issued and stored
   - User profile fetched with role and approval status
   - Access granted based on role and approval

4. **Session Management**
   - Tokens auto-refresh
   - Persistent sessions in localStorage
   - Auth state available via useAuth hook

---

### Data Flow Architecture

```
┌─────────────────────────────────────────┐
│          USER INTERFACE (React)         │
│  • Forms • Buttons • Data Displays      │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│     REACT QUERY (State Management)      │
│  • Caching • Offline Support • Sync     │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
┌───────────────┐   ┌───────────────┐
│   SUPABASE    │   │    N8N        │
│   DATABASE    │   │  WEBHOOKS     │
│               │   │               │
│ • Tables      │   │ • Automation  │
│ • RLS         │   │ • Notifications│
│ • Triggers    │   │ • Integrations│
└───────────────┘   └───────────────┘
```

---

### Offline Support

**Capabilities**:
- Read cached data when offline
- See offline indicator
- Queue writes for when online
- Automatic sync on reconnection

**Implementation**:
- Network status detection via `useOnlineStatus` hook
- Query persistence to localStorage
- Offline-first network mode in React Query

---

## User Roles & Permissions

### Role Hierarchy

#### Admin
**Full System Access**
- View and manage all users
- Approve/reject user registrations
- Assign roles to users
- View all stock counts (all users)
- Access KPI Dashboard
- All Back Office and User permissions

#### Back Office
**Operations Access**
- View all stock counts (all users)
- Access picking and dispatch queues
- Generate reports
- View KPI Dashboard
- All User permissions
- Cannot manage users

#### User
**Standard Access**
- Create stock orders
- Perform stock counts
- View own stock count history
- Access basic features
- View own data only

---

### Route Protection

| Route | Required Role |
|-------|---------------|
| `/admin/users` | Admin only |
| `/kpi` | Admin, Back Office |
| `/picking` | Admin, Back Office |
| `/dispatching` | Admin, Back Office |
| `/stock-counts-report` | All (filtered by role) |
| `/stock-order` | All approved users |
| `/stock-counts` | All approved users |

---

### Row Level Security (RLS)

Database-level security ensures:
- Users can only read their own profile
- Admins can read/update all profiles
- Stock counts filtered by user email for non-admins
- All authenticated users can perform CRUD on inventory

---

## Business Rules & Validation

### Order Validation Rules

#### Common Requirements (All Orders)
- Date ordered: Required
- Item category: Required (not placeholder)
- Item nature: Required (not placeholder)
- Delivery party: Required (not placeholder)
- Ordered by: Valid email required

#### Technician Orders
- Contractor company: Required
- Region: Required
- Technician: Required
- On behalf of: Valid email required

#### Regional Warehouse Orders
- Region: Required
- Recipient name: Required
- Recipient email: Valid email required

#### Non-Technician Orders
- Recipient name: Required
- Recipient address: Required
- Recipient email: Valid email required

---

### Stock Count Validation Rules

#### Required Fields
- Count type (Monthly, Mid-Month, Daily)
- Stock holder
- Name or location
- Item category
- Device type
- Item description
- Item nature
- Item code
- Item status
- Contractor company
- Contractor region
- Technician name
- Tech ID
- Quantity (>= 0)

#### Duplicate Serial Prevention

**Cash Connect Items**:
- Checks QR Code Serial Number only
- Case-insensitive comparison

**All Other Business Lines**:
- Checks Manufacture Serial Number
- Checks Cradle Serial Number
- Checks Charger Serial Number
- Any duplicate triggers error

---

### Picking Validation Rules

#### Item Match Validation
- Scanned item code must match ordered item code
- Case-insensitive comparison
- Blocks submission on mismatch

#### Required Fields
- Stock availability (In Stock/Out of Stock)
- Pick status (Picked in full/Partially picked/Not picked)
- Quantity picked

#### Serialised Items
- Terminal Serial Number (required)
- Cradle Serial Number (optional)
- Charger Serial Number (optional)
- Cash Connect Serial Number (for CC items)

---

### Dispatch Validation Rules

#### Waybill Required For
- Courier
- In-house Delivery
- Delivery

#### Package References
- All items must be referenced
- Single or multiple package modes supported
- Complete dispatch requires all items referenced

---

### SLA Compliance Rules

#### Order Cutoff Times
- **Before 12 PM**: Must be completed same day (by 11:59 PM)
- **After 12 PM**: Must be completed by 3 PM next day

#### Breach Calculation
- Pending orders past their deadline = SLA breach
- Compliance rate = (Pending - Breaches) / Pending × 100

---

### Stock Alert Thresholds

| Stock Level | Alert Type | Severity |
|-------------|------------|----------|
| 0 units | Out of Stock | Critical |
| 1-5 units | Critical Stock | High |
| 6-10 units | Low Stock | Warning |
| > 10 units | OK | None |

---

### Count Period Calculation

| Count Type | Period Format | Example |
|------------|---------------|---------|
| Daily | YYYY-MM-DD | 2024-11-22 |
| Mid-Month | YYYY-MM-H1 or H2 | 2024-11-H1 (days 1-15) |
| Monthly | YYYY-MM | 2024-11 |

---

## Technical Architecture

### Frontend Structure

```
src/
├── components/
│   ├── ui/                 # ShadCN UI components
│   ├── BarcodeScanner.tsx  # Camera scanning
│   ├── OfflineIndicator.tsx # Network status
│   └── ProtectedRoute.tsx  # Route guards
├── hooks/
│   ├── useAuth.tsx         # Authentication
│   ├── useSupabase.ts      # Data fetching
│   └── useOnlineStatus.ts  # Network detection
├── pages/                  # 20 page components
├── integrations/
│   ├── supabase/           # DB client & services
│   └── n8n.ts              # Webhook service
├── services/               # Business logic
└── types/                  # TypeScript definitions
```

---

### Key Dependencies

#### Data & State
- `@supabase/supabase-js` - Database client
- `@tanstack/react-query` - Server state management
- `react-hook-form` - Form handling
- `zod` - Validation schemas

#### UI Framework
- `react` - Core framework
- `tailwindcss` - Styling
- `@radix-ui/*` - Accessible components
- `recharts` - Data visualization

#### Utilities
- `date-fns` - Date formatting
- `@zxing/browser` - Barcode scanning
- `sonner` - Toast notifications

---

### Environment Variables

```bash
# Supabase
VITE_SUPABASE_URL=https://project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key

# N8N Webhooks
VITE_N8N_ORDER_PLACED_WEBHOOK_URL=...
VITE_N8N_ORDER_PICKED_WEBHOOK_URL=...
VITE_N8N_ORDER_DISPATCHED_WEBHOOK_URL=...
VITE_N8N_ORDER_MANIFEST_WEBHOOK_URL=...
```

---

### Security Measures

- **Authentication**: Supabase Auth with JWT
- **Authorization**: Role-based access control
- **Database**: Row Level Security (RLS)
- **Transport**: HTTPS/TLS encryption
- **Input**: Zod validation schemas
- **XSS Prevention**: React automatic escaping

---

### System Guide Bot (AI-Powered Help Assistant)

#### Overview

The **Xlink System Guide** is an AI-powered chatbot integrated directly into the inventory management platform. It provides instant, contextual help to users by searching through the complete product documentation and workflow guides using advanced vector search technology.

#### Key Features

**Intelligent Context Search**:
- Uses OpenAI embeddings and vector similarity search
- Searches across 145+ documentation chunks
- Returns answers based on actual product documentation
- Provides source attribution for transparency

**User Experience**:
- Floating chat button in bottom-right corner (all pages)
- Clean, modern chat interface
- Real-time responses (typically < 3 seconds)
- Works on desktop and mobile devices
- Color-coded messages for clarity

**Anti-Hallucination Design**:
- Strict adherence to documented information
- Never invents features or workflows
- Admits when information isn't available
- Directs users to support when needed
- Literal interpretation over guessing

#### How It Works

1. **User Input**: User types question in chat interface
2. **Vector Search**: System converts question to embedding and searches documentation
3. **Context Retrieval**: Top 5 most relevant document chunks retrieved
4. **AI Response**: GPT-4o-mini generates answer using only retrieved context
5. **Display**: Answer shown with source attribution

#### Technical Implementation

**Architecture**:
```
User Question
    ↓
Netlify Serverless Function
    ↓
OpenAI Embeddings API (text-embedding-3-small)
    ↓
Supabase Vector Search (pgvector)
    ↓
OpenAI Chat Completion (gpt-4o-mini)
    ↓
Formatted Answer + Sources
```

**Backend Components**:
- Netlify serverless function (`/netlify/functions/chat.py`)
- Supabase `documents` table with vector(1536) embeddings
- PostgreSQL `match_documents()` function for similarity search
- OpenAI API integration for embeddings and chat

**Frontend Component**:
- React component with floating chat UI
- Message history and conversation state
- Error handling with user-friendly messages
- Responsive design for mobile/desktop

#### Cost & Performance

**API Costs (per query)**:
- Embedding generation: ~$0.00002 (2/100 of a cent)
- Chat completion: ~$0.0003-$0.001 (3-10/100 of a cent)
- **Total per query**: Less than 1 cent
- **1000 queries**: ~$3-5 USD

**Performance**:
- Average response time: 2-3 seconds
- 99% success rate
- Handles concurrent users efficiently
- Scales automatically with traffic

#### API Token Requirements

**Required Services**:

1. **OpenAI API** (Required):
   - API Key: `OPENAI_API_KEY`
   - Used for: Text embeddings + Chat completions
   - Cost: Pay-as-you-go (pennies per request)
   - Get key: https://platform.openai.com/api-keys
   - Billing: https://platform.openai.com/account/billing

2. **Supabase** (Already configured):
   - Service Role Key: `VITE_SUPABASE_SERVICE_ROLE_KEY`
   - Used for: Vector storage and similarity search
   - Cost: Included in existing Supabase plan
   - Free tier: 500MB database

**Setup Requirements**:
```bash
# Add to .env file:
OPENAI_API_KEY=sk-your-openai-api-key-here
VITE_CHAT_ENDPOINT=/.netlify/functions/chat
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Cost Management**:
- Monitor usage at OpenAI dashboard
- Set spending limits to control costs
- Typical cost: $20-50/month for normal usage
- High traffic: $100-200/month (1000+ queries/day)

#### Error Handling

**User-Friendly Error Messages**:
- **Quota exceeded**: "The AI service has reached its usage quota. Please contact your system administrator to add credits at platform.openai.com"
- **Rate limit**: "Too many requests at once. Please wait a moment and try again."
- **Invalid API key**: "The AI service is not properly configured. Please contact your system administrator."
- **Service down**: "The AI service is temporarily down. Please try again in a few minutes."

**Automatic Recovery**:
- Network errors auto-retry
- Graceful degradation on failures
- Clear error messages to users

#### Documentation Sources

The bot searches across:
- **PRODUCT_DOCUMENTATION.md**: Complete product documentation (70 chunks)
- **KNOWLEDGE_BASE_WORKFLOW_GUIDE.md**: Step-by-step workflows (75 chunks)

**Update Process**:
1. Edit documentation markdown files
2. Run ingestion script: `python scripts/ingest_documents.py`
3. Documents automatically chunked and embedded
4. Bot uses updated information immediately

#### Usage Analytics

Track bot performance via:
- Netlify function logs (request counts)
- OpenAI dashboard (API usage and costs)
- User feedback (future enhancement)

#### Best Practices

**For Users**:
- Ask specific questions about features or workflows
- Use clear, simple language
- Refer to specific modules by name

**For Administrators**:
- Keep documentation up-to-date
- Re-run ingestion after major doc updates
- Monitor OpenAI costs monthly
- Set API spending limits as needed

---

## Summary

The 4D Analytics Inventory Management System provides a complete solution for managing inventory operations from order creation through delivery, with comprehensive asset lifecycle tracking and repair management. Key highlights include:

**Active Features** (100% Implementation Complete):
- Complete order-to-delivery workflow
- Asset Management with 4 integrated tabs:
  - Device Registry with comprehensive tracking
  - Repairs workflow with 18 fault categories
  - DOA/Returns with RMA processing
  - Device Movements tracking
- Business line-specific scanning workflows (Cash Connect QR parsing + Multi-serial capture)
- Barcode/QR code scanning for stock counts with mobile camera support
- Enhanced KPI dashboard with 8 comprehensive tabs:
  - **Business line dimensional analysis** integrated across Overview, Pipeline, and Devices tabs
  - **Exceptions tab** for data integrity monitoring (orphaned scans, duplicate serials)
  - Repairs tab with fault analysis and resource planning
  - Velocity-based stock alerts with intelligent thresholds
  - 30+ operational metrics
  - Badge notifications for active alerts
- Role-based access control with approval workflow
- Offline support for field operations
- PDF manifest generation
- N8N webhook integrations
- USB scanner optimizations across all workflows

**Recent Enhancements (November 28, 2024)**:
- **Repair Ticket Management Enhancements**:
  - **Edit Fault Assessments**: All users can now update fault categories, descriptions, and assessment notes after initial ticket creation
  - **Camera Scanning for Repair Logging (NEW)**: Enhanced Log Repair Ticket with mobile camera barcode scanning and comprehensive data capture
    - Business line selection (Cash Connect, ABSA, VPS, Accessories, Modems)
    - Mobile camera scanning with BarcodeScanner component
    - Cash Connect QR parsing with comma-counting logic
    - Multiple serial fields (Manufacture, Xlink, Cradle, Charger) for non-Cash Connect items
    - Camera scan buttons on all serial input fields
    - Item status and overall condition capture
    - USB scanner optimizations (7 input attributes)
    - Complete uniformity with Stock Counts scanning workflow
  - **Intelligent Fault Auto-Population**: Stock counts now auto-populate fault reasons from device repair history
  - **Assessment Pending Option**: Stock counts can proceed even when devices haven't been fully diagnosed
  - **Repair History Alerts**: Real-time display of previous fault categories when scanning devices during stock counts
  - **19 Standardized Fault Categories**: Consistent fault categorization across Stock Counts and Repairs modules

**Recent Enhancements (November 27, 2024)**:
- **Business Line Dimensional Analysis**: Woven into KPI Dashboard tabs for complete dimensional view
  - Overview: Business line fulfillment comparison
  - Pipeline: Pending orders by business line
  - Devices: Stock health distribution by business line
- **Exceptions Tab**: Real-time data integrity monitoring
  - Orphaned stock count serials (devices scanned but not in registry)
  - Duplicate serial number detection
  - Actionable exception details with location and timestamp
- Previous enhancements:
  - DOA (Dead on Arrival) device logging workflow
  - RMA (Return Merchandise Authorization) supplier return processing
  - Fault visualization with resource recommendations
  - Unified scanning patterns across Stock Ingestion, Stock Counts, and DOA workflows

The system is built on modern, scalable technology and designed to grow with your operations. All data is securely stored in Supabase with comprehensive audit trails and role-based access controls.

---

*Document Version: 2.2*
*Last Updated: December 3, 2025*
*Prepared for: 4D Analytics Clients*
