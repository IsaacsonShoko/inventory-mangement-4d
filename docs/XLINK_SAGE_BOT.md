# Xlink-Sage: AI-Powered System Guide

## Overview

**Xlink-Sage** is an intelligent, context-aware chatbot that serves as the "Old Sage of Inventory Wisdom" - a witty, grounded guide embedded directly in the inventory management system. It provides instant answers to user questions by searching through comprehensive system documentation using AI-powered vector similarity search.

## Key Features

### 1. Conversational Intelligence

- **Conversation Memory**: Remembers the last 5 message exchanges in each session
- **Context-Aware Responses**: Maintains conversation context for natural, multi-turn interactions
- **Session Persistence**: Conversations persist across page refreshes using local storage
- **Smart Persona**: Responds in plain, jargon-free language with light wit and sage-like wisdom

### 2. Knowledge Retrieval

- **Vector Similarity Search**: Uses OpenAI embeddings to find the most relevant documentation
- **Real-time Context**: Searches knowledge base in real-time for every query
- **Source Attribution**: Shows which documentation sections were used (when available)
- **Accuracy-First**: Only provides information from actual documentation - never guesses

### 3. System-Specific Guidance

- **Dropdown Field Instructions**: Explicitly guides users to "select the appropriate option" from dropdowns
- **Workflow Assistance**: Understands all system workflows (orders, picking, dispatch, assets, etc.)
- **Role-Aware Responses**: (Planned) Will provide role-specific advice based on user profile
- **Navigable Links**: (Planned) Direct navigation to specific system pages from bot responses

### 4. User Experience

- **Fixed Position**: Always accessible from bottom-right corner of screen
- **Responsive Design**: Works on desktop and mobile devices
- **Loading Indicators**: Clear visual feedback during processing
- **Error Handling**: Friendly error messages with actionable guidance
- **Accessibility**: Screen reader support and keyboard navigation

## Technical Architecture

### Frontend Component
**File**: [src/components/SystemGuideBot.tsx](../src/components/SystemGuideBot.tsx)

```typescript
// Key features:
- Session ID generation for conversation isolation
- localStorage-based conversation history (last 5 exchanges)
- Auto-save on message changes
- Support for both direct Netlify function and n8n fallback
- Error handling with user-friendly messages
```

### Backend Function
**File**: [netlify/functions/chat.js](../netlify/functions/chat.js)

```javascript
// Workflow:
1. Receive user message + conversation history
2. Generate embedding using OpenAI (text-embedding-3-small)
3. Search Supabase for similar documents (vector search)
4. Format context from top 5 matching documents
5. Generate response using OpenAI (gpt-4o-mini) with:
   - System prompt (Xlink-Sage persona)
   - Conversation history (last 5 exchanges)
   - Retrieved context
   - Current user message
6. Return answer + sources
```

### Knowledge Base
**File**: [knowledge-base/KNOWLEDGE_BASE_WORKFLOW_GUIDE.md](../knowledge-base/KNOWLEDGE_BASE_WORKFLOW_GUIDE.md)

Comprehensive documentation covering:
- Order management workflows
- User management and approval processes
- Stock counting procedures
- Asset management and repair workflows
- KPI dashboard explanations
- Dropdown field guidance
- Best practices for each module

### Configuration

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

## Bot Analytics (Planned Features)

### Usage Tracking

A comprehensive analytics system will track all bot interactions for insights and improvements:

**Database Table**: `bot_usage_logs`

```sql
CREATE TABLE bot_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id),
  user_email text,
  user_role text,
  session_id text NOT NULL,
  query text NOT NULL,
  response text NOT NULL,
  sources jsonb,
  tokens_used integer,
  response_time_ms integer,
  is_work_related boolean DEFAULT true,
  satisfaction_rating integer CHECK (satisfaction_rating BETWEEN 1 AND 5),
  satisfaction_feedback text,
  created_at timestamptz DEFAULT now()
);
```

### Metrics Captured

1. **Usage Metrics**:
   - Total queries per day/week/month
   - Queries per user
   - Peak usage times
   - Average response time
   - Token consumption

2. **Quality Metrics**:
   - User satisfaction ratings (1-5 stars)
   - Satisfaction feedback text
   - Most helpful responses
   - Common question patterns

3. **Work Classification**:
   - Work-related vs. non-work queries
   - Most common work topics
   - Off-topic usage patterns

4. **User Insights**:
   - Top users by query count
   - Role-specific usage patterns
   - Question types by role
   - Time to resolution

### KPI Dashboard Integration

The bot analytics will be displayed in the **KPI Dashboard** under a dedicated tab:

**Tab Name**: "System Guide Analytics" or "Xlink-Sage Usage"

**Visualizations**:

