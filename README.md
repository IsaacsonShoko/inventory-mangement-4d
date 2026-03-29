# 4D Analytics Inventory Management System

Enterprise-grade inventory management platform for complete device lifecycle tracking — from order creation through picking, dispatch, and field asset management — with an AI-powered assistant and offline-first PWA support.

## Overview

Built for field operations teams managing serialised devices across multiple business lines and warehouses. The system covers the full equipment lifecycle: ordering, picking, dispatch, installation, repair, and decommission.

**Key capabilities:**

- **Order Management** — Create and track equipment orders with SLA monitoring and automated email notifications
- **Warehouse Operations** — Picking queues, dispatch workflows, waybill assignment, and PDF manifest generation
- **Stock Counts** — Mobile barcode/QR scanning for inventory counts with fault and condition tracking
- **Asset Lifecycle** — Device registry, repair tickets (19 fault categories), DOA/returns, installation records, and movement audit trail
- **KPI Dashboard** — 8 analytics tabs covering order throughput, SLA compliance, fault analysis, and AI bot usage
- **4D-Sage AI Bot** — Retrieval-augmented generation (RAG) chatbot with vector search over internal documentation
- **Guest / Demo Mode** — Read-only access for portfolio demonstration without credentials
- **Offline Support** — Progressive Web App with full offline capability via service worker and cached data

## Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18.3 + TypeScript 5.8 + Vite 5.4 |
| Routing | React Router v6 |
| Server State | TanStack React Query v5 (offline-first, localStorage persistence) |
| UI | Tailwind CSS 3.4 + ShadCN/UI (Radix UI primitives) |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Scanning | react-webcam + @zxing/browser |
| Database | Supabase (PostgreSQL + RLS + pgvector + Realtime) |
| Auth | Supabase Auth (email/password + guest mode) |
| Storage | Supabase Storage (Inventory Gallery bucket) |
| Hosting | Netlify (SPA + serverless functions) |
| Automation | n8n (self-hosted, email notification webhooks) |
| AI | OpenAI GPT-4o-mini + text-embedding-3-small (RAG) |
| PWA | vite-plugin-pwa + Workbox |

## Prerequisites

- Node.js 18+ or Bun
- Supabase project (PostgreSQL + Auth + Storage)
- Netlify account (for production deployment and n8n proxy)
- n8n instance (for order notification workflows)
- OpenAI API key (for the 4D-Sage AI bot)

## Installation

```bash
# Clone the repo
git clone https://github.com/IsaacsonShoko/inventory-mangement-4d.git
cd inventory-mangement-4d

# Install dependencies
npm install

# Configure environment (see below)
cp .env.example .env

# Start development server
npm run dev

# Build for production
npm run build
```

## Environment Variables

Create a `.env` file in the project root:

```ini
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # server-side only (Netlify functions)

# n8n Webhook URLs
# In production these should point to your Netlify function proxy endpoints
# e.g. https://your-site.netlify.app/.netlify/functions/n8n-proxy/order-placed
VITE_N8N_ORDER_PLACED_WEBHOOK_URL=
VITE_N8N_ORDER_PICKED_WEBHOOK_URL=
VITE_N8N_ORDER_DISPATCHED_WEBHOOK_URL=
VITE_N8N_ORDER_MANIFEST_WEBHOOK_URL=
VITE_N8N_SUBMIT_ORDER_WEBHOOK_URL=

# AI Chat (Netlify function endpoint)
VITE_CHAT_ENDPOINT=/.netlify/functions/chat
OPENAI_API_KEY=sk-...                                  # server-side only (Netlify functions)

# Guest / Demo Mode
VITE_GUEST_EMAIL=guest@yourdomain.com
VITE_GUEST_PASSWORD=your-guest-password
```

> **Note**: `VITE_SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY` are used only by Netlify serverless functions and must never be exposed to the browser.

## System Modules

### Field Operations (all roles including guest)

| Module | Route | Description |
| --- | --- | --- |
| Stock Order | `/stock-order` | Create equipment orders with delivery details and technician assignment |
| Asset Management | `/asset-management` | 5-tab view: Registry, Repairs, DOA/Returns, Installations, Movements |
| Stock Counts | `/stock-counts` | Initiate count sessions by holder type and location |
| Stock Counts Cart | `/stock-counts-cart` | Mobile barcode scanning with fault and condition capture |
| Stock Counts Report | `/stock-counts-report` | View submitted count data |
| Tracking | `/tracking` | Shipment tracking via Collivery + local order lookup |
| Point of Presence | `/point-of-presence` | Technician directory with regional and contractor data |

### Back Office (back_office + admin)

| Module | Route | Description |
| --- | --- | --- |
| Picking Queue | `/picking` | Orders awaiting pick, grouped by business line |
| Picking Cart | `/picking/cart/:id` | Per-order picking with serial number capture |
| Dispatch Queue | `/dispatching` | Picked orders awaiting dispatch |
| Dispatch Cart | `/dispatching/cart/:id` | Dispatch with waybill assignment and PDF manifest export |
| KPI Dashboard | `/kpi` | 8 analytics tabs: orders, SLA, faults, bot usage |
| Stock Ingestion | `/stock-ingestion` | Batch device registration with barcode scanning |
| Stock Admin | `/stock-admin` | Product catalog (inventory_items) management |

