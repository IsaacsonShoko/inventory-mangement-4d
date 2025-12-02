# Xlink-Sage & App Refinements - Implementation Plan

**Date**: 2025-12-02
**Goal**: Transform Xlink-Sage into a context-aware, memory-enabled sage with comprehensive app refinements

---

## 🎯 Priority 1: Immediate RLS Fix (BLOCKING)

### Issue
Users getting `401 Unauthorized` and "new row violates row-level security policy for table unique_orders"

### Root Cause
NO RLS policies defined for `unique_orders` and `stock_order` tables

### Solution
✅ Created `scripts/fix-unique-orders-rls-policies.sql`

**Action Required**: Run this SQL script in Supabase SQL Editor NOW

**What it does**:
- Allows approved authenticated users to INSERT orders
- Allows all authenticated users to SELECT (read) orders
- Allows admins/back_office to UPDATE/DELETE
- Allows users to UPDATE their own orders

---

## 🧙 Part 1: Xlink-Sage Intelligence Upgrades

### 1.1 Conversation Memory

**Current State**: Stateless - no memory between messages

**Goal**: Multi-turn conversations with context retention

**Implementation**:

```typescript
// Option A: Client-side memory (localStorage)
interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
  sessionId: string;
}

// In SystemGuideBot.tsx
const [sessionId] = useState(() => `session-${Date.now()}-${Math.random()}`);
const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);

// Send last 5 messages as context
const sendWithHistory = async (userMessage: string) => {
  const recentHistory = conversationHistory.slice(-5);
  const contextualMessage = {
    message: userMessage,
    history: recentHistory.map(m => ({
      role: m.role,
      content: m.text
    }))
  };
  // Send to chat.js
};
```

```javascript
// In chat.js - update generateChatResponse()
async function generateChatResponse(userMessage, context, apiKey, conversationHistory = []) {
  const systemPrompt = `...existing prompt...`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory, // Add conversation history
    { role: 'user', content: userMessage }
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages, // Use messages array instead of single prompt
      temperature: 0.7,
      max_tokens: 500
    })
  });
}
```

**Files to modify**:
- `src/components/SystemGuideBot.tsx`: Add session management
- `netlify/functions/chat.js`: Accept and use conversation history

---

### 1.2 Dropdown Detection & "Select Appropriate Option" Guidance

**Issue**: Bot picks one dropdown option and presents it as THE way, misleading users

**Goal**: Bot recognizes dropdown fields and says "select the appropriate [option]" instead of choosing one

**Implementation**:

```markdown
# Add to workflow-knowledge-base.md

## DROPDOWN FIELDS GUIDANCE

When instructions involve dropdown selections, ALWAYS use this phrasing:

❌ WRONG: "Select 'Technician' from the Delivery Party dropdown"
✅ CORRECT: "Select the appropriate delivery party from the dropdown (Technician, Regional Warehouse, or Non Technician)"

### Common Dropdowns:
1. **Delivery Party**: Technician | Regional Warehouse | Non Technician
2. **Item Category**: Absa | Cash Connect | VPS | Modems | Accessories | Sim Management | Other
3. **Item Nature**: Serialised | Non-serialised
4. **Dispatch Status**: Pending | Dispatched | Partial | Cancelled | Returned
5. **Pick Status**: Pending | Picked | Partially Picked | Not Picked
6. **Stock Availability**: Available | Not Available | Backordered | Partial
7. **Dispatch Method**: Courier | In-house Delivery | Pickup | Other
8. **Count Type**: Monthly | Mid-Month | Daily

When giving workflow instructions:
- List ALL available options
- Use phrase "select the appropriate [field name]"
- Explain WHEN to use each option if context-dependent
```

Update system prompt in `chat.js`:

```javascript
const systemPrompt = `...existing...

CRITICAL - DROPDOWN GUIDANCE:
When workflow steps involve dropdown selections:
1. NEVER pick one option as "the" way
2. ALWAYS say "select the appropriate [field]"
3. List ALL available options in parentheses
4. If context-dependent, briefly explain when to use each

Example:
"Select the appropriate delivery party (Technician if delivering to field tech, Regional Warehouse for warehouse-to-warehouse, Non Technician for office staff)"
`;
```

