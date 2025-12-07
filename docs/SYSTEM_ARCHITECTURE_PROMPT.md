# System Architecture Diagram Prompt (The "Ultimate" Edition)

**Objective:**
Create a high-fidelity, comprehensive System Architecture Diagram for the "Inventory Management System (IMS)" (aka "4D Analytics"). The diagram must represent the **full scale** of the platform, highlighting its 15+ functional modules, AI capabilities, and event-driven backend.

**CRITICAL INSTRUCTION:** Do NOT simplify. Show the complexity. This is an Enterprise-grade system.

---

## 1. High-Level Architecture Layers
**Pattern:** Modern Serverless + Backend-as-a-Service (BaaS) + AI-Enhanced

### A. Client Layer (The Interface)
- **Framework:** React SPA (Vite) hosted on Vercel/Netlify.
- **State Management:** TanStack Query (React Query) for server state caching.
- **UI Library:** Shadcn UI + Tailwind CSS.
- **Key Components:**
    -   **Workspace Modules:** (Stock, Orders, Asset Management)
    -   **Sage Bot Interface:** Floating AI assistant.
    -   **Dashboards:** KPI & Analytics visualizations.

### B. AI & Automation Layer (The "Brain")
- **Sage Bot Engine:**
    -   **Input:** Natural Language Queries from Users.
    -   **Processing:** n8n / Edge Functions.
    -   **RAG Pipeline:**
        1.  **Ingestion:** Python Scripts (`ingest_documents.py`) using **LangChain**.
        2.  **Embeddings:** **OpenAI** (text-embedding-3-small).
        3.  **Vector Store:** **Supabase pgvector** (`documents` table).
    -   **Analytics:** `bot_usage_logs` table tracking query sentiment & resolution.

### C. Data & Logic Layer (Supabase)
- **Database:** PostgreSQL.
- **Authentication:** Supabase Auth (RLS Policies).
- **Realtime:** Subscriptions for live dashboard updates.
- **Logic:** PL/pgSQL Triggers & RPC Functions (Atomic Transactions).

---

## 2. Core Functional Modules (The "Full Stack")
*Visualize these as distinct blocks within the Frontend Application Node.*

### Cluster 1: Logistics & Fulfillment (The "Order Engine")
1.  **Stock Orders:** (`/stock-order`) Techs request stock. Real-time availability checks.
2.  **Picking Queue:** (`/picking-queue`) Warehouse prioritization logic.
3.  **Picking Cart:** (`/picking-cart`) Barcode scanning verification.
4.  **Dispatch Queue:** (`/dispatch-queue`) Waybill assignment.
5.  **Dispatch Cart:** (`/dispatch-cart`) Final handover validation.
6.  **Tracking:** (`/tracking`) Logistics partner integration.

### Cluster 2: Asset Lifecycle (The "Single Source of Truth")
1.  **Device Registry:** (`/asset-management`) Master record for every serial number.
2.  **Stock Ingestion:** (`/stock-ingestion`) Bulk CSV/Barcode entry with duplicate detection.
3.  **Asset Management:** (`/asset-management`) Moves, Installations, Decommissions.
4.  **Repairs:** (`/asset-management?tab=repairs`) Fault tracking, Repair Tickets, Vendor management.

### Cluster 3: Audit & Control (The "Safety Net")
1.  **Stock Counts:** (`/stock-counts`) Physical inventory takes.
2.  **Stock Counts Cart:** (`/stock-counts/cart`) Batch submission.
3.  **Stock Counts Report:** (`/stock-counts-report`) Variance analysis.
4.  **Exceptions Report:** (`/exceptions`) Data inconsistency alerts (e.g., "In-Repair but in Warehouse").
5.  **Stock Alerts:** (`/stock-alerts`) Low stock threshold notifications.

### Cluster 4: Resources & Admin (The "Back Office")
1.  **Point of Presence:** (`/point-of-presence`) Technician & Region management.
2.  **Stock Admin:** (`/stock-admin`) Product Catalog (SKUs, Images).
3.  **User Management:** (`/admin/users`) Role-based access control.
4.  **KPI Dashboard:** (`/kpi`) Executive view of Stock health & Order cycle times.

---

## 3. Inter-Module Dependencies & Workflow Orchestration
*Visualize these as connecting lines or "data highways" between the functional blocks.*

### A. The "Order-to-Cash" Pipeline (Frontend Orchestration)
1.  **Stock Orders** -> **Inventory Catalog**: Fetches Item descriptions, categories, and images.
2.  **Stock Orders** -> **Point of Presence**: Fetches Technician & Region details for delivery.
3.  **Picking Queue** -> **Orders**: Consumes orders with `status='Pending'`.
4.  **Picking Cart** -> **Orders**: Updates line items to `status='Picked'`.
5.  **Dispatch Queue** -> **Orders**: Consumes orders with `status='Picked'`.
6.  **Dispatch Cart** -> **Device Registry**: Updates device holder to `Technician` (Movement: 'Dispatch').

