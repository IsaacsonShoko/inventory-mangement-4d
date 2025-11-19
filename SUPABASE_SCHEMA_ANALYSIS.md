# Inventory Management System - Supabase Schema Analysis

## System Overview
This is an inventory management application with a three-stage workflow:
1. **Stock Order Creation** - Orders placed by users
2. **Picking** - Physical picking of items from warehouse stock
3. **Dispatch** - Shipment of items to recipients

---

## DATABASE TABLES & ENTITIES

### 1. **Unique_Orders** (Master Orders Table)
**Purpose**: Single master record per order, aggregating all line items and overall order status

**Primary Key**: Order ID (autoNumber)

**Key Fields**:
- `Order ID` (autoNumber) - Unique order identifier, auto-generated
- `Date Ordered` (DateTime) - Order placement date
- `Item Category` (Text) - Primary item category (e.g., Accessories, Absa, Cash Connect, Modems, Sim Management, VPS, Other)
- `Item Nature` (Text) - Serialised or Non-serialised
- `Quantity Ordered` (Number) - Total quantity across all items
- `Region` (Text) - Delivery region
- `Contractor Company` (Text) - Associated contractor/company
- `Technician` (Text) - Assigned technician
- `Ordered by` (Text) - User who placed order
- `Deliver to Part` (Text) - Delivery recipient type: 'Technician', 'Regional Warehouse', 'Non Technician'
- `On Behalf of` (Text) - Secondary ordering party
- `PoPID` (Text) - Point of Presence ID
- `Order Location` (Text) - Origin/location of order
- `Recipient Name` (Text) - Recipient full name
- `Recipient Company Name` (Text) - Recipient organization
- `Recipient Address` (Text) - Delivery address
- `Recipient Contact Number` (Text) - Recipient phone
- `Recipient Email Address` (Text) - Recipient email
- `CellPhone Number` (Text) - Contact phone number
- `WayBill Number` (Text) - Shipping reference number

**Status Fields** (Single Select):
- `Dispatch Status` - Options: Pending, Dispatched, Partial, Cancelled, Returned
- `Stock Availability` - Options: Available, Not Available, Backordered, Partial
- `Pick Status` - Options: Pending, Picked, Partially Picked, Not Picked
- `Dispatch Method` - Options: Courier, In-house Delivery, Pickup, Other

**Other Fields**:
- `Warehouse Fulfilling` (Text) - Warehouse handling the order
- `Order Notes` (Multiline Text) - Additional notes
- `Order Summary (AI Generated)` (AI Text) - Auto-generated summary
- `Attachments` (Multiple Attachments)

**Linked Records**:
- `Dispatch Log` (1-to-Many) → Links to Dispatch_Log records
- `Stock Order` (1-to-Many) → Links to Stock_Order line items

---

### 2. **Stock_Order** (Line Items Table)
**Purpose**: Individual line item records for each unique item in an order

**Primary Key**: ID (autoNumber)

**Key Fields**:
- `ID` (autoNumber) - Line item identifier
- `Order Id` (Text) - References Unique_Orders.Order ID
- `Device type` (Text) - Device/product name
- `Date Ordered` (Date) - Order date
- `Quantity ordered` (Number) - Original quantity ordered
- `QTY dispatched` (Number) - Quantity physically dispatched
- `Item Category` (Text) - Product category
- `Item Description` (Text) - Product description
- `Item Nature` (Text) - Serialised or Non-serialised
- `Contractor Company` (Text) - Contractor name
- `Region` (Text) - Region code
- `Technician` (Text) - Assigned technician
- `Ordered by` (Text) - User who ordered
- `Order Location` (Text) - Order origin
- `Waybill number` (Text) - Shipping reference
- `Dispatch to` (Text) - Recipient info
- `Warehouse Fulfilling` (Text) - Fulfilling warehouse
- `Tech email` (Text) - Technician email

**Status Fields** (Single Select):
- `Pick Status` - Options: Pending, Picked, Partially Picked, Not Picked
- `Dispatch Status` - Options: Pending, Dispatched, Partial, Cancelled, Returned
- `Dispatch / order` - Options: Dispatch, Order