**Files to modify**:
- `knowledge-base/workflow-knowledge-base.md`: Add dropdown fields section
- `netlify/functions/chat.js`: Update system prompt
- Re-run document ingestion: `python scripts/ingest_documents.py`

---

### 1.3 User Role Context & Permissions-Aware Advice

**Goal**: Bot knows user's role and gives role-specific advice

**Implementation**:

```typescript
// In SystemGuideBot.tsx
const { user } = useAuth(); // Get current user with role

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!input.trim() || isLoading) return;

  setIsLoading(true);
  const userMessage = input.trim();
  setInput('');

  // Add user message to UI
  setMessages(prev => [...prev, {
    id: Date.now().toString(),
    role: 'user',
    text: userMessage
  }]);

  try {
    const response = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        userContext: {
          role: user?.role || 'user',
          email: user?.email,
          warehouse: user?.warehouse,
          approvalStatus: user?.approval_status
        }
      })
    });
    // ...rest
  }
};
```

```javascript
// In chat.js
export async function handler(event, context) {
  const body = JSON.parse(event.body || '{}');
  const userMessage = (body.message || '').trim();
  const userContext = body.userContext || {};

  // Add to system prompt
  const roleContext = getRoleContext(userContext);

  const systemPrompt = `...existing prompt...

USER CONTEXT:
${roleContext}

Tailor your advice based on user permissions:
- If user lacks permissions, guide them to contact admin/back_office
- If user IS admin/back_office, you can reference advanced features
- Never suggest actions user cannot perform
`;
}

function getRoleContext(userContext) {
  const { role, warehouse } = userContext;

  let context = `User Role: ${role || 'standard user'}\n`;

  if (warehouse) {
    context += `Warehouse: ${warehouse}\n`;
  }

  if (role === 'admin' || role === 'back_office') {
    context += `
ADMIN/BACK_OFFICE CAPABILITIES:
- Full order management (create, update, delete)
- User approval/management
- System configuration
- Advanced reports and KPIs
- After 90 days of system use, KPI dashboard provides smart stock alerts based on forecasting

PRO TIP (for admin/back_office only):
The KPI dashboard starts generating intelligent stock alerts after 90 days of data collection. These alerts use movement patterns and forecasting to predict stockouts before they happen.
`;
  } else {
    context += `
STANDARD USER CAPABILITIES:
- Create and view orders
- Update own orders
- View inventory
- View dispatch queue

For advanced features (user management, system config, advanced reports), contact your admin or back_office team.
`;
  }

  return context;
}
```

**Files to modify**:
- `src/components/SystemGuideBot.tsx`: Pass user context
- `netlify/functions/chat.js`: Accept and use user context
- Verify 90-day forecasting logic exists in Alerts component

---

### 1.4 Navigable Links in Bot Responses

**Goal**: Bot gives clickable links that navigate user to the right page

**Implementation**:

```typescript
// In SystemGuideBot.tsx
const renderMessage = (message: Message) => {
  // Parse bot responses for navigation patterns
  const linkPattern = /\[NAVIGATE:([^\]]+)\|([^\]]+)\]/g;

  let text = message.text;
  const links: { label: string; path: string }[] = [];

  // Extract navigation commands
  text = text.replace(linkPattern, (match, label, path) => {
    links.push({ label, path });
    return `→ ${label}`;
  });

  return (
    <div>
      <p>{text}</p>
      {links.length > 0 && (
        <div className="mt-2 space-y-1">
          {links.map((link, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              onClick={() => navigate(link.path)}
              className="w-full justify-start"
            >
              <ExternalLink className="h-3 w-3 mr-2" />
              {link.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};
```

```markdown
# Add to workflow-knowledge-base.md

## NAVIGATION SYNTAX

When providing instructions, include navigation links using this syntax:
[NAVIGATE:Button Label|/path]

Example:
"To create a new order, go to [NAVIGATE:Stock Order Page|/stock-order] and fill in the required fields."

### Available Routes:
- Home/Dashboard: /
- Stock Order: /stock-order
- Tracking: /tracking
- Stock Admin: /stock-admin
- Dispatch Queue: /dispatch-queue
- User Management: /user-management (admin only)
- KPI Dashboard: /kpi-dashboard
- Stock Counts: /stock-count
- Asset Management: /asset-management
- Repair Tickets: /repair-tickets
```