### B. The "Maintenance" Loop (State Management)
1.  **Stock Ingestion** -> **Device Registry**: Creates new "Available" records.
2.  **Repairs** -> **Device Registry**:
    *   **Start Repair**: Locks device status to `In-Repair`.
    *   **Return to Stock**: Resets status to `Available`.
3.  **Stock Counts** -> **Device Registry**: "Write-Back" updates (e.g., marking a device `Faulty` during a count).
4.  **Exceptions Report** -> **Device Registry**: Identifies mismatches for manual correction.

### C. The "Intelligence" Overlay (Data Aggregation)
1.  **KPI Dashboard** pulls real-time data from:
    *   **Orders** (Fulfillment rates)
    *   **Device Registry** (Stock health)
    *   **Repairs** (Fault analysis)
    *   **Bot Usage Logs** (AI performance)

---

## 4. Security & Access Control (The "Shield")
*Visualize this as a wrapper or layer around the Data/Backend Node.*

### A. Role-Based Access Control (RBAC)
- **Admin:** Full access to all modules, user management, and system configuration.
- **Back Office:** Access to KPI dashboards, reports, and administrative tools (Read/Write).
- **User:** Standard access for Technicians and Warehouse staff to perform daily operations (Orders, Stock Counts, etc.).

### B. Row Level Security (RLS) Policies
- **Self-Access:** Users can only view/edit their own profiles (`auth.uid() = id`).
- **Data Isolation:** Standard Users see *only* their assigned stock and relevant data.
- **Admin/BackOffice Override:** 'Admin' and 'Back Office' roles bypass isolation for system-wide oversight.
- **Bot Privacy:** Users see only their own AI chat history; Admins see aggregated analytics.

---

## 5. Critical Data Flows (Visualize These arrows)

### Flow A: The "RAG" Cycle (AI Query)
1.  **User** asks: "How do I process a return?"
2.  **Sage Bot** sends query to **OpenAI** (Embedding).
3.  **Vector Search** against **Supabase** (`match_documents` RPC).
4.  **Context** retrieved -> Sent to LLM -> **Answer** delivered to User.

### Flow B: The "Real-Time Stock Sync" (Automation)
1.  **Event:** `device_registry` updated (e.g., Status change to 'Faulty').
2.  **Trigger:** `trigger_sync_stock_levels` fires.
3.  **Action:** Auto-recalculates & updates `stock_levels` table.
4.  **Result:** Stock Orders page instantly reflects -1 Available quantity.

### Flow C: The "Order Fulfillment" Journey
1.  **Order Created** (Status: Pending) ->
2.  **Picking:** Warehouse User scans Serial Number ->
3.  **Validation:** System checks `device_registry` for 'Available' status ->
4.  **Dispatch:** Status updates to 'Dispatched' ->
5.  **Movement:** Record created in `dispatch_log` and `device_movements`.

---

## 6. Visual Style & Notation
- **Style:** Modern Cloud Architecture (clean lines, distinct icons for Supabase, React, OpenAI, Python).
- **Grouping:** Use "Boundary Boxes" to group the **Frontend**, **Backend (Supabase)**, and **External Services (OpenAI)**.
- **Emphasis:** Use a distinct color (e.g., Purple/Blue) for the **AI/Vector** components to show they are "cutting edge".
- **Database Nodes:** Clearly distinguish between Standard Tables (Registry) and Vector Tables (Documents).
- **Security:** Use a Lock icon or Shield boundary to denote the RLS/Auth layer.

## 7. Deliverable Options: Split Views (Recommended)
*Instruct the Agent to generate 3 separate diagrams to handle complexity:*

1.  **System Context Diagram:** High-level view of Users, External Systems (OpenAI, Logistics), and the Core System.
2.  **Container Diagram:** Detailed breakdown of the React Modules, Supabase Containers, and AI Services.
3.  **Data Flow Diagram:** Specific visualization of the "Order-to-Cash", "RAG Pipeline", and "Stock Sync" flows.

## 8. Summary for the Agent
"Generate 3 SEPARATE diagrams to avoid clutter:
1. **System Context Diagram**: High-level Users <-> System interactions.
2. **Container Diagram**: The detailed React Modules, Supabase Tables, and AI Services.
3. **Data Flow Diagram**: Visualizing the specific flows (RAG, Stock Sync, Orders).
If you must generate one, group heavily and use collapsible clusters."