**Linked Records**:
- `Related Unique Order` (Many-to-1) → Links back to Unique_Orders
- `Related Dispatch Log Entry` (1-to-Many) → Links to Dispatch_Log records

---

### 3. **Dispatch_Log** (Dispatch Tracking)
**Purpose**: Records each dispatch event with detailed item and recipient information

**Primary Key**: ID (autoNumber)

**Key Fields**:
- `ID` (autoNumber) - Log entry identifier
- `Date Dispatched` (Date) - Dispatch date
- `Item Category` (Text)
- `Item Nature` (Text)
- `Item Description` (Text)
- `Device type` (Text)
- `Quantity` (Number) - Quantity in this dispatch
- `Contractor Company` (Text)
- `Region` (Text)
- `Technician` (Text)
- `Waybill number` (Text)
- `Package Reference` (Text) - Package ID
- `Stock Availability` (Text) - Stock status at dispatch
- `Pick Status` (Text) - Picking status
- `Warehouse Fulfilling` (Text)

**Serial Number Fields** (for serialized items):
- `Terminal Serial Number` (Text)
- `Cradle Serial Number` (Text)
- `Charger Serial Number` (Text)
- `CashConnect Serial Number` (Text)

**Packing Details**:
- `Charger Packed` (Text/Boolean) - 'Yes'/'No'
- `Cables` (Text/Boolean) - 'Yes'/'No'
- `Packer` (Text) - Person who packed item
- `Dispatcher` (Text) - Person who dispatched

**Dispatch Method** (Single Select):
- Options: Courier, In-house Delivery, Pickup, Other

**Linked Records**:
- `Order Id` (Many-to-1) → Links to Unique_Orders record

---

### 4. **Inventory_Items** (Product Catalog)
**Purpose**: Master catalog of all available products/items

**Primary Key**: Item_Name (multiline text)

**Fields**:
- `Item_Name` (Text) - Product name/identifier
- `Item_Url` (Text/URL) - Product image or info URL
- `Item_Category` (Single Select) - Options: Other, Cash Connect, VPS, Modems, SIM Management, Accessories, ABSA
- `Item_Description` (Text) - Product description
- `Item_Nature` (Text) - Serialised or Non-serialised

---

### 5. **Point_of_Presence** (Technicians & Locations)
**Purpose**: Directory of technicians, contractors, and their associated data

**Primary Key**: ID (number)

**Key Fields**:
- `ID` (Number)
- `Name & Surname` (Text)
- `Contractor` (Text) - Company name
- `Region` (Text) - Service region
- `Email Address` (Text)
- `Contact Number` / `Mobile` (Text/Number)
- `Area Based` (Text) - Service area
- `Location Code` (Text)
- `Physical Address` (Text)
- `Latitude` (Number)
- `Longitude` (Number)

**Training & Certification Fields**:
- Tech ID, Absa Training Completed, CC Training Start/End Date
- CC Ride along Completed, Poly Graph Date, etc.

**Additional Fields**:
- AD, Systems, Wiki Updates, Comments (various)
- MRM, SAP, Safe Control and Skipper App assignments

---

## DATA RELATIONSHIPS

### Relationship Diagram:
```
┌─────────────────────────────────┐
│      Unique_Orders              │
│  (Master Order Header)          │
│  - Order ID (PK)                │
│  - Date Ordered                 │
│  - Status Fields                │
│  - Recipient Info               │
└────────────┬────────────────────┘
             │
             ├──────────────────────────┐
             │                          │
    (1-to-Many)              (1-to-Many)
             │                          │
             ▼                          ▼
    ┌─────────────────────┐  ┌──────────────────────┐
    │   Stock_Order       │  │   Dispatch_Log       │
    │  (Line Items)       │  │  (Dispatch Events)   │
    │ - Order Id (FK)     │  │ - Order Id (FK)      │
    │ - Device Type       │  │ - Date Dispatched    │
    │ - Qty Ordered       │  │ - Serial Numbers     │
    │ - Qty Dispatched    │  │ - Packing Details    │
    │ - Pick Status       │  │ - Dispatch Method    │
    └─────────────────────┘  └──────────────────────┘
             │                          ▲
             └──────────┬───────────────┘
                  (1-to-Many)

    ┌─────────────────────┐
    │ Inventory_Items     │
    │  (Product Catalog)  │
    │ - Item_Name (PK)    │
    │ - Item_Category     │
    │ - Item_Nature       │
    │ - Description       │
    └─────────────────────┘

    ┌─────────────────────┐
    │ Point_of_Presence   │
    │  (Technicians)      │
    │ - ID (PK)           │
    │ - Name              │
    │ - Contractor        │
    │ - Region            │
    └─────────────────────┘
```