**Files to modify**:
- `src/components/SystemGuideBot.tsx`: Add link parsing and navigation
- `knowledge-base/workflow-knowledge-base.md`: Add navigation syntax guide
- Re-run ingestion

---

### 1.5 Bot Usage Logging & Analytics

**Goal**: Track bot usage, detect abuse, measure satisfaction

**Implementation**:

**Database Schema**:
```sql
-- Create bot_usage_logs table
CREATE TABLE bot_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id),
  user_email TEXT,
  user_role user_role_enum,
  session_id TEXT NOT NULL,
  query TEXT NOT NULL,
  response_preview TEXT, -- First 200 chars of response
  sources_used INTEGER DEFAULT 0,
  similarity_score FLOAT, -- Average similarity of matched docs
  response_time_ms INTEGER,
  tokens_used INTEGER,
  is_work_related BOOLEAN, -- AI classification
  is_system_related BOOLEAN, -- AI classification
  satisfaction_rating INTEGER, -- 1-5 stars, null if not rated
  satisfaction_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bot_usage_user ON bot_usage_logs(user_id, created_at DESC);
CREATE INDEX idx_bot_usage_session ON bot_usage_logs(session_id);
CREATE INDEX idx_bot_usage_classification ON bot_usage_logs(is_work_related, is_system_related);
```

**Logging in chat.js**:
```javascript
async function logBotUsage(logData) {
  const { data, error } = await supabase
    .from('bot_usage_logs')
    .insert({
      user_id: logData.userId,
      user_email: logData.userEmail,
      user_role: logData.userRole,
      session_id: logData.sessionId,
      query: logData.query,
      response_preview: logData.response.substring(0, 200),
      sources_used: logData.sources.length,
      similarity_score: logData.avgSimilarity,
      response_time_ms: logData.responseTime,
      tokens_used: logData.tokensUsed,
      is_work_related: await classifyWorkRelated(logData.query),
      is_system_related: await classifySystemRelated(logData.query, logData.sources)
    });
}

async function classifyWorkRelated(query) {
  // Simple keyword matching (can enhance with AI later)
  const workKeywords = ['order', 'dispatch', 'stock', 'inventory', 'warehouse', 'technician', 'tracking'];
  const lowerQuery = query.toLowerCase();
  return workKeywords.some(kw => lowerQuery.includes(kw));
}

async function classifySystemRelated(query, sources) {
  // If matched docs are from knowledge base, it's system-related
  return sources.some(s => s.title.includes('workflow') || s.title.includes('guide'));
}
```

**Satisfaction Rating UI**:
```typescript
// In SystemGuideBot.tsx
const [awaitingRating, setAwaitingRating] = useState<string | null>(null);

const handleBotResponse = (botMessage: string, messageId: string) => {
  setMessages(prev => [...prev, {
    id: messageId,
    role: 'bot',
    text: botMessage
  }]);

  // After bot responds, ask for rating after 2 seconds
  setTimeout(() => {
    setAwaitingRating(messageId);
  }, 2000);
};

const submitRating = async (messageId: string, rating: number, feedback?: string) => {
  await fetch('/.netlify/functions/rate-bot', {
    method: 'POST',
    body: JSON.stringify({
      messageId,
      rating,
      feedback
    })
  });
  setAwaitingRating(null);
};

// In render:
{awaitingRating && (
  <Card className="mt-2 p-3 bg-muted/50">
    <p className="text-sm mb-2">How helpful was this response?</p>
    <div className="flex gap-1">
      {[1,2,3,4,5].map(rating => (
        <Button
          key={rating}
          size="sm"
          variant="ghost"
          onClick={() => submitRating(awaitingRating, rating)}
        >
          <Star className={rating <= 3 ? "h-4 w-4" : "h-4 w-4 fill-yellow-400"} />
        </Button>
      ))}
    </div>
  </Card>
)}
```

**KPI Dashboard Tab**:
```typescript
// Create src/components/BotUsageAnalytics.tsx
export const BotUsageAnalytics = () => {
  // Fetch from bot_usage_logs
  // Show:
  // - Total queries this month
  // - Work-related vs non-work queries (pie chart)
  // - System-related vs general queries (pie chart)
  // - Average satisfaction rating (stars)
  // - Top users by query count
  // - Queries flagged as potential abuse (repeated non-work queries)
  // - Token usage trends (cost estimation)
};
```