1. **Overview Cards**:
   - Total queries this month
   - Average satisfaction rating
   - Most active user
   - Total sessions

2. **Usage Trends** (Line Chart):
   - Queries over time (daily/weekly/monthly)
   - Satisfaction ratings trend
   - Work vs. non-work split over time

3. **Top Questions** (Table):
   - Most frequently asked questions
   - Average satisfaction per question type
   - Response time per question type

4. **User Engagement** (Bar Chart):
   - Queries by user role
   - Top 10 users by query count
   - Average queries per session

5. **Satisfaction Breakdown** (Pie Chart):
   - 5-star: X%
   - 4-star: X%
   - 3-star: X%
   - 2-star: X%
   - 1-star: X%

6. **Response Performance** (Histogram):
   - Response time distribution
   - Token usage distribution
   - Session length distribution

7. **Topic Analysis** (Word Cloud):
   - Most common keywords in queries
   - Top documentation sections accessed

8. **Work Classification** (Donut Chart):
   - Work-related queries: X%
   - Non-work queries: X%
   - Classification accuracy

### Satisfaction Rating UI (Planned)

**User Experience**:
- After each bot response, show 5-star rating component
- Optional feedback textarea (appears after rating)
- "Skip" option to dismiss without rating
- Thank you message after submission

**Implementation Location**:
- [src/components/SystemGuideBot.tsx](../src/components/SystemGuideBot.tsx) - Add rating UI after bot messages
- [netlify/functions/rate-bot.js](../netlify/functions/rate-bot.js) - NEW: Backend for storing ratings

**Rating Prompt**:
```
Was this answer helpful?
⭐ ⭐ ⭐ ⭐ ⭐

[Optional: Tell us more about your experience...]

[Submit] [Skip]
```

## User Roles and Context (Planned)

The bot will receive user profile information to provide role-specific guidance:

```typescript
// Example request payload:
{
  message: "How do I create an order?",
  conversationHistory: [...],
  userContext: {
    email: "john@example.com",
    role: "Technician",
    company: "Xlink",
    warehouse: "Cape Town"
  }
}
```

**Role-Specific Responses**:

- **Technician**: Field operations, mobile scanning, stock counts
- **Admin**: Pro-tips about 90-day forecasting, user management, system configuration
- **Back Office**: Order management, reporting, asset tracking
- **Picker/Dispatcher**: Warehouse workflows, manifests, SLA compliance

## Navigable Links (Planned)

Bot responses will support clickable navigation links using special syntax:

**Syntax**: `[NAVIGATE:Label|/path]`

**Example Response**:
```
To create a new order, [NAVIGATE:click here|/stock-order].
You'll need to fill in the order details and add items to your cart.
```

**Rendering**: Links will appear as buttons that navigate the user directly to the specified page.

## Conversation Memory

### How It Works

1. **Session ID**: Generated when bot is opened: `{timestamp}-{random}`
2. **Storage Key**: `xlink-sage-chat-{sessionId}`
3. **History Limit**: Last 5 user-bot exchanges (10 messages total)
4. **Persistence**: Stored in localStorage, survives page refreshes
5. **API Format**: Sent as OpenAI-compatible messages array

### Storage Format

```typescript
// localStorage format
[
  { id: "123", role: "user", text: "How do I pick orders?" },
  { id: "124", role: "bot", text: "Go to the Picking Queue..." },
  { id: "125", role: "user", text: "What about dispatch?" },
  { id: "126", role: "bot", text: "After picking, go to..." }
]

// Sent to API
conversationHistory: [
  { role: "user", content: "How do I pick orders?" },
  { role: "assistant", content: "Go to the Picking Queue..." },
  { role: "user", content: "What about dispatch?" },
  { role: "assistant", content: "After picking, go to..." }
]
```

## System Prompt

The bot operates with a carefully crafted personality:

```
You are Xlink-Sage, a witty but grounded guide to the inventory system.
Think of yourself as that friend who's seen it all and can point people
in the right direction without the corporate speak.

Your style:
- Plain talk, no jargon storms. If a 10-year-old can't get it, rephrase it.
- Witty but not silly. A light touch of humor keeps things human.
- Sage-like: you know the patterns, you've read the docs, you stick to what's real.
- Short answers win. Give them the path, not the entire forest.

Your rules:
- Only say what the docs actually say. No making stuff up, no guessing.
- If the answer's in the context, give it straight: "Go here, click this."
- If it's not in the context, be honest: "That's not in my scrolls."
- Keep it friendly but factual. You're helpful, not a salesperson.
```

## Error Handling

The bot provides user-friendly error messages for common issues:

