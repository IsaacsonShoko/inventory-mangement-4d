# Stock Counts - Technical Requirements Document

## 1. Overview
This document outlines the technical requirements for migrating the Stock Counts functionality from PowerApps to React/TypeScript, including data models, UI components, and business logic.

## 2. Data Model

### 2.1 Stock Levels Table Schema
The following columns from the Stock Levels table are being used:

1. **Basic Item Information**
   - `Device Type` (Item code/ID)
   - `Item Description` 
   - `Item Category` (e.g., "MODEM")
   - `Item Nature` (Serialised/Non-serialised)
   - `Item Code` 
   - `BIN LOCATION`
   - `Count Type` (Monthly, Mid-Month, Daily)
   - `Quantity`

2. **Serial Number Tracking**
   - `Manufacture Serial Number`
   - `QR Code Serial Number`
   - `Xlink Serial Number`
   - `Cradle Serial Number`
   - `Charger Serial Number`

3. **Location & Ownership**
   - `Stock Holder`
   - `Name or Location`
   - `Contractor Company`
   - `Contractor Region`
   - `Technician Name`
   - `Tech ID`

4. **Condition & Status**
   - `Item Status`
   - `Fault Reason`
   - `Overall Condition`
   - `XLI Case Ref`

5. **Relationships**
   - `CountID` (Links to Rolledup Stock Counts)

## 3. Core Functionality

### 3.1 Stock Count Creation
- Allow creating new stock counts with type (Monthly, Mid-Month, Daily)
- Support for both serialized and non-serialized items
- Track stock holder, location, and technician information
- Capture item condition and status

### 3.2 Item Management
- Search and filter items by:
  - Device Type
  - Item Description
  - Item Category
  - Serial Number
- Add items to count with quantity
- Support for bulk operations

### 3.3 Data Validation
- Required fields validation
- Quantity validation (positive numbers)
- Serial number format validation
- Duplicate entry prevention

## 4. UI Components

### 4.1 Main Layout
- Header with navigation and title
- Two-panel layout:
  - Left: Filter and search controls
  - Right: Item grid with selection

### 4.2 Key Components
1. **Item Search & Filter**
   - Search box for text search
   - Dropdown filters for:
     - Item Category
     - Serialized/Non-serialized
     - Count Type

2. **Item Grid**
   - Responsive grid of items
   - Each item shows:
     - Device Type
     - Item Description
     - Item Category
     - Quantity input
     - Add to count button

3. **Count Summary**
   - Current count status
   - Total items counted
   - Navigation to review/submit

## 5. Technical Stack

### 5.1 Frontend
- **Framework**: React 18+
- **Language**: TypeScript
- **State Management**: React Context + useReducer
- **UI Library**: Material-UI (MUI)
- **Form Handling**: React Hook Form
- **Validation**: Yup
- **HTTP Client**: Axios

## 6. API Integration

### 6.1 Data Operations
- Fetch stock items with filters
- Create/update stock counts
- Get count history
- Submit completed counts

### 6.2 Endpoints
```
GET /api/stock/items
POST /api/stock/counts
GET /api/stock/counts/{id}
PUT /api/stock/counts/{id}
GET /api/stock/history
```

## 7. Security Considerations

1. **Authentication**
   - JWT-based authentication
   - Role-based access control

2. **Data Protection**
   - Input sanitization
   - XSS prevention
   - CSRF protection

## 8. Testing Strategy

1. **Unit Tests**
   - Component rendering
   - Business logic
   - Utility functions

2. **Integration Tests**
   - Form submissions
   - API interactions
   - Navigation flows

## 9. Accessibility

1. **WCAG 2.1 Compliance**
   - Keyboard navigation
   - Screen reader support
   - Color contrast
   - ARIA attributes