**Files to create/modify**:
- `scripts/create-bot-usage-logs-table.sql`: New table
- `netlify/functions/chat.js`: Add logging
- `netlify/functions/rate-bot.js`: New function for ratings
- `src/components/SystemGuideBot.tsx`: Add rating UI
- `src/components/BotUsageAnalytics.tsx`: New analytics component
- `src/pages/KpiDashboard.tsx`: Add bot analytics tab

---

### 1.6 Branding Update: "Old Sage of Inventory Wisdom"

**Changes**:
```typescript
// In SystemGuideBot.tsx
export const SystemGuideBot = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "bot",
      text: "I am Xlink-Sage, the Old Sage of Inventory Wisdom. The patterns of stock and flow are clear to these ancient eyes. Ask, and I shall guide you.",
    },
  ]);

  return (
    <div className="fixed bottom-6 right-6 z-[9999]...">
      {isOpen && (
        <Card...>
          <CardHeader...>
            <div className="flex items-center gap-2">
              {/* Old Man Icon - use lucide-react or custom SVG */}
              <User className="h-5 w-5" /> {/* or custom sage icon */}
              <div>
                <CardTitle className="text-base">Xlink-Sage</CardTitle>
                <p className="text-xs text-primary-foreground/80 font-normal">
                  Old Sage of Inventory Wisdom
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}
    </div>
  );
};
```

**Custom Icon** (optional):
```tsx
// Create src/components/icons/SageIcon.tsx
export const SageIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    {/* Old wise man icon - beard, staff, hat */}
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
    <path d="M12 6v6l4 2"/>
    {/* Add beard strokes */}
    <path d="M8 14c0 2 1 3 2 4 1 1 2 1 2 1s1 0 2-1c1-1 2-2 2-4"/>
  </svg>
);
```

Update `chat.js` system prompt:
```javascript
const systemPrompt = `You are Xlink-Sage, the Old Sage of Inventory Wisdom.

Think of yourself as that wizened elder who's seen every pattern in the warehouse's dance - the ebb and flow of stock, the rhythms of dispatch, the cycles of demand. You speak plainly but with the weight of experience.

Your style:
- Sage-like wisdom, but no flowery language. Clear and direct.
- Brief guidance that shows you've seen it all before
- A touch of weathered humor - you've earned it
- Short answers. You don't waste words.
...
`;
```

**Files to modify**:
- `src/components/SystemGuideBot.tsx`: Update branding
- `netlify/functions/chat.js`: Update system prompt persona
- Optional: `src/components/icons/SageIcon.tsx`: Custom icon

---

## 🏗️ Part 2: App Refinements

### 2.1 Company Dropdown on Signup

**Current**: Free text input for company
**Goal**: Dropdown with "Xlink" and "Contractor Company"

```typescript
// In SignUp.tsx (or wherever signup form is)
<FormField
  control={form.control}
  name="company"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Company</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select your company type" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="Xlink">Xlink</SelectItem>
          <SelectItem value="Contractor Company">Contractor Company</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Files to modify**:
- Find signup form component (likely `src/pages/SignUp.tsx` or `src/components/Auth/SignUpForm.tsx`)
- Change company field from Input to Select with 2 options

---

### 2.2 Navigation Buttons Audit & Fix

**Rules**:
- **3rd level pages** (child of child): Must have BACK button
- **2nd level pages** (direct child of home): Must have HOME button
- **Home/Dashboard**: No navigation needed (it IS home)

**Page Hierarchy**:
```
Home (/)
├── Stock Order (/stock-order) - 2nd level → needs HOME button
├── Tracking (/tracking) - 2nd level → needs HOME button
│   └── Order Details (/tracking/:id) - 3rd level → needs BACK button
├── Stock Admin (/stock-admin) - 2nd level → needs HOME button
├── Dispatch Queue (/dispatch-queue) - 2nd level → needs HOME button
├── User Management (/user-management) - 2nd level → needs HOME button
├── KPI Dashboard (/kpi-dashboard) - 2nd level → needs HOME button
├── Stock Counts (/stock-count) - 2nd level → needs HOME button
├── Asset Management (/asset-management) - 2nd level → needs HOME button
│   └── Repair Ticket Details (/repair-tickets/:id) - 3rd level → needs BACK button
└── Repair Tickets (/repair-tickets) - 2nd level → needs HOME button
```

**Implementation**:
```typescript
// Create src/components/PageHeader.tsx
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  title: string;
  level: 2 | 3; // page level in hierarchy
  backPath?: string; // for 3rd level pages, specify back path
}

