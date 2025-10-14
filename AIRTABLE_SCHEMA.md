# Airtable Database Schema

This document outlines all the Airtable tables and their columns used in this application.

## Table: Inventory Items (tblCO9KUm09O4sISd)

| Field Name | Type | Description |
|------------|------|-------------|
| Device Type | Single line text | The type/model of the device |
| Item Description | Long text | Detailed description of the item |
| Item Category | Single select | Category classification (e.g., MODEM, Accessories, VPS, etc.) |
| Serialized | Single select | Whether the item requires serial number tracking (Y/N) |
| Thumbnail | Attachment | Product images stored in AWS S3 |

**Usage**: Primary inventory catalog for browsing and ordering products. Images are stored as attachments with AWS S3 URLs.

---

## Table: Point of Presence (tblUl7V4d7OP5YWsm)

| Field Name | Type | Description |
|------------|------|-------------|
| Name & Surname | Single line text | Full name of the technician |
| Contractor | Single line text | Contractor company name |
| Region | Single line text | Geographic region (e.g., KZN, WC) |
| Email Address | Email | Contact email |
| Area Based | Single line text | Specific area/location |
| Location Code | Single line text | Unique location identifier |
| Contact Number | Phone number | Contact phone |

**Usage**: Technician directory for delivery assignments and regional warehouse locations.

---

## Table: Business Lines (tblx8qOPeOOqGJ3Nh)

| Field Name | Type | Description |
|------------|------|-------------|
| Item Category | Single line text | Business line category |
| Item Nature | Single select | Serialised or Non-serialised |

**Usage**: Defines valid combinations of item categories and their serialization requirements. Used for form validation and filtering.

**Categories** (in custom sort order):
1. Accessories
2. Absa
3. Cash Connect
4. Modems
5. Sim Management
6. VPS
7. Other

---

## Table: Orders (tbl2JKhWWHOEVEWPB)

| Field Name | Type | Description |
|------------|------|-------------|
| Order ID | Single line text | Unique order identifier (auto-generated) |
| Date Ordered | Date | Order placement date |
| Item Category | Single line text | Category from Business Lines |
| Item Nature | Single line text | Serialised/Non-serialised |
| Device type | Single line text | Specific device from Inventory |
| Quantity ordered | Number | Number of units |
| Ordered by | Email | Email of person placing order |
| Deliver to Part | Single select | Technician / Regional Warehouse / Non Technician |
| Contractor Company | Single line text | (Conditional) Required for Technician delivery |
| Region | Single line text | (Conditional) Required for Technician/Regional Warehouse |
| Technician | Single line text | (Conditional) Specific technician name |
| On Behalf of | Email | (Conditional) For Technician orders |
| Order Location | Single line text | (Optional) Physical location |
| Recipient Name | Single line text | (Conditional) For Non-Technician orders |
| Recipient Company Name | Single line text | (Optional) Company name |
| Recipient Address | Long text | (Conditional) Delivery address for Non-Technician |
| Recipient Contact Number | Phone number | (Optional) Contact number |
| Recipient Email Address | Email | (Conditional) Recipient email |
| Status | Single select | Order status (Pending, Approved, Shipped, etc.) |
| PoPID | Number | Point of Presence ID reference |

**Usage**: Stores all order transactions with complete delivery and recipient details.

---

## Data Flow

1. **Browse Inventory**: Users browse `Inventory Items` table filtered by category/nature from `Business Lines`
2. **Select Recipients**: Based on delivery type, users select from `Point of Presence` table
3. **Create Order**: Order records created in `Orders` table with all form data and cart items
4. **Track**: Orders can be tracked and managed through the Orders table

## Environment Variables Required

```env
VITE_AIRTABLE_PAT=your_airtable_personal_access_token
VITE_AIRTABLE_BASE_ID=your_base_id
VITE_AIRTABLE_INVENTORY_TABLE_ID=tblCO9KUm09O4sISd
VITE_AIRTABLE_POINT_OF_PRESENCE_TABLE_ID=tblUl7V4d7OP5YWsm
VITE_AIRTABLE_BUSINESS_LINES_TABLE_ID=tblx8qOPeOOqGJ3Nh
VITE_AIRTABLE_ORDERS_TABLE_ID=tbl2JKhWWHOEVEWPB
```