| Error Type | User-Friendly Message |
|-----------|---------------------|
| Quota exceeded | "⚠️ The AI service has reached its usage quota. Please contact your system administrator to add credits at platform.openai.com" |
| Rate limit | "⏱️ Too many requests at once. Please wait a moment and try again." |
| Invalid API key | "🔑 The AI service is not properly configured. Please contact your system administrator." |
| Service unavailable | "🔧 The AI service is temporarily down. Please try again in a few minutes." |
| Network error | "I couldn't reach the knowledge base. Please try again or contact support." |

## Knowledge Base Updates

When documentation is updated, embeddings must be regenerated:

**Process**:
1. Update markdown files in `knowledge-base/` directory
2. Run ingestion script: `python scripts/ingest_documents.py`
3. Script generates embeddings and stores in Supabase `documents` table
4. Bot automatically uses updated knowledge on next query

**Ingestion Script** (Planned):
```bash
# From project root
python scripts/ingest_documents.py

# Output:
# Processing KNOWLEDGE_BASE_WORKFLOW_GUIDE.md...
# Generated 42 chunks
# Stored 42 embeddings in Supabase
# Total tokens used: 8,420
# Done!
```

## Cost Analysis

### Current Usage

- **Embedding Model**: text-embedding-3-small ($0.00002 / 1K tokens)
- **Chat Model**: gpt-4o-mini ($0.000150 / 1K input, $0.000600 / 1K output)

### Example Monthly Costs (1000 queries)

```
Embeddings: 1000 queries × 50 tokens avg × $0.00002 = $1.00
Chat Input: 1000 queries × 500 tokens avg × $0.00015 = $75.00
Chat Output: 1000 queries × 150 tokens avg × $0.00060 = $90.00

Total: ~$166/month for 1000 queries
      ~$0.17 per query
```

**Cost Optimization**:
- Conversation memory reduces redundant context
- Document chunking minimizes token usage
- Cache common queries (future enhancement)

## Performance

- **Average Response Time**: 2-4 seconds
- **Embedding Generation**: ~500ms
- **Vector Search**: ~200ms
- **Chat Completion**: 1-3 seconds
- **Total Latency**: Primarily driven by OpenAI API

## Best Practices

### For Users

1. **Be Specific**: "How do I add items to a cart?" is better than "How does ordering work?"
2. **Use Follow-ups**: The bot remembers your last 5 exchanges - reference previous answers
3. **Rate Responses**: Help improve the bot by rating answer quality
4. **Report Issues**: If the bot provides incorrect information, use the feedback feature

### For Administrators

1. **Monitor Usage**: Check KPI dashboard regularly for usage patterns
2. **Update Knowledge Base**: Keep documentation current and comprehensive
3. **Re-ingest Documents**: After major documentation updates, re-run ingestion
4. **Review Feedback**: Analyze low-rated responses to improve documentation
5. **Monitor Costs**: Track OpenAI API usage and set billing alerts

## Troubleshooting

### Bot Not Responding

1. Check browser console for errors
2. Verify network connectivity
3. Check OpenAI API key validity
4. Verify Supabase credentials
5. Check Netlify function logs

### Incorrect Answers

1. Verify knowledge base is up to date
2. Check if embeddings have been regenerated
3. Review the source documents returned
4. Add missing information to knowledge base
5. Re-ingest documents after updates

### Slow Performance

1. Check OpenAI API status
2. Verify Supabase performance
3. Check network latency
4. Review Netlify function logs for bottlenecks

## Future Enhancements

### Planned Features

- ✅ Conversation memory (Completed)
- ✅ Dropdown guidance (Completed)
- ✅ Old Sage branding (Completed)
- ⏳ User role context
- ⏳ Navigable links
- ⏳ Bot usage logging
- ⏳ Satisfaction ratings
- ⏳ KPI dashboard integration

### Potential Enhancements

- **Multi-language Support**: Translate responses to user's preferred language
- **Voice Input**: Speech-to-text for queries
- **Screenshot Analysis**: Upload screenshots for contextual help
- **Proactive Tips**: Suggest relevant help based on current page
- **Query Autocomplete**: Suggest common questions as user types
- **Response Caching**: Cache common queries to reduce API costs
- **Admin Override**: Allow admins to manually correct bot responses
- **Training Mode**: Flag incorrect responses for knowledge base improvement

## Support

For technical support with Xlink-Sage:

1. Check this documentation first
2. Review Netlify function logs
3. Check OpenAI API usage dashboard
4. Contact 4D Analytics support team

## Related Documentation

- [N8N Integration Guide](./N8N_INTEGRATION_GUIDE.md) - Alternative chat backend setup
- [Netlify Functions Setup](./NETLIFY_FUNCTIONS_SETUP.md) - Deployment guide
- [Knowledge Base Guide](../knowledge-base/KNOWLEDGE_BASE_WORKFLOW_GUIDE.md) - Source documentation

---

*Last Updated: December 3, 2025*
