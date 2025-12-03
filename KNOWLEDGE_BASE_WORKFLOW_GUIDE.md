# 4D Analytics Inventory Management System - Complete Workflow Guide

---

## Table of Contents

1. [Quick Start Guide](#quick-start-guide)
2. [User Roles & Access Control](#user-roles--access-control)
3. [Order Management Workflows](#order-management-workflows)
4. [Warehouse Operations](#warehouse-operations)
5. [Asset Management](#asset-management)
6. [Stock Management](#stock-management)
7. [Analytics & Reporting](#analytics--reporting)
8. [Troubleshooting & FAQs](#troubleshooting--faqs)
9. [Technical Setup](#technical-setup)
10. [Appendix](#appendix)

---

## Quick Start Guide

### System Overview
The 4D Analytics Inventory Management System is a comprehensive web-based platform for managing the complete lifecycle of inventory operations, from order creation through picking, dispatching, and delivery tracking.

### Getting Started
1. **Access**: Navigate to your system URL and log in with your credentials
2. **Dashboard**: The landing page shows all available modules based on your role
3. **Navigation**: Use the main menu to access different functional areas

### Key Modules by Role
- **Field Users**: Stock Order, Stock Counts, Asset Management, Tracking
- **Warehouse Staff**: Picking Queue, Dispatching Queue, Stock Counts
- **Back Office**: All modules plus User Management, KPI Dashboard
- **Admin**: Full system access and configuration

### Understanding Form Fields and Dropdown Selections

**IMPORTANT GUIDANCE FOR ALL WORKFLOWS**:

When providing instructions that involve dropdown fields or selection lists, **always instruct users to "select the appropriate option"** rather than specifying a particular value. This ensures flexibility and prevents misleading guidance.

**Dropdown Fields in the System**:
The system uses dropdown menus for many selections to ensure data consistency. Common dropdown fields include:

1. **Order Management**:
   - Item Category: Select the appropriate category from the dropdown
   - Item Nature: Select the appropriate nature type from available options
   - Delivery Party: Select the appropriate delivery method (Technician, Regional Warehouse, Non Technician)
   - Contractor Company: Select the appropriate contractor from the list
   - Region: Select the appropriate region from available options
   - Technician: Select the appropriate technician from the dropdown

2. **User Management**:
   - User Role: Select the appropriate role (Admin, Back Office, User) from the dropdown
   - Warehouse: Select the appropriate warehouse location from available options
   - Company: Select your company (Xlink or Contractor Company) from the dropdown

3. **Asset Management**:
   - Device Type: Select the appropriate device type from the list
   - Status: Select the appropriate status from available options
   - Condition: Select the appropriate condition rating from the dropdown

4. **Stock Counts**:
   - Count Type: Select the appropriate count frequency (Monthly, Mid-Month, Daily) from the dropdown
   - Item Status: Select the appropriate status from available options
   - Stock Holder: Select the appropriate holder type from the list

**Best Practices**:
- Read all available options in the dropdown before selecting
- If unsure which option to choose, consult the field label and any help text
- Some dropdowns are cascading (e.g., selecting a Region filters the Technician list)
- Required fields are marked with an asterisk (*)
- Contact your supervisor or admin if you're unsure which option applies to your situation

### Navigable Links in Bot Responses

**IMPORTANT FOR XLINK-SAGE BOT**:

When providing guidance to users, you can include clickable navigation links that take users directly to the relevant page in the system.

**Syntax**: `[NAVIGATE:Button Label|/page-path]`

**Example Responses**:
- "To create a new order, [NAVIGATE:click here|/stock-order]. You'll need to fill in the order details and add items to your cart."
- "Check your order status in the [NAVIGATE:Tracking page|/tracking]."
- "View inventory levels on the [NAVIGATE:KPI Dashboard|/kpi]."
- "Admin users can manage user approvals in [NAVIGATE:User Management|/user-management]."

**Available Page Paths**:
- `/stock-order` - Create new stock orders
- `/picking-queue` - Warehouse picking operations
- `/dispatch` - Order dispatch and fulfillment
- `/stock-counts` - Inventory counting
- `/asset-management` - Device registry and tracking
- `/repair-tickets` - Repair and fault management
- `/stock-admin` - Product catalog management
- `/stock-ingestion` - Batch device registration
- `/user-management` - User approvals and roles
- `/kpi` - KPI Dashboard and analytics
- `/tracking` - Order tracking
- `/point-of-presence` - Technician roster

**Usage Guidelines**:
- Use navigable links when directing users to specific pages
- Place the link naturally within your response
- Use descriptive button labels (e.g., "Go to Orders" instead of just "here")
- You can include multiple links in a single response
- Links automatically close the bot when clicked

---

## User Roles & Access Control

### User Registration Process
**Purpose**: New users register for system access

**Required Role**: Any (self-service)

**Steps**:
1. Navigate to the login page
2. Click "Register" or "Sign Up"
3. Enter email address and password
4. Confirm password
5. Submit registration form
6. Wait for admin approval (status shows "Pending")

**Notes**:
- Registration requires email validation
- New registrations need admin approval before access
- Users receive email notification when approved

### Admin Approval Workflow
**Purpose**: Admins approve or reject new user registrations

**Required Role**: Admin

**Steps**:
1. Navigate to **User Management** (`/admin/users`)
2. View list of pending users (marked with "Pending" badge)
3. Click on user card to review details
4. Choose action:
   - **Approve**: Select role (Admin, Back Office, User) and click Approve
   - **Reject**: Click Reject with optional reason
5. Confirm action

**Notes**:
- Approved users receive automatic email notification
- Rejected users cannot re-register with same email
- Admin can see who approved each user and when

### Role Assignment
**Purpose**: Change user roles for existing users

**Required Role**: Admin

**Steps**:
1. Navigate to **User Management** (`/admin/users`)
2. Find user by name or email
3. Click on user card
4. Update role dropdown:
   - **Admin**: Full system access
   - **Back Office**: Operations and reporting access
   - **User**: Standard field operations access
5. Click "Update Role"
6. Confirm change

**Role Permissions**:
- **Admin**: All modules, user management, system configuration
- **Back Office**: Order management, reports, asset tracking, user approval
- **User**: Stock ordering, stock counts, basic asset management

### Access Revocation
**Purpose**: Remove access for former employees

**Required Role**: Admin

**Steps**:
1. Navigate to **User Management** (`/admin/users`)
2. Find user to revoke
3. Click on user card
4. Click "Revoke Access"
5. Confirm revocation

**Notes**:
- Revoked users cannot log in
- User history is preserved for audit
- Can re-activate revoked users if needed

### Password Reset Flow
**Purpose**: Users can reset their password if forgotten or need to change it

**Required Role**: Any (self-service)

**Steps for Forgotten Password**:
1. Navigate to the **Login** page (`/login`)
2. Click "Forgot your password?" link below the Sign In button
3. Enter your email address in the dialog
4. Click "Send Reset Link"
5. Check your email for password reset link
6. Click the link in email (redirects to `/reset-password` page)
7. Enter new password (minimum 6 characters)
8. Confirm new password
9. Click "Update Password"
10. System redirects to login page after 3 seconds
11. Sign in with new password

**Steps for Forced Password Change**:
1. Admin sends password reset email to user
2. User follows reset link from email
3. User sets new password on Reset Password page

**Security Features**:
- Password must be at least 6 characters long
- Reset links expire after 1 hour
- Password confirmation required
- Secure token-based authentication

**Notes**:
- Reset emails sent instantly via Supabase Auth
- Users cannot reuse reset link after successful password change
- No notification sent to admin when user resets password
- If email not received, check spam folder

---

## Order Management Workflows

### Stock Order Creation - Technician Delivery
**Purpose**: Field technicians order equipment for themselves

**Required Role**: User, Back Office, Admin

**Steps**:
1. Navigate to **Stock Order** (`/stock-order`)
2. **Order Information**:
   - Select order date (defaults to today)
   - Item category: Choose from dropdown (Cash Connect, ABSA, VPS, etc.)
   - Item nature: Auto-populated based on category
3. **Delivery Party**: Select "Technician"
4. **Technician Details**:
   - Select contractor company
   - Choose region
   - Select technician name
   - "On behalf of" auto-populates with logged-in user
5. **Shopping Cart**:
   - Search for items by name or code
   - Add items to cart with quantities
   - Review cart summary
6. **Submit Order**:
   - Validate all required fields
   - Click "Submit Order"
   - Receive confirmation with order number (e.g., ORD-0042)

**Notes**:
- Order triggers N8N webhook for processing
- Email confirmation sent to technician
- Order appears in picking queue for warehouse

### Stock Order Creation - Regional Warehouse
**Purpose**: Order equipment for regional warehouses

**Required Role**: Back Office, Admin

**Steps**:
1. Navigate to **Stock Order** (`/stock-order`)
2. **Order Information**:
   - Select order date
   - Item category and nature
3. **Delivery Party**: Select "Regional Warehouse"
4. **Warehouse Details**:
   - Select region
   - Warehouse location auto-populates
5. **Shopping Cart**:
   - Add items and quantities
   - Review cart total
6. **Submit Order**:
   - Validate and submit
   - Record order confirmation

**Notes**:
- For bulk stock replenishment
- Regional manager approval may be required

### Stock Order Creation - Non-Technician
**Purpose**: Order equipment for external recipients

**Required Role**: User, Back Office, Admin

**Steps**:
1. Navigate to **Stock Order** (`/stock-order`)
2. **Order Information**:
   - Select order date
   - Item category and nature
3. **Delivery Party**: Select "Non Technician"
4. **Recipient Details**:
   - Enter recipient name
   - Enter recipient company (optional)
   - Enter delivery address
   - Enter contact number
   - Enter email address
5. **Shopping Cart**:
   - Add items and quantities
6. **Submit Order**:
   - Validate email format
   - Submit and record confirmation

**Notes**:
- For external customers or partners
- Delivery tracking notifications sent to recipient email

### Backorder Management
**Purpose**: Handle orders when requested items are out of stock

**Required Role**: User, Back Office, Admin (when placing orders)

**How Backorders Work**:
When placing an order on the Stock Order page, the system automatically handles out-of-stock items:

**Steps**:
1. Navigate to **Stock Order** (`/stock-order`)
2. Complete order form (delivery party, recipient, etc.)
3. Search for items in the device gallery
4. **Stock Status Indicators**:
   - **In Stock (Green)**: Available quantity shown (e.g., "In Stock (45)")
   - **Low Stock (Amber)**: Limited quantity available (1-5 units)
   - **Out of Stock (Red)**: Zero units available
5. For out-of-stock items:
   - Item card displays red border and "Out of Stock" badge
   - Overlay shows warning icon on item image
   - Add button turns amber instead of green
   - Warning text appears: "Item will be backordered if added to cart"
6. Add out-of-stock items to cart (system allows this)
7. Submit order normally - backordered items are included
8. Order enters picking queue with backorder status

**Warehouse Processing**:
1. Pickers see orders with backordered items in Picking Queue
2. Available items are picked immediately
3. Backordered items remain in queue until stock arrives
4. System tracks partial fulfillment status

**Backorder Resolution**:
1. When backordered stock arrives (via Stock Ingestion)
2. Pending orders with those items automatically become pickable
3. Warehouse team completes picking
4. Order proceeds to dispatch

**Notifications**:
- User receives email when order is placed (including backordered items)
- Additional notification sent when backorder is fulfilled

**Notes**:
- Backorders are passive - no separate backorder queue exists
- Orders may be partially fulfilled (some items picked, others backordered)
- Priority given to older orders when stock arrives
- Users can track backorder status via Order Tracking page

### Order Tracking
**Purpose**: Monitor order status and progress

**Required Role**: All roles (filtered by permissions)

**Steps**:
1. Navigate to **Tracking** (`/tracking`)
2. **Search Options**:
   - Enter order ID (e.g., ORD-0042)
   - Enter waybill number
   - Filter by date range
   - Filter by delivery status
3. **View Results**:
   - Order details and status
   - Timeline visualization
   - Delivery milestones
   - Courier information

**Status Timeline**:
- Ordered → Picked → Dispatched → In Transit → Delivered

**Notes**:
- Real-time updates via courier API
- Email notifications at key milestones
- Historical tracking available

### My Orders Management
**Purpose**: View, track, cancel, and modify your orders

**Required Role**: User (own orders), Back Office, Admin (all orders)

**Steps**:
1. Navigate to **Tracking** (`/tracking`)
2. **My Orders Tab**:
   - View list of all your orders
   - Each order shows:
     - Order ID (e.g., ORD-0042)
     - Business Line (Cash Connect, ABSA, VPS, etc.)
     - Order Status (Pending, Picked, Dispatched, Delivered)
     - Date Ordered
     - Action buttons
3. **Available Actions**:
   - **Track**: View shipment details and delivery status
   - **Cancel**: Cancel pending orders (button only appears for Pending status)
   - **Modify**: Edit pending orders (button only appears for Pending status)

**Order Cancellation**:
1. Click "Cancel" button next to pending order
2. Confirm cancellation in dialog
3. Order status changes to "Cancelled"
4. Warehouse team receives notification

**Order Modification**:
1. Click "Modify" button next to pending order
2. Update allowed fields:
   - Quantities
   - Delivery address (for non-technician orders)
   - Contact information
3. Save changes
4. Order updates appear immediately

**Restrictions**:
- Cannot cancel picked, dispatched, or delivered orders
- Cannot modify picked, dispatched, or delivered orders
- Users see only their own orders
- Back Office and Admin see all orders

**Notes**:
- Real-time order status updates
- Color-coded status badges for quick identification
- Filtered by user role automatically

---

## Warehouse Operations

### Picking Queue Management
**Purpose**: View and manage orders awaiting picking

**Required Role**: Picker, Back Office, Admin

**Steps**:
1. Navigate to **Picking Queue** (`/picking`)
2. **Filter Options**:
   - Business line filter (Cash Connect, ABSA, VPS, etc.)
   - Sort by order date or quantity
3. **Queue Display**:
   - Orders organized by business line
   - Color-coded status badges:
     - Red: Not Picked
     - Amber: Pending/Partially Picked
     - Green: Picked
4. **Order Details**:
   - Click order to expand details
   - View order number, date, recipient
   - See item count and quantities
5. **Start Picking**:
   - Click "Pick Order" to enter picking cart

**Notes**:
- Queue refreshes automatically
- Priority orders highlighted
- Filtering by assigned region available

### Order Picking Workflow
**Purpose**: Pick items for specific orders

**Required Role**: Picker, Back Office, Admin

**Steps**:
1. From picking queue, click "Pick Order"
2. **Order Header Review**:
   - Order number and date
   - Delivery party and recipient info
   - Total items to pick
   - Progress bar showing completion
3. **Item Picking**:
   - View item details with images
   - Click "Pick Item" for each line item
4. **Item Picking Dialog**:
   - **Stock Availability**: Select from dropdown
   - **Pick Status**: Choose (Picked in full, Partially picked, Not picked)
   - **Quantity**: Enter quantity picked
   - **Serial Number Recording** (for serialized items):
     - Terminal Serial Number
     - Cradle Serial Number
     - Charger Serial Number
     - Cash Connect Serial Number
   - **Packing Details**:
     - Charger packed (Y/N)
     - Cables included (Y/N)
   - **Packer ID**: Enter packer name/ID
5. **Validate Items**:
   - Scan item code to verify match
   - Case-insensitive matching
   - Error messages for mismatches
6. **Submit Picking**:
   - Review all picked items
   - Click "Submit Picking Data"
   - Receive confirmation

**Notes**:
- Serial number validation prevents duplicates
- Partial picking allowed with notes
- Real-time stock level updates

### Serial Number Recording (Picking)
**Purpose**: Capture serial numbers during order picking

**Required Role**: Picker, Back Office, Admin

**Steps**:
1. During item picking in picking cart
2. **For Serialized Items**:
   - Terminal field appears for terminal devices
   - Cradle field for cradle devices
   - Charger field for charger devices
   - Cash Connect field for Cash Connect devices
3. **Scanning Options**:
   - **USB Scanner**: Focus on field and scan
   - **Camera Scan**: Click camera icon for mobile scanning
4. **Validation**:
   - System validates serial number format
   - Checks against device registry
   - Shows green check if found, red if not found
5. **Business Line Specific**:
   - **Cash Connect**: QR code parsing with comma-separated logic
   - **Other Lines**: Individual serial field entry

**Notes**:
- Serial numbers become part of order manifest
- Required for all serialized items
- Cannot submit without valid serial numbers

### Stock Availability Recording
**Purpose**: Record stock status during picking

**Required Role**: Picker, Back Office, Admin

**Steps**:
1. In picking cart item dialog
2. **Stock Availability Dropdown**:
   - In Stock
   - Out of Stock
   - Partial Stock
   - Backordered
3. **Automatic Updates**:
   - System updates inventory levels
   - Triggers stock alerts if needed
   - Records for reporting

**Notes**:
- Affects future order availability
- Used for KPI calculations
- Helps identify stock issues

### Dispatch Queue Management
**Purpose**: View orders ready for dispatch

**Required Role**: Dispatcher, Back Office, Admin

**Steps**:
1. Navigate to **Dispatching Queue** (`/dispatching`)
2. **Queue Display**:
   - Shows picked orders only
   - Both pick and dispatch status visible
   - Organized by business line
3. **Filter Options**:
   - Business line filter
   - Dispatch method filter
   - Date range filter
4. **Order Selection**:
   - Click "Dispatch Order" to enter dispatch cart
   - View order details and manifest

**Notes**:
- Only shows picked orders
- Dispatch priority indicators
- Auto-refresh for new orders

### Dispatch Cart Operations
**Purpose**: Complete order dispatch process

**Required Role**: Dispatcher, Back Office, Admin

**Steps**:
1. From dispatch queue, click "Dispatch Order"
2. **Order Manifest Review**:
   - All picked items with serial numbers
   - Quantities and availability info
   - Product images for verification
3. **Dispatch Entry**:
   - **Dispatch Method**: Select from dropdown
     - Courier
     - In-house Delivery
     - Pickup
     - Collection
     - Other
   - **Waybill Number**: Required for most methods
   - **Dispatcher Name**: Auto-populated or enter manually
   - **Package References**: 
     - Single package mode: One reference for all items
     - Multiple packages mode: Comma-separated references
   - **Dispatch Notes**: Optional additional information
4. **Package Management**:
   - **Single Package Mode**: Reference any one item to enable dispatch
   - **Multiple Packages Mode**: Each item must be individually referenced
5. **PDF Manifest Generation**:
   - Click "Download Manifest"
   - Generate PDF with order details
   - Print-ready format
6. **Complete Dispatch**:
   - Click "Mark as Dispatched"
   - Confirm dispatch details
   - System updates order status

**Notes**:
- Triggers N8N webhook notifications
- Updates tracking information
- Cannot dispatch without required fields

### Manifest Generation
**Purpose**: Create shipping documentation

**Required Role**: Dispatcher, Back Office, Admin

**Steps**:
1. In dispatch cart
2. Click "Download Manifest"
3. **PDF Contents**:
   - Order number and date
   - Customer information
   - Item list with quantities
   - Serial numbers
   - Dispatch method and waybill
4. **Print Options**:
   - Print directly
   - Save as PDF
   - Email to recipient

**Notes**:
- Auto-formatted for shipping labels
- Includes all required information
- Compatible with standard printers

### Package Reference Management
**Purpose**: Track individual packages in shipments

**Required Role**: Dispatcher, Back Office, Admin

**Steps**:
1. In dispatch cart
2. **Single Package Mode**:
   - Enter one reference number
   - Applies to all items
   - Quick for consolidated shipments
3. **Multiple Packages Mode**:
   - Enable "Multiple Packages" toggle
   - Enter reference for each item
   - Track individual packages
4. **Reference Validation**:
   - System validates format
   - Prevents duplicates
   - Shows reference count

**Notes**:
- Essential for tracking split shipments
- Used by courier systems
- Appears on customer notifications

### Waybill Tracking
**Purpose**: Monitor shipment progress

**Required Role**: All roles (filtered by permissions)

**Steps**:
1. Navigate to **Tracking** (`/tracking`)
2. **Waybill Search**:
   - Enter waybill number
   - Select courier service
   - Click "Track"
3. **Tracking Results**:
   - Current status
   - Location history
   - Estimated delivery
   - Delivery confirmation

**Notes**:
- Real-time updates from courier APIs
- Automatic status notifications
- Historical tracking data

---

## Asset Management

### Device Registry Management
**Purpose**: View and manage all tracked devices

**Required Role**: All roles (filtered by permissions)

**Steps**:
1. Navigate to **Asset Management** (`/asset-management`)
2. Select **Registry** tab
3. **Search and Filter**:
   - Search by serial number
   - Filter by device type
   - Filter by status (Available, In Use, Faulty, etc.)
   - Filter by business line
4. **Device Details**:
   - Click device to view full details
   - See device history
   - View current location and holder
5. **Device Actions**:
   - Update device status
   - Add movement records
   - Create repair tickets

**Device Status Options**:
- Available
- Installed
- Faulty
- In-Repair
- Decommissioned
- Unverified
- Missing

**Notes**:
- Real-time status updates
- Complete audit trail
- Role-based access control

### Repair Ticket Logging
**Purpose**: Report device faults and issues

**Required Role**: All roles

**Steps**:
1. Navigate to **Asset Management** (`/asset-management`)
2. Select **Repairs** tab
3. Click "Log Repair Ticket"
4. **Device Information**:
   - **Business Line**: Select (Cash Connect, ABSA, VPS, Accessories, Modems)
   - **Device Scanning**:
     - **Cash Connect**: Scan QR code (auto-parses serials)
     - **Other Lines**: Scan individual serial numbers
   - **Scanning Methods**:
     - Camera scan (click camera icon)
     - USB scanner (focus and scan)
5. **Device Validation**:
   - Green check if device found in registry
   - Red if not found (can still create ticket)
6. **Fault Information**:
   - **Item Status**: Functional/Faulty
   - **Overall Condition**: New/Good/Fair/Poor
   - **Fault Category**: Select from 19 predefined categories
   - **Fault Severity**: Low/Medium/High/Critical
   - **Fault Description**: Detailed description of issue
7. **Reporter Information**:
   - Auto-populated from logged-in user
   - Can modify if needed
8. **Submit Ticket**:
   - Review all information
   - Click "Log Repair Ticket"
   - Receive ticket number

**Fault Categories**:
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
- Assessment Pending
- Other

**Notes**:
- Auto-creates device status update to "Faulty"
- Generates ticket number for tracking
- Email notification to repair team

### Fault Assessment
**Purpose**: Diagnose and assess repair requirements

**Required Role**: Back Office, Admin, Repair Technician

**Steps**:
1. Navigate to **Asset Management** → **Repairs**
2. Find ticket with "Reported" status
3. Click "Start Assessment"
4. **Assessment Process**:
   - Review device information
   - Examine fault description
   - Test device functionality
5. **Assessment Results**:
   - **Repairable**: Yes/No
   - **Assessment Notes**: Detailed findings
   - **Estimated Repair Hours**: Time required
6. **Update Status**:
   - If repairable: Status changes to "In-Repair"
   - If not repairable: Status changes to "Decommissioned"
7. **Assign Technician**:
   - Select repair technician
   - Set repair priority

**Notes**:
- Assessment date automatically recorded
- Can edit assessment later if needed
- Triggers repair workflow

### Repair Status Updates
**Purpose**: Track repair progress

**Required Role**: Repair Technician, Back Office, Admin

**Steps**:
1. Navigate to **Asset Management** → **Repairs**
2. Find ticket in progress
3. **Status Updates**:
   - **Start Repair**: Change to "In-Repair"
   - **Complete Repair**: Change to "Quality-Check"
   - **Quality Check**: Change to "Repaired" or back to "In-Repair"
   - **Return to Stock**: Change to "Returned"
4. **Repair Details**:
   - **Repair Actions**: Work performed
   - **Parts Used**: Replacement parts
   - **Repair Cost**: Cost of repair
   - **Quality Check Notes**: Inspection results

**Repair Workflow**:
Reported → Assessing → In-Repair → Quality-Check → Repaired → Returned

**Notes**:
- Each status update timestamps automatically
- Repair metrics calculated for KPIs
- Email notifications at key stages

### DOA Device Logging
**Purpose**: Record Dead on Arrival devices

**Required Role**: Warehouse Staff, Back Office, Admin

**Steps**:
1. Navigate to **Asset Management** → **DOA/Returns**
2. Click "Log DOA Device"
3. **Device Information**:
   - **Business Line**: Select category
   - **Device Scanning**:
     - **Cash Connect**: Scan QR code
     - **Other Lines**: Scan serial numbers
   - **Scanning Options**: Camera or USB scanner
4. **Supplier Information**:
   - Supplier name
   - Purchase order number
   - Date received
5. **Fault Details**:
   - Fault description
   - Condition assessment
6. **Submit DOA**:
   - Creates repair ticket with "Dead On Arrival" category
   - Updates device status to "Faulty"
   - Records in DOA register

**Notes**:
- Auto-triggers RMA process
- Supplier notification workflow
- Quality metrics tracking

### RMA Initiation
**Purpose**: Start Return Merchandise Authorization process

**Required Role**: Back Office, Admin

**Steps**:
1. Navigate to **Asset Management** → **DOA/Returns**
2. Find DOA device
3. Click "Initiate RMA"
4. **RMA Details**:
   - **RMA Number**: Auto-generated or manual
   - **RMA Date**: Current date
   - **Expected Resolution Date**: Target date
   - **Supplier Notes**: Communication with supplier
5. **RMA Status**:
   - Pending → Shipped → Received → Resolved
6. **Submit RMA**:
   - Update device status
   - Notify supplier
   - Track in RMA register

**Notes**:
- RMA numbers must be unique
- Supplier integration for tracking
- Resolution time metrics

### RMA Status Tracking
**Purpose**: Monitor RMA progress

**Required Role**: Back Office, Admin

**Steps**:
1. Navigate to **Asset Management** → **DOA/Returns**
2. **Filter by RMA Status**:
   - Pending
   - Shipped
   - Received
   - Resolved
3. **Update Status**:
   - Select new status
   - Add notes
   - Update resolution date
4. **Close RMA**:
   - Mark as Resolved
   - Record outcome (Replaced/Refunded/Rejected)
   - Update device status

**Notes**:
- RMA aging reports
- Supplier performance metrics
- Cost recovery tracking

### Device Movement Tracking
**Purpose**: Track device location changes

**Required Role**: All roles (filtered by permissions)

**Steps**:
1. Navigate to **Asset Management** → **Movements**
2. **Movement History**:
   - View all device movements
   - Filter by device, date, or movement type
3. **Movement Types**:
   - Ingestion
   - Dispatch
   - Installation
   - Removal
   - Repair-In
   - Repair-Out
   - Transfer
   - Return
   - Decommission
4. **Create Movement**:
   - Select device
   - Choose movement type
   - Set from/to locations
   - Add notes
   - Submit movement record

**Notes**:
- Complete audit trail
- Chain of custody tracking
- Location history reports

### Device Installation
**Purpose**: Deploy devices to field locations

**Required Role**: Technician, Back Office, Admin

**Steps**:
1. Navigate to **Asset Management** → **Installations**
2. Click "New Installation"
3. **Device Selection**:
   - Choose device from registry
   - Verify device status (must be "Available")
4. **Installation Details**:
   - **Location**: Select vendor/site
   - **Installation Date**: Current date
   - **Installed By**: Auto-populated
   - **Installation Notes**: Details of installation
5. **Submit Installation**:
   - Updates device status to "Installed"
   - Creates movement record
   - Updates location tracking

**Notes**:
- Installation history maintained
- Device location updates
- Maintenance scheduling

### Device Decommissioning
**Purpose**: Retire devices from service

**Required Role**: Back Office, Admin

**Steps**:
1. Navigate to **Asset Management** → **Registry**
2. Find device to decommission
3. Click "Decommission"
4. **Decommission Details**:
   - **Reason**: Select reason for decommission
   - **Notes**: Additional details
   - **Date**: Decommission date
5. **Update Status**:
   - Changes to "Decommissioned"
   - Creates movement record
   - Removes from active inventory

**Notes**:
- Cannot decommission devices with open repair tickets
- Historical data preserved
- Asset value adjustments

---

## Stock Management

### Stock Counting - Monthly
**Purpose**: Perform comprehensive monthly inventory counts

**Required Role**: Warehouse Staff, Back Office, Admin

**Steps**:
1. Navigate to **Stock Counts** (`/stock-counts`)
2. **Count Configuration**:
   - **Count Type**: Select "Monthly"
   - **Stock Holder**: Your name/department
   - **Location**: Warehouse/area name
3. **Item Entry**:
   - **Category Filter**: Select item category
   - **Item Code**: Enter manually or scan barcode
   - **Device Type**: Auto-populated
   - **Quantity**: Enter counted quantity
4. **Barcode Scanning**:
   - Click camera icon for mobile scanning
   - Use USB scanner for rapid entry
   - Auto-populate item codes
5. **Serial Number Capture** (for serialized items):
   - Manufacture Serial Number
   - QR Code Serial Number
   - Xlink Serial Number
   - Cradle Serial Number
   - Charger Serial Number
6. **Item Condition**:
   - **Item Status**: Functional/Faulty
   - **Overall Condition**: New/Good/Fair/Poor
   - **Fault Reason**: Select from 18 categories
   - **Assessment Pending**: Available for undiagnosed devices
7. **Intelligent Fault Tracking**:
   - Auto-populated fault reasons from repair history
   - Repair history alerts for known devices
   - Consistent fault categorization
8. **Submit Count**:
   - Review all counted items
   - Click "Submit Stock Count"
   - Receive confirmation

**Notes**:
- Monthly counts required for all locations
- Serial number validation prevents duplicates
- Fault reasons auto-populated from repair history

### Stock Counting - Mid-Month
**Purpose**: Interim inventory verification

**Required Role**: Warehouse Staff, Back Office, Admin

**Steps**:
1. Navigate to **Stock Counts** (`/stock-counts`)
2. **Count Configuration**:
   - **Count Type**: Select "Mid-Month"
   - **Stock Holder**: Your name/department
   - **Location**: Specific area
3. **Targeted Counting**:
   - Focus on specific categories
   - High-value items priority
   - Problem areas identification
4. **Follow same process as monthly counting**

**Notes**:
- Less comprehensive than monthly
- Focus on high-risk items
- Trend analysis support

### Stock Counting - Daily
**Purpose**: Daily verification of critical items

**Required Role**: Warehouse Staff, Back Office, Admin

**Steps**:
1. Navigate to **Stock Counts** (`/stock-counts`)
2. **Count Configuration**:
   - **Count Type**: Select "Daily"
   - **Stock Holder**: Your name
   - **Location**: Specific area
3. **Critical Items Focus**:
   - High-value equipment
   - Fast-moving items
   - Previous discrepancies
4. **Quick Count Process**:
   - Barcode scanning for speed
   - Serial verification for key items
   - Condition status check

**Notes**:
- Quick verification process
- Focus on critical inventory
- Daily variance tracking

### Barcode Scanning
**Purpose**: Rapid item identification and data entry

**Required Role**: All roles

**Steps**:
1. **Camera Scanning**:
   - Click camera icon in any input field
   - Allow camera access
   - Position barcode/QR code in frame
   - Auto-capture and populate field
2. **USB Scanner Scanning**:
   - Focus cursor on input field
   - Scan barcode/QR code
   - Auto-populate field
   - Move to next field automatically
3. **Scanning Features**:
   - Front/back camera switching
   - Multiple scan modes
   - Validation feedback

**Supported Codes**:
- QR codes (Cash Connect devices)
- Code 128 barcodes
- Code 39 barcodes
- EAN-13 barcodes

**Notes**:
- Mobile-optimized camera interface
- USB scanner optimized for warehouse
- Real-time validation

### Serial Number Capture (Stock Ingestion)
**Purpose**: Register new devices with serial numbers

**Required Role**: Back Office, Admin

**Steps**:
1. Navigate to **Stock Ingestion** (`/stock-ingestion`)
2. **Batch Information**:
   - Receiving warehouse
   - Supplier information
   - Purchase order number
   - Date received
3. **Device Entry**:
   - **Business Line**: Select category
   - **Device Type**: Choose from gallery
   - **Item Nature**: Serialised/Non-serialised
4. **Serial Number Processing**:
   - **Cash Connect**: Scan QR code (auto-parses multiple serials)
   - **Other Lines**: Scan individual serial numbers
   - **Bulk Paste**: Paste multiple serials at once
   - **Validation**: Real-time duplicate detection
5. **Batch Processing**:
   - Process up to 4000+ devices
   - 100-device sub-batches
   - Progress tracking
   - Success/failure reporting

**Notes**:
- Automatic device registry creation
- Movement record generation
- Supplier tracking integration

### Stock Ingestion
**Purpose**: Register new stock into inventory

**Required Role**: Back Office, Admin

**Steps**:
1. Navigate to **Stock Ingestion** (`/stock-ingestion`)
2. **Batch Setup**:
   - **Receiving Warehouse**: Select destination
   - **Supplier**: Choose from list
   - **Purchase Order**: Enter PO number
   - **Date Received**: Current date
   - **Batch Notes**: Additional information
3. **Device Entry**:
   - Add devices individually or in bulk
   - Capture serial numbers
   - Validate device information
4. **Batch Processing**:
   - Review all devices in batch
   - Click "Process Batch"
   - Monitor progress
   - Review results
5. **Completion**:
   - Batch summary created
   - Device registry updated
   - Movement records generated

**Notes**:
- Large batch processing capability
- Error handling and recovery
- Audit trail maintenance

### Batch Processing
**Purpose**: Process large volumes of devices efficiently

**Required Role**: Back Office, Admin

**Steps**:
1. **Prepare Batch Data**:
   - CSV file with device information
   - Serial number lists
   - Supplier documentation
2. **Upload Batch**:
   - Select file or enter data manually
   - Validate format and content
   - Preview batch data
3. **Process Batch**:
   - System processes in 100-device chunks
   - Real-time progress tracking
   - Error logging and recovery
4. **Review Results**:
   - Success/failure counts
   - Error details
   - Retry failed items

**Performance**:
- 4000+ devices per batch
- 100-device sub-batches for API optimization
- Progress tracking with percentage
- Automatic retry on failures

**Notes**:
- Suitable for large shipments
- Background processing capability
- Comprehensive error reporting

### Stock Administration
**Purpose**: Manage inventory item master data

**Required Role**: Back Office, Admin

**Steps**:
1. Navigate to **Stock Admin** (`/stock-admin`)
2. **Item Management**:
   - **Add Item**: Create new inventory items
   - **Edit Item**: Update existing items
   - **Delete Item**: Remove unused items
   - **Activate/Deactivate**: Control item availability
3. **Item Details**:
   - Item name and description
   - Item code assignment
   - Business line categorization
   - Item nature (Serialised/Non-serialised)
   - Product images and URLs
4. **Bulk Operations**:
   - Import items from CSV
   - Export catalog to CSV
   - Batch updates
   - Data validation

**Notes**:
- Centralized item management
- Business line organization
- Image and URL support

### Product Catalog Management
**Purpose**: Maintain inventory item database

**Required Role**: Back Office, Admin

**Steps**:
1. Navigate to **Stock Admin** (`/stock-admin`)
2. **Catalog Operations**:
   - Add new products
   - Update product information
   - Manage product categories
   - Update product images
3. **Data Quality**:
   - Validate item codes
   - Check for duplicates
   - Ensure category consistency
4. **Bulk Updates**:
   - CSV import/export
   - Mass price updates
   - Category changes

**Notes**:
- Product information centralization
- Image management
- Category organization

### Stock Alerts
**Purpose**: Monitor inventory levels and triggers

**Required Role**: Back Office, Admin

**Steps**:
1. Navigate to **KPI Dashboard** (`/kpi`)
2. Select the **Alerts** tab
3. **Alert Types**:
   - **Out of Stock**: 0 units available
   - **Critical**: 1-5 units or ≤3 days stock
   - **Warning**: 6-10 units or ≤7 days stock
   - **Velocity-based**: Based on usage patterns
4. **Alert Management**:
   - View all active alerts
   - Filter by business line or location
   - Filter by severity level
   - Export alert data
5. **Alert Resolution**:
   - Review alert details
   - Create purchase orders from alerts
   - Track alert trends over time

**Alert Features**:
- Automatic threshold calculation
- Business line filtering
- Location-based aggregation
- Real-time monitoring
- Historical alert tracking

**Notes**:
- Proactive inventory management
- Integrated with KPI dashboard
- Alerts update automatically based on stock movements

---

## Analytics & Reporting

### KPI Dashboard Navigation
**Purpose**: Monitor operational performance metrics

**Required Role**: Back Office, Admin

**Steps**:
1. Navigate to **KPI Dashboard** (`/kpi`)
2. **Dashboard Tabs** (8 comprehensive tabs):
   - **Overview**: High-level operational metrics
   - **Orders**: Detailed order lifecycle metrics
   - **Stock**: Inventory availability metrics
   - **Repairs**: Fault analysis and repair metrics
   - **Pipeline**: Order processing pipeline
   - **Devices**: Device health and distribution
   - **Exceptions**: Data integrity monitoring
   - **Trends**: Historical performance analysis
3. **Filtering Options**:
   - Year selection
   - Month selection
   - Business line filter (All, Cash Connect, ABSA, VPS, etc.)
   - Auto-refresh capability
4. **Metric Interaction**:
   - Click metrics for detailed breakdowns
   - Drill-down into specific data
   - Export charts and data

**Key Metrics**:
- Order fulfillment rates
- SLA compliance percentages
- Cycle time analysis
- Stock availability distribution
- Device health rates
- Repair resolution rates

**Notes**:
- Real-time data updates
- Business line dimensional analysis
- Interactive visualizations

### SLA Tracking and Compliance
**Purpose**: Monitor order fulfillment against Service Level Agreement targets

**Required Role**: Back Office, Admin

**SLA Rules**:
The system enforces automatic SLA tracking based on order time:
- **Orders placed before 12:00 PM**: Must be picked and dispatched same day
- **Orders placed after 12:00 PM**: Must be picked and dispatched by 3:00 PM next business day

**Steps to Monitor SLA**:
1. Navigate to **KPI Dashboard** (`/kpi`)
2. **Overview Tab** displays:
   - **SLA Compliance** card showing compliance percentage
   - Color-coded indicators:
     - Green: ≥95% compliance (excellent)
     - Amber: 80-94% compliance (needs attention)
     - Red: <80% compliance (critical)
   - Total SLA breaches count
3. **Alerts Tab** shows:
   - Active SLA breach alerts for orders past deadline
   - Order ID, business line, and time overdue
   - Click alerts to view order details
4. **Orders Tab** provides:
   - Detailed order-level SLA status
   - Breakdown by pick status and dispatch status
   - Time remaining or overdue for each order

**SLA Calculation Logic**:
1. System calculates deadline based on order timestamp
2. Compares current time against deadline
3. Updates breach status in real-time
4. Aggregates compliance rate: `(Total Pending Orders - Breached Orders) / Total Pending Orders × 100`

**SLA Breach Alerts**:
When SLA is breached:
- Alert appears in KPI Dashboard → Alerts tab
- Breach count increments on Overview card
- Order highlighted in red on Orders tab
- Warehouse teams can prioritize breached orders in Picking Queue

**Use Cases**:
- **Operations Manager**: Monitor daily SLA compliance across all business lines
- **Warehouse Manager**: Identify and prioritize delayed orders
- **Executive Dashboard**: Track operational efficiency trends
- **Performance Review**: Historical SLA compliance reporting

**Best Practices**:
- Check SLA Compliance card daily at start of shift
- Prioritize picking orders approaching SLA deadline
- Investigate root causes of repeated SLA breaches
- Filter by business line to identify problem areas
- Use Alerts tab for immediate breach notifications

**Notes**:
- SLA tracking is automatic - no manual entry required
- Excludes weekends and holidays from next-day calculations
- Breach alerts clear automatically once order is dispatched
- Historical SLA data available in Trends tab for performance analysis

### Business Line Analysis
**Purpose**: Compare performance across business lines

**Required Role**: Back Office, Admin

**Steps**:
1. In KPI Dashboard, use business line filter
2. **Analysis Views**:
   - **Overview Tab**: Business line order fulfillment comparison
   - **Pipeline Tab**: Pending orders breakdown by business line
   - **Devices Tab**: Stock distribution and health by business line
   - **Orders Tab**: Business line performance comparison
3. **Comparative Metrics**:
   - Order volumes per business line
   - Fulfillment rates comparison
   - Stock health rates per business line
   - Device inventory distribution
4. **Visualizations**:
   - Compact charts for quick comparison
   - Color-coded performance indicators
   - Trend analysis by business line

**Business Lines**:
- Cash Connect
- ABSA
- VPS
- Accessories
- Modems
- Sim Management

**Notes**:
- Integrated across all dashboard tabs
- Real-time filtering
- Performance benchmarking

### Exception Monitoring
**Purpose**: Track data integrity issues

**Required Role**: Back Office, Admin

**Steps**:
1. Navigate to **KPI Dashboard** → **Exceptions** tab
2. **Exception Types**:
   - **Orphaned Stock Count Serials**: Devices scanned but not in registry
   - **Duplicate Serial Numbers**: Serials appearing multiple times
3. **Exception Details**:
   - Serial number
   - Location and user who scanned
   - Scan date
   - Resolution status
4. **Exception Management**:
   - Assign to team member
   - Add resolution notes
   - Track resolution progress
   - Prevent future occurrences

**Use Cases**:
- Identify devices needing ingestion
- Detect data entry errors
- Maintain registry integrity
- Operational discrepancy tracking

**Notes**:
- Real-time exception detection
- Automated alerting
- Resolution workflow tracking

### Stock Count Reporting
**Purpose**: Analyze stock count history and accuracy

**Required Role**: Admin, Back Office (own counts), Users (own counts)

**Steps**:
1. Navigate to **Stock Counts Report** (`/stock-counts-report`)
2. **Filtering Options**:
   - **Count Type**: Monthly, Mid-Month, Daily, All
   - **Count Period**: Select specific period
   - **User**: Filter by who performed count
   - **Search**: By device type or description
3. **Results Display**:
   - Sortable data table
   - Columns: Date, Stock Holder, Device, Item Code, Quantity, Status, User
   - Badge-based status indicators
   - Pagination for large datasets
4. **Export Functionality**:
   - Download filtered data to CSV
   - Full dataset export
   - Report formatting options

**Role-Based Access**:
- **Admins**: See all counts across all users
- **Users**: See only their own counts
- **Back Office**: See all counts with full details

**Notes**:
- Historical analysis capability
- Accuracy trend tracking
- User performance metrics

### Performance Metrics Review
**Purpose**: Comprehensive performance analysis

**Required Role**: Back Office, Admin

**Steps**:
1. Navigate to **KPI Dashboard** (`/kpi`)
2. **Performance Categories**:
   - **Order Processing**: Cycle times, fulfillment rates
   - **Warehouse Operations**: Picking efficiency, dispatch rates
   - **Asset Management**: Device health, repair metrics
   - **Inventory Management**: Stock accuracy, turnover rates
3. **Time-Based Analysis**:
   - Monthly performance trends
   - Year-over-year comparisons
   - Seasonal pattern identification
4. **Benchmarking**:
   - Internal benchmarks
   - Industry standards comparison
   - Goal vs actual performance

**Key Performance Indicators**:
- Order fulfillment rate (>95% target)
- SLA compliance rate (>90% target)
- Average cycle time (<48 hours target)
- Stock accuracy (>98% target)
- Device health rate (>85% target)

**Notes**:
- Automated calculations
- Visual trend analysis
- Performance alerts

---

## Troubleshooting & FAQs

### Common Issues & Solutions

#### Order Management Issues

**Issue**: Order not appearing in picking queue
**Causes**:
- Order not submitted successfully
- Order already picked
- Order cancelled
**Solutions**:
1. Check order status in tracking
2. Verify order completion
3. Contact system admin

**Issue**: Cannot modify order
**Causes**:
- Order already picked
- Order already dispatched
- Insufficient permissions
**Solutions**:
1. Check order status
2. Contact supervisor for changes
3. Cancel and recreate if necessary

#### Warehouse Operations Issues

**Issue**: Scanner not working
**Causes**:
- USB scanner not connected
- Camera access denied
- Barcode damaged
**Solutions**:
1. Check USB connection
2. Allow camera permissions
3. Try manual entry
4. Clean barcode

**Issue**: Serial number validation failed
**Causes**:
- Serial already in use
- Invalid format
- Device not found in registry
**Solutions**:
1. Check for duplicate entry
2. Verify serial format
3. Contact admin for device registration

#### Asset Management Issues

**Issue**: Cannot create repair ticket
**Causes**:
- Device not found
- Insufficient permissions
- System maintenance
**Solutions**:
1. Verify device serial
2. Check user permissions
3. Contact support

**Issue**: RMA process stuck
**Causes**:
- Supplier not responding
- Documentation missing
- System error
**Solutions**:
1. Contact supplier directly
2. Upload required documents
3. Escalate to management

#### Stock Management Issues

**Issue**: Stock count not submitting
**Causes**:
- Required fields missing
- Network connectivity
- Validation errors
**Solutions**:
1. Complete all required fields
2. Check internet connection
3. Fix validation errors

**Issue**: Duplicate serial numbers
**Causes**:
- Data entry error
- System sync issue
- Batch processing error
**Solutions**:
1. Verify correct serial
2. Check recent entries
3. Contact admin for correction

### Error Messages Reference

#### Order Management
- "Order already picked": Order cannot be modified
- "Invalid delivery address": Check address format
- "Insufficient stock": Items not available
- "Order limit exceeded": Contact admin for increase

#### Warehouse Operations
- "Invalid waybill format": Check waybill number
- "Serial number not found": Device not in registry
- "Package reference required": Enter tracking number
- "Dispatch method required": Select delivery method

#### Asset Management
- "Device already in repair": Ticket exists for device
- "Invalid fault category": Select from dropdown
- "RMA already exists": Check existing RMA records
- "Cannot decommission active device": Complete repair first

#### Stock Management
- "Duplicate serial number": Serial already exists
- "Invalid quantity format": Enter numeric value
- "Batch size exceeded": Reduce batch size
- "Required field missing": Complete all required fields

### Performance Issues

#### Slow Loading
**Causes**:
- Large dataset loading
- Network connectivity
- Browser caching
**Solutions**:
1. Use filters to reduce data
2. Check internet speed
3. Clear browser cache
4. Try different browser

#### Scanner Issues
**Causes**:
- Device compatibility
- Driver issues
- USB port problems
**Solutions**:
1. Test scanner on different device
2. Update scanner drivers
3. Try different USB port
4. Use camera scanning as backup

### Contact Support

**When to Contact Support**:
- System errors persisting after troubleshooting
- Feature not working as documented
- Data integrity concerns
- Performance issues affecting operations

**Information to Provide**:
- User role and permissions
- Specific error messages
- Steps to reproduce issue
- Browser and device information
- Time of occurrence

**Support Channels**:
- Email: support@4danalytics.com
- Phone: [Support Number]
- In-app support ticket system

---

## Technical Setup

### Environment Configuration

#### Required Environment Variables
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Legacy Airtable Integration (Optional)
VITE_AIRTABLE_PAT=your_airtable_pat
VITE_AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
VITE_AIRTABLE_INVENTORY_TABLE_ID=tblXXXXXXXXXXXXXX
VITE_AIRTABLE_POINT_OF_PRESENCE_TABLE_ID=tblXXXXXXXXXXXXXX
VITE_AIRTABLE_BUSINESS_LINES_TABLE_ID=tblXXXXXXXXXXXXXX
VITE_AIRTABLE_UNIQUE_ORDERS_TABLE_ID=tblXXXXXXXXXXXXXX
VITE_AIRTABLE_ORDERS_TABLE_ID=tblXXXXXXXXXXXXXX
VITE_AIRTABLE_DISPATCH_LOG_TABLE_ID=tblXXXXXXXXXXXXXX

# N8N Webhook URLs
VITE_N8N_ORDER_PLACED_WEBHOOK_URL=https://your-n8n-host/webhook/submit-order
VITE_N8N_ORDER_PICKED_WEBHOOK_URL=https://your-n8n-host/webhook/order-picked
VITE_N8N_ORDER_DISPATCHED_WEBHOOK_URL=https://your-n8n-host/webhook/order-dispatched
```

### Webhook Configuration

#### N8N Workflow Setup
**Purpose**: Automate order processing and notifications

**Required Webhooks**:
1. **Order Placed**: Triggered when new order submitted
2. **Order Picked**: Triggered when order picking completed
3. **Order Dispatched**: Triggered when order dispatched

**Setup Steps**:
1. Create workflows in n8n
2. Configure webhook triggers
3. Set up authentication
4. Test webhook endpoints
5. Activate workflows

**Payload Structure**:
```json
{
  "orderId": "ORD-0011",
  "uniqueOrderRecordId": "recXXXXXXXXXXXXXX",
  "totalQuantity": 5,
  "pickedQuantity": 5,
  "dateOrdered": "2025-10-19",
  "orderedBy": "user@example.com",
  "deliveryParty": "Technician",
  "pickedItems": [
    {
      "stockOrderId": "recYYYYYYYYYYYYYY",
      "deviceType": "device-name",
      "quantity": 2,
      "stockAvailability": "In Stock",
      "pickStatus": "Picked in full",
      "packer": "picker@example.com",
      "terminalSerialNumber": "SN123456",
      "chargerPacked": "Y",
      "cables": "Y"
    }
  ],
  "metadata": {
    "pickedAt": "2025-10-19T12:30:00.000Z",
    "pickerEmail": "picker@example.com"
  }
}
```

### Database Schema

#### Core Tables (Supabase)
- `user_profiles`: User authentication and roles
- `inventory_items`: Product catalog
- `stock_orders`: Order headers
- `stock_order_items`: Order line items
- `unique_orders`: Order aggregation
- `dispatch_log`: Dispatch records
- `device_registry`: Asset tracking
- `repair_tickets`: Repair workflow
- `stock_counts`: Inventory counts
- `point_of_presence`: Technician roster

#### Key Relationships
- `stock_orders` → `stock_order_items` (1:N)
- `unique_orders` → `stock_orders` (1:N)
- `device_registry` → `repair_tickets` (1:N)
- `point_of_presence` → `stock_orders` (1:N via technician)

### Integration Points

#### Courier APIs
**Purpose**: Real-time shipment tracking

**Supported Couriers**:
- Collivery (primary)
- FedEx (secondary)
- DHL (secondary)

**Configuration**:
1. Obtain API credentials
2. Configure in system settings
3. Test tracking endpoints
4. Set up webhook notifications

#### Email Service
**Purpose**: Automated notifications

**Email Types**:
- Order confirmations
- Dispatch notifications
- Status updates
- Alert notifications

**SMTP Configuration**:
1. Configure SMTP server
2. Set up email templates
3. Test email delivery
4. Configure bounce handling

### Security Configuration

#### Authentication
- Supabase Auth integration
- Row Level Security (RLS)
- JWT token management
- Session timeout configuration

#### Data Protection
- HTTPS enforcement
- Data encryption at rest
- Audit logging
- Access control lists

### Performance Optimization

#### Caching Strategy
- React Query for API caching
- Browser caching for static assets
- Database query optimization
- CDN for static content

#### Monitoring
- Application performance monitoring
- Database performance metrics
- User activity tracking
- Error logging and alerting

---

## Appendix

### User Role Matrix

| Feature | User | Back Office | Admin |
|---------|------|-------------|-------|
| Stock Order | ✓ | ✓ | ✓ |
| Stock Counts | ✓ | ✓ | ✓ |
| Asset Management | Limited | ✓ | ✓ |
| Picking Queue | ✗ | ✓ | ✓ |
| Dispatch Queue | ✗ | ✓ | ✓ |
| KPI Dashboard | ✗ | ✓ | ✓ |
| User Management | ✗ | Limited | ✓ |
| Stock Admin | ✗ | ✓ | ✓ |
| Stock Ingestion | ✗ | ✓ | ✓ |

### Business Line Reference

| Business Line | Item Nature | Serial Numbers Required |
|---------------|-------------|------------------------|
| Cash Connect | Serialised | Yes (QR code) |
| ABSA | Serialised | Yes (Individual) |
| VPS | Serialised | Yes (Individual) |
| Accessories | Mixed | Depends on item |
| Modems | Serialised | Yes (Individual) |
| Sim Management | Non-serialised | No |

### Fault Categories Reference

| Category | Description | Common Causes |
|----------|-------------|---------------|
| Dead On Arrival | Device failed on arrival | Manufacturing defect, shipping damage |
| Screen Damaged | Display issues | Impact, pressure, moisture |
| Battery Issues | Power problems | Age, usage, defect |
| Power Button Faulty | Control button failure | Wear, impact, moisture |
| Keypad Not Working | Input failure | Wear, contamination, damage |
| Camera Faulty | Imaging issues | Lens damage, sensor failure |
| Speaker/Microphone Issues | Audio problems | Component failure, blockage |
| Charging Port Damaged | Power connection failure | Wear, damage, debris |
| Software Malfunction | System errors | Bugs, corruption, updates |
| Network/Connectivity Issues | Communication failure | SIM, antenna, software |
| Printer Not Working | Receipt printing failure | Paper jam, mechanism failure |
| Card Reader Faulty | Card processing failure | Reader head, software |
| Touch Screen Not Responsive | Input failure | Calibration, damage, software |
| Physical Damage | Visible damage | Impact, drops, pressure |
| Water Damage | Moisture exposure | Spills, rain, humidity |
| Overheating | Temperature issues | Ventilation, component failure |
| Assessment Pending | Under evaluation | Initial diagnosis needed |
| Other | Unclassified issues | Miscellaneous problems |

### Serial Number Formats

| Device Type | Format | Example |
|-------------|--------|---------|
| Cash Connect | QR code, comma-separated | SN001,SN002,SN003 |
| Terminal | Alphanumeric | CC123456789 |
| Cradle | Alphanumeric | CR987654321 |
| Charger | Alphanumeric | CH456789123 |
| Manufacture | Manufacturer format | VAR-MODEL-SERIAL |

### Status Reference

#### Order Statuses
- **Pending**: Awaiting processing
- **Approved**: Order approved for fulfillment
- **Picked**: Items picked from inventory
- **Dispatched**: Shipped to recipient
- **Delivered**: Received by recipient
- **Cancelled**: Order cancelled
- **Returned**: Items returned to inventory

#### Pick Statuses
- **Not Picked**: Awaiting picking
- **Pending**: Partially picked
- **Picked in full**: All items picked
- **Partially picked**: Some items picked
- **Not picked**: No items picked

#### Device Statuses
- **Available**: Ready for deployment
- **Installed**: Currently deployed
- **Faulty**: Reported issue
- **In-Repair**: Being repaired
- **Decommissioned**: Retired from service
- **Unverified**: Status unknown
- **Missing**: Cannot locate

#### Repair Statuses
- **Reported**: Issue reported
- **Assessing**: Under evaluation
- **In-Repair**: Being repaired
- **Quality-Check**: Final inspection
- **Repaired**: Repair completed
- **Returned**: Back in circulation
- **Decommissioned**: Beyond repair

### Quick Reference Commands

#### Keyboard Shortcuts
- **Ctrl+S**: Save current form
- **Ctrl+Enter**: Submit form
- **Escape**: Cancel operation
- **F5**: Refresh data
- **Ctrl+F**: Search in lists

#### Barcode Scanner Commands
- **Auto-focus**: Automatic field focus
- **Tab navigation**: Move between fields
- **Enter confirmation**: Confirm scan
- **Escape cancel**: Cancel scan

#### Mobile Gestures
- **Swipe left**: Navigate to next item
- **Swipe right**: Previous item
- **Tap**: Select item
- **Long press**: Context menu

### Contact Information

#### Technical Support
- **Email**: support@4danalytics.com
- **Phone**: +27 12 345 6789
- **Hours**: Monday-Friday 8:00-17:00 CAT
- **Emergency**: +27 83 123 4567

#### Business Support
- **Account Manager**: Contact your assigned manager
- **Training**: training@4danalytics.com
- **Documentation**: docs@4danalytics.com

#### System Status
- **Status Page**: status.4danalytics.com
- **Maintenance Window**: Sundays 02:00-04:00 CAT
- **Emergency Notifications**: System alerts via email

---

*Document Version: 1.0*
*Last Updated: November 2024*
*Next Review: February 2025*

This comprehensive workflow guide covers all 47 documented processes in the 4D Analytics Inventory Management System. For the most current information, check the system documentation or contact support.