export const PageHeader = ({ title, level, backPath }: PageHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold">{title}</h1>

      {level === 2 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/')}
        >
          <Home className="h-4 w-4 mr-2" />
          Home
        </Button>
      )}

      {level === 3 && backPath && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(backPath)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      )}
    </div>
  );
};

// Usage in pages:
// 2nd level page (e.g., StockOrder.tsx)
<PageHeader title="Stock Order" level={2} />

// 3rd level page (e.g., OrderDetails.tsx)
<PageHeader title="Order Details" level={3} backPath="/tracking" />
```

**Files to modify/create**:
- `src/components/PageHeader.tsx`: New component
- All 2nd level pages: Add `<PageHeader level={2} />`
- All 3rd level pages: Add `<PageHeader level={3} backPath="..." />`

**Pages to update**:
- `src/pages/StockOrder.tsx`
- `src/pages/Tracking.tsx`
- `src/pages/StockAdmin.tsx`
- `src/pages/DispatchQueue.tsx`
- `src/pages/UserManagement.tsx`
- `src/pages/KpiDashboard.tsx`
- `src/pages/StockCount.tsx`
- `src/pages/AssetManagement.tsx`
- `src/pages/RepairTickets.tsx`
- Any detail/child pages

---

### 2.3 Remove "Order On Behalf Of" Field

**Location**: Stock Order form

```typescript
// In StockOrder.tsx
// Find and REMOVE this field:
<FormField
  control={form.control}
  name="onBehalfOf" // or "on_behalf_of"
  // ... DELETE THIS ENTIRE FIELD
/>

// Also remove from:
// - Form schema/validation
// - OrderFormData interface
// - Submission payload
```

**Files to modify**:
- `src/pages/StockOrder.tsx`: Remove field from form
- `src/hooks/useAirtable.ts`: Remove from OrderFormData interface and transformation
- `src/integrations/supabase/services-orders.ts`: Keep in database schema (for historical data) but don't send in creates

**Database**: Keep `on_behalf_of` column in `unique_orders` table (it's nullable, historical orders may use it)

---

## 📋 Implementation Checklist

### Phase 1: Critical Fixes (Do First)
- [ ] **RUN** `scripts/fix-unique-orders-rls-policies.sql` in Supabase → UNBLOCKS ORDER SUBMISSION
- [ ] Test order submission works
- [ ] Remove "Order On Behalf Of" field

### Phase 2: Xlink-Sage Intelligence (1-2 days)
- [ ] Implement conversation memory (client-side)
- [ ] Update dropdown guidance in knowledge base
- [ ] Add user role context to bot
- [ ] Implement navigable links parsing
- [ ] Create bot usage logging table
- [ ] Add satisfaction rating UI
- [ ] Update branding to "Old Sage"
- [ ] Re-ingest documents with updates

### Phase 3: App Refinements (1 day)
- [ ] Change company field to dropdown
- [ ] Create PageHeader component
- [ ] Audit all pages and add navigation buttons
- [ ] Test navigation flows

### Phase 4: Analytics & Monitoring (1 day)
- [ ] Build Bot Usage Analytics component
- [ ] Add tab to KPI Dashboard
- [ ] Verify 90-day forecasting logic in Alerts
- [ ] Add pro-tip messaging for admins

---

## 🎯 Success Metrics

**Bot Improvements**:
- Users can have multi-turn conversations (>3 messages in same context)
- Dropdown instructions never pick single option
- Admin users see pro-tips about KPI features
- 80%+ satisfaction rating on bot responses
- <5% of queries flagged as non-work-related abuse

**App Refinements**:
- 100% of pages have correct navigation (back/home buttons)
- Company field is dropdown (only 2 options)
- "Order On Behalf Of" field removed
- Zero navigation confusion from users

---

## 📝 Notes

- **RLS Fix is URGENT** - blocking all order submissions right now
- Conversation memory can start simple (client-side only), upgrade to database later if needed
- Bot analytics help justify OpenAI costs and identify training needs
- Navigation audit can be done quickly with PageHeader component
- Keep `on_behalf_of` in database for historical data, just hide from new forms

---

**Let's go for gold! 🏆**