### Key Relationships:

1. **Unique_Orders → Stock_Order** (One-to-Many)
   - Each master order has multiple line items
   - FK: `Stock_Order.Order Id` references `Unique_Orders.Order ID`

2. **Unique_Orders → Dispatch_Log** (One-to-Many)
   - Each order may have multiple dispatch events
   - FK: `Dispatch_Log.Order Id` references `Unique_Orders.Order ID`

3. **Stock_Order → Dispatch_Log** (One-to-Many)
   - Each line item may be dispatched in multiple shipments
   - FK: `Dispatch_Log` linked to `Stock_Order` via Related Dispatch Log Entry

4. **Stock_Order → Inventory_Items** (Many-to-One, implicit)
   - Stock_Order.Device Type references Inventory_Items.Item_Name

5. **Unique_Orders → Point_of_Presence** (Many-to-One, implicit)
   - Orders reference technicians/contractors by name/ID

---

## APP WORKFLOW - Order to Picking to Dispatch

### STAGE 1: ORDER CREATION (Stock Order Page)
**URL**: `/stock-order`

**Process**:
1. User creates order with:
   - Date Ordered
   - Item Category & Nature
   - Delivery Party (Technician/Regional Warehouse/Non-Technician)
   - Recipient information
   - Quantity for each item

2. System Action:
   - Creates single record in `Unique_Orders` with aggregated data
   - Sets initial status: `Dispatch Status = "Pending"`, `Pick Status = "Pending"`
   - Sends webhook to n8n with line items
   - n8n creates individual `Stock_Order` records for each item

3. **Data Flow**:
   ```
   Form Input → Unique_Orders (create) → 
   n8n Webhook → Stock_Order (create multiple)
   ```

---

### STAGE 2: PICKING (Picking Queue & Picking Cart)
**URLs**: `/picking` (queue), `/picking/cart/:recordId` (detail)

**Queue View** (`PickingQueue.tsx`):
1. Shows all orders with `Pick Status` = "Pending" or empty
2. Grouped by Item Category (Business Line):
   - Absa, Cash Connect, VPS, Modems, Accessories, Sim Management, Other
3. Displays order stats: total orders, total items

**Picking Cart Detail**:
1. Shows individual `Stock_Order` line items for the order
2. User scans/records:
   - Serial numbers (Terminal, Cradle, Charger, CashConnect)
   - Quantity picked
   - Charger Packed (Yes/No)
   - Cables (Yes/No)
   - Picker name

3. System Action:
   - Updates `Stock_Order`:
     - `QTY dispatched` = quantity picked
     - `Pick Status` = "Picked" / "Partially Picked"
   - Updates `Unique_Orders.Pick Status` based on aggregation

4. **Data Flow**:
   ```
   Stock_Order.Pick Status ← User input
   Stock_Order.QTY dispatched ← User input
   Unique_Orders.Pick Status ← Aggregated from Stock_Order items
   ```

---

### STAGE 3: DISPATCH (Dispatch Queue & Dispatch Cart)
**URLs**: `/dispatching` (queue), `/dispatching/cart/:recordId` (detail)

**Queue View** (`DispatchQueue.tsx`):
1. Shows orders where:
   - `Pick Status` = "Picked" OR "Partially Picked"
   - `Dispatch Status` = "Pending" or empty
2. Grouped by Item Category
3. Associated `Dispatch Log` entries shown for each order

**Dispatch Cart Detail**:
1. Shows individual `Stock_Order` line items ready to dispatch
2. User records:
   - Final serial numbers (if not pre-filled)
   - Dispatch Method: Courier, In-house Delivery, Pickup, Other
   - WayBill Number
   - Packer name
   - Dispatcher name
   - Final verification of quantities

3. System Action:
   - Creates `Dispatch_Log` record(s) for each item
   - Updates `Stock_Order.Dispatch Status`
   - Updates `Unique_Orders.Dispatch Status`
   - Sends webhook to n8n for email notification