### Admin Only

| Module | Route | Description |
| --- | --- | --- |
| User Management | `/admin/users` | Approve/reject users, assign roles, view account details |

## User Roles

| Role | Access |
| --- | --- |
| `admin` | Full access including user management |
| `back_office` | Order management, asset tracking, KPI, picking, dispatch, stock ingestion |
| `user` | Field operations: stock orders, counts, asset management, tracking, POP |
| `guest` | Read-only demo access to key modules |

New user accounts default to `pending` approval. An admin must approve them before access is granted.

## Business Lines

`Absa` · `Cash Connect` · `VPS` · `Modems` · `Accessories` · `Sim Management` · `Other`

## Database Schema

| Table | Purpose |
| --- | --- |
| `user_profiles` | User accounts, roles, approval status |
| `unique_orders` | Order headers with SLA tracking |
| `stock_order` | Order line items with pick/dispatch status |
| `dispatch_log` | Dispatch records with serial numbers and waybills |
| `inventory_items` | Product catalog |
| `stock_levels` | Aggregated inventory by device type and location |
| `stock_counts` | Individual count submissions |
| `device_registry` | Serialised device master record |
| `repair_tickets` | Fault logging and repair lifecycle |
| `device_movements` | Full audit trail of device location changes |
| `ingestion_batches` | Batch device registration records |
| `point_of_presence` | Technician directory |
| `documents` | RAG vector store (pgvector embeddings) |
| `bot_usage_logs` | 4D-Sage AI bot interaction analytics |

## n8n Integration

Order lifecycle notifications are sent via n8n webhook workflows. In production (HTTPS), all webhook calls are proxied through `netlify/functions/n8n-proxy.js` to avoid mixed-content errors with a self-hosted HTTP n8n instance. See [docs/N8N_INTEGRATION_GUIDE.md](docs/N8N_INTEGRATION_GUIDE.md) for workflow setup.

## 4D-Sage AI Bot

The floating chat assistant uses a full RAG stack:

1. **Ingestion** — `scripts/ingest_documents.py` loads markdown docs from `docs/`, generates OpenAI embeddings, and stores vectors in Supabase (`documents` table via pgvector)
2. **Retrieval** — `netlify/functions/chat.js` generates a query embedding, performs cosine similarity search (`match_documents` RPC), and retrieves top 5 context chunks
3. **Generation** — GPT-4o-mini generates a response using retrieved context and the last 5 conversation turns
4. **Logging** — All interactions are logged to `bot_usage_logs` with token counts, response times, and satisfaction ratings

## Deployment

The app is deployed on **Netlify**. The `netlify.toml` configures:

- SPA fallback (`/* → /index.html`)
- n8n proxy redirect (`/api/notify/* → /.netlify/functions/n8n-proxy`)
- CORS headers for Supabase API calls
- Serverless functions in `netlify/functions/`

```bash
# Production build
npm run build
# Output: dist/
```

For local Netlify function testing:

```bash
npm install -g netlify-cli
netlify dev
```

## Documentation

| Document | Location |
| --- | --- |
| Product Documentation | [docs/PRODUCT_DOCUMENTATION.md](docs/PRODUCT_DOCUMENTATION.md) |
| System Overview | [docs/SYSTEM_OVERVIEW.md](docs/SYSTEM_OVERVIEW.md) |
| n8n Integration Guide | [docs/N8N_INTEGRATION_GUIDE.md](docs/N8N_INTEGRATION_GUIDE.md) |
| Netlify Functions Setup | [docs/NETLIFY_FUNCTIONS_SETUP.md](docs/NETLIFY_FUNCTIONS_SETUP.md) |
| Knowledge Base (Bot) | [docs/KNOWLEDGE_BASE.md](docs/KNOWLEDGE_BASE.md) |
| Implementation Guide | [docs/IMPLEMENTATION_GUIDE.md](docs/IMPLEMENTATION_GUIDE.md) |

## Recent Changes

- **2026-03** — n8n HTTPS proxy for mixed-content handling; guest mode restrictions on order and dispatch pages; Supabase anon key fallback and improved query retry logic
- **2025-12** — 4D-Sage AI bot (RAG with vector search, conversation memory, satisfaction ratings); rebranded from Xlink to 4D Analytics; guest/demo mode with portfolio showcase
- **2025-11** — Asset management module (device registry, repair tickets, DOA/returns, movements, ingestion batches); KPI dashboard; stock ingestion with batch barcode scanning; SLA tracking

## License

Proprietary software developed for 4D Analytics.

## Contact

**4D Analytics** — For technical support or inquiries, contact your account manager.

---

Last updated: March 2026