4. **Data Flow**:
   ```
   Stock_Order [picked] → Dispatch_Log (create) →
   Unique_Orders.Dispatch Status ← Update
   → n8n Webhook (notification email)
   ```

---

## STATUS FIELD VALUES

### Pick Status
- `Pending` - Not yet picked
- `Picked` - Fully picked
- `Partially Picked` - Partially picked (some items only)
- `Not Picked` - Not picked

### Dispatch Status
- `Pending` - Not yet dispatched
- `Dispatched` - Fully dispatched
- `Partial` - Partially dispatched
- `Cancelled` - Order cancelled
- `Returned` - Items returned

### Stock Availability
- `Available` - Stock available
- `Not Available` - Out of stock
- `Backordered` - On backorder
- `Partial` - Partial availability

### Dispatch Method
- `Courier` - Third-party courier service
- `In-house Delivery` - Company-owned delivery
- `Pickup` - Customer pickup
- `Other` - Other method

---

## BUSINESS CATEGORIES

```
BUSINESS_LINES = [
  'Absa',
  'Cash Connect',
  'VPS',
  'Modems',
  'Accessories',
  'Sim Management',
  'Other',
]
```

---

## CRITICAL FIELDS FOR SUPABASE MIGRATION

### Must Preserve as Primary Keys:
1. `Unique_Orders.Order ID` → auto-increment
2. `Stock_Order.ID` → auto-increment
3. `Dispatch_Log.ID` → auto-increment
4. `Point_of_Presence.ID` → primary key
5. `Inventory_Items.Item_Name` → unique identifier

### Foreign Key Relationships to Implement:
1. `Stock_Order.Order Id` → `Unique_Orders.Order ID`
2. `Dispatch_Log.Order Id` → `Unique_Orders.Order ID`
3. Implicit FKs on text fields (may need to normalize):
   - `Stock_Order.Device Type` → `Inventory_Items.Item_Name`
   - Order fields referencing technician names → Point_of_Presence lookup

### Enum Fields to Create:
1. `dispatch_status_enum`: Pending, Dispatched, Partial, Cancelled, Returned
2. `pick_status_enum`: Pending, Picked, Partially Picked, Not Picked
3. `stock_availability_enum`: Available, Not Available, Backordered, Partial
4. `dispatch_method_enum`: Courier, In-house Delivery, Pickup, Other
5. `business_line_enum`: Absa, Cash Connect, VPS, Modems, Accessories, Sim Management, Other
6. `item_nature_enum`: Serialised, Non-serialised
7. `delivery_party_enum`: Technician, Regional Warehouse, Non Technician

### Serialization Fields (for serialized items):
- `Terminal Serial Number`
- `Cradle Serial Number`
- `Charger Serial Number`
- `CashConnect Serial Number`

### Boolean-like Text Fields (Currently stored as 'Yes'/'No'):
- `Charger Packed`
- `Cables`

---

## KEY INDEXES FOR PERFORMANCE

Recommended Indexes for Supabase:
1. `Unique_Orders(Dispatch Status, Pick Status, Date Ordered)` - Filtering in queue views
2. `Stock_Order(Order Id)` - Foreign key lookups
3. `Stock_Order(Pick Status, Dispatch Status)` - Filtering
4. `Dispatch_Log(Order Id, Date Dispatched)` - Filtering and sorting
5. `Point_of_Presence(Contractor, Region, Name)` - Dropdown lookups
6. `Inventory_Items(Item_Category, Item_Nature)` - Filtering

---

## API INTEGRATION POINTS

The app integrates with:
1. **Airtable** - Current data source (to be migrated)
2. **n8n** - Webhook integration for:
   - Order creation → Line item creation
   - Dispatch notification → Email sending

---

## SUMMARY

**Total Tables**: 5
**Total Fields**: ~138 across all tables
**Primary Relationships**: 1-to-Many (3 relationships)
**Status Enums**: 7 distinct enums
**Workflow Stages**: 3 (Order → Pick → Dispatch)

This schema efficiently captures the complete inventory lifecycle from order creation through picking to final dispatch, with clear status tracking at both the order and line-item levels.

