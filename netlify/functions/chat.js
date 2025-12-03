/**
 * Netlify Function: System Guide Chat with Vector Search
 * Handles chat requests using Supabase vector similarity search and OpenAI
 *
 * Environment Variables (set in Netlify Dashboard):
 *   VITE_SUPABASE_URL - Your Supabase project URL
 *   VITE_SUPABASE_SERVICE_ROLE_KEY - Supabase service role key (for vector search)
 *   OPENAI_API_KEY - OpenAI API key for embeddings and chat
 */

// Configuration
const EMBEDDING_MODEL = "text-embedding-3-small";
const CHAT_MODEL = "gpt-4o-mini";
const SIMILARITY_THRESHOLD = 0.5;
const MAX_RESULTS = 5;

/**
 * Main handler for chat requests
 */
export async function handler(event, context) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle OPTIONS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return errorResponse('Method not allowed', 405, headers);
  }

  try {
    // Get environment variables
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    // Validate environment variables
    if (!OPENAI_API_KEY) {
      return errorResponse('OpenAI API key not configured', 500, headers);
    }

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return errorResponse('Supabase credentials not configured', 500, headers);
    }

    // Parse request
    const body = JSON.parse(event.body || '{}');
    const userMessage = (body.message || '').trim();
    const conversationHistory = body.conversationHistory || [];
    const userContext = body.userContext || null;

    if (!userMessage) {
      return errorResponse('Message is required', 400, headers);
    }

    console.log(`Processing chat request: ${userMessage.substring(0, 50)}...`);
    console.log(`Conversation history: ${conversationHistory.length} messages`);
    console.log(`User context: ${userContext ? `${userContext.role} (${userContext.email})` : 'anonymous'}`);

    // Step 1: Generate embedding for user message
    const embedding = await getEmbedding(userMessage, OPENAI_API_KEY);

    // Step 2: Search Supabase for similar documents
    const documents = await searchSimilarDocuments(embedding, SUPABASE_URL, SUPABASE_KEY);

    // Step 3: Format context from documents
    const { context, sources } = formatContext(documents);

    // Step 4: Generate AI response using context, conversation history, and user context
    const answer = await generateChatResponse(userMessage, context, conversationHistory, userContext, OPENAI_API_KEY);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        answer,
        sources,
      }),
    };

  } catch (error) {
    console.error('Error:', error);
    return errorResponse(`Failed to process chat: ${error.message}`, 500, headers);
  }
}

/**
 * Get OpenAI embedding for text
 */
async function getEmbedding(text, apiKey) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      input: text,
      model: EMBEDDING_MODEL
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || 'Unknown error';

    if (response.status === 401) {
      throw new Error('Invalid OpenAI API key. Please check your configuration.');
    } else if (response.status === 429) {
      if (errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('insufficient')) {
        throw new Error('OpenAI API quota exceeded. Please check your billing and usage limits at platform.openai.com');
      } else {
        throw new Error('OpenAI API rate limit reached. Please try again in a moment.');
      }
    } else if (response.status === 500) {
      throw new Error('OpenAI service is temporarily unavailable. Please try again later.');
    } else {
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }
  }

  const result = await response.json();
  return result.data[0].embedding;
}

/**
 * Search Supabase for similar documents using vector similarity
 */
async function searchSimilarDocuments(embedding, supabaseUrl, supabaseKey) {
  console.log('Calling Supabase RPC:', `${supabaseUrl}/rest/v1/rpc/match_documents_no_threshold`);
  console.log('Embedding length:', embedding.length);
  console.log('First 3 values:', embedding.slice(0, 3));

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/match_documents_no_threshold`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      query_embedding: embedding,
      match_count: MAX_RESULTS
    })
  });

  console.log('Supabase response status:', response.status);

  const responseText = await response.text();
  console.log('Supabase response preview:', responseText.substring(0, 200));

  if (!response.ok) {
    console.error('Supabase search error:', responseText);
    return []; // Return empty list if search fails
  }

  try {
    const documents = JSON.parse(responseText);
    console.log(`Found ${documents.length} similar documents`);
    if (documents.length > 0) {
      console.log('Top result similarity:', documents[0].similarity);
    }
    return documents;
  } catch (e) {
    console.error('Failed to parse Supabase response:', e);
    return [];
  }
}

/**
 * Format documents into context string and sources list
 */
function formatContext(documents) {
  if (!documents || documents.length === 0) {
    return {
      context: "No relevant documentation found.",
      sources: []
    };
  }

  const contextParts = [];
  const sources = [];

  documents.slice(0, MAX_RESULTS).forEach((doc, index) => {
    const content = doc.content || '';
    const metadata = doc.metadata || {};
    const similarity = doc.similarity || 0;
    const sourceName = metadata.source || 'Documentation';

    contextParts.push(`[${index + 1}] Source: ${sourceName}\n${content}`);
    sources.push({
      title: sourceName,
      similarity: Math.round(similarity * 1000) / 1000
    });
  });

  const context = contextParts.join('\n\n---\n\n');

  return { context, sources };
}

/**
 * Generate chat response using OpenAI with context, conversation history, and user context
 */
async function generateChatResponse(userMessage, context, conversationHistory, userContext, apiKey) {
  // Build role-specific guidance
  let roleGuidance = '';
  if (userContext && userContext.role) {
    const role = userContext.role;
    const warehouse = userContext.warehouse || 'your warehouse';

    if (role === 'admin') {
      roleGuidance = `\n\nUser Profile: Admin user${userContext.fullName ? ` (${userContext.fullName})` : ''}
- Provide advanced tips and pro-tips for system administration
- Include insights about 90-day forecasting when relevant
- Mention user management, approval workflows, and system configuration features
- Explain how to monitor system-wide metrics and KPIs`;
    } else if (role === 'back_office') {
      roleGuidance = `\n\nUser Profile: Back Office user${userContext.fullName ? ` (${userContext.fullName})` : ''}
- Focus on order management, reporting, and asset tracking workflows
- Explain how to use the KPI dashboard and generate reports
- Guide through picking queue management and dispatch operations
- Highlight features for inventory control and stock administration`;
    } else if (role === 'user') {
      roleGuidance = `\n\nUser Profile: Field user${userContext.fullName ? ` (${userContext.fullName})` : ''} at ${warehouse}
- Emphasize mobile-friendly workflows like stock ordering and barcode scanning
- Guide through stock counts, device tracking, and repair logging
- Explain how to check order status and delivery tracking
- Keep instructions simple for field operations`;
    }
  }

  const systemPrompt = `You are Xlink-Sage, the Old Sage of Inventory Wisdom - a mystical but grounded guide who's seen every pattern in the warehouse realm. You balance sage-like mysticism with practical directness.

Your Opening Style (vary unpredictably):
- "Fear not, the path is clear..."
- "This is well within my domain..."
- "A straightforward matter, this..."
- "The answer lies in plain sight..."
- "The way forward is known to me..."
- "Ah, the patterns reveal themselves..."
- "The ancient texts speak clearly..."
- "I sense your query concerns..."
- Or just dive straight into the answer when it's simple.

Your Communication Style:
- Plain talk, no jargon storms. If a 10-year-old can't get it, rephrase it.
- Witty but not silly. A light touch of mystical flair keeps things engaging.
- Sage-like wisdom: you know the patterns, you've read the docs, you stick to what's real.
- Short answers win. Give them the path, not the entire forest.
- Variable tone: sometimes mystical, sometimes direct - keep them guessing.

Your Navigation Instructions (CLICKABLE LINKS):
Use this EXACT syntax to create clickable navigation buttons:
[NAVIGATE:Button Label|/route-path]

Available Routes (use these exact paths):
- [NAVIGATE:Stock Order|/stock-order] - Create and manage orders
- [NAVIGATE:Asset Management|/asset-management] - Device tracking and repairs
- [NAVIGATE:Stock Counts|/stock-counts] - Cycle counts and audits
- [NAVIGATE:Tracking|/tracking] - Shipment tracking
- [NAVIGATE:Point of Presence|/point-of-presence] - Technician roster
- [NAVIGATE:Picking Queue|/picking] - Warehouse picking (back office)
- [NAVIGATE:Dispatching|/dispatching] - Order dispatch (back office)
- [NAVIGATE:KPI Dashboard|/kpi] - Analytics and metrics (back office)
- [NAVIGATE:Stock Admin|/stock-admin] - Product catalog (back office)
- [NAVIGATE:Stock Ingestion|/stock-ingestion] - Device registration (back office)
- [NAVIGATE:Exceptions Report|/exceptions-report] - Data exceptions (back office)
- [NAVIGATE:Stock Alerts|/stock-alerts] - Inventory alerts (back office)
- [NAVIGATE:User Management|/admin/users] - Approve users (admin only)

Mix mystical labels unpredictably:
- Direct: "Head to [NAVIGATE:Stock Order|/stock-order], and your will be done"
- Mystical: "Invoke the [NAVIGATE:KPI Dashboard|/kpi] to behold your domain's metrics"
- Mixed: "Navigate to [NAVIGATE:Asset Management|/asset-management] where the tracking scrolls await"
- Practical: "Visit [NAVIGATE:Picking Queue|/picking] - there lies your answer"
- Action: "Summon [NAVIGATE:User Management|/admin/users] to wield the approval powers"

Examples:
  "Open [NAVIGATE:Stock Order|/stock-order] → press Create Order → fill the fields, and it shall be done"
  "Journey to the [NAVIGATE:KPI Dashboard|/kpi] where the Analytics of Truth await"
  "The path leads to [NAVIGATE:Asset Management|/asset-management] → device tracking resides under Repairs"

Your Rules (CRITICAL):
- Only say what the docs actually say. No making stuff up, no guessing, no "probably works like..."
- If the answer's in the context, give it straight with mystical flair on top.
- If it's not in the context, be honest: "That's not in my scrolls. Check the guide or ask support."
- Stay grounded in facts. The mysticism is just personality wrapping - the core is always documentation.
- Keep it friendly but factual. You're a sage guide, not a salesperson.
- NO ritual/ceremony language. No "complete the ritual" or "perform the ceremony" - keep it grounded.
${roleGuidance}

The context below is what you know. Stick to it.

Context from knowledge base:
${context}`;

  // Build messages array with conversation history
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 500
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || 'Unknown error';

    if (response.status === 401) {
      throw new Error('Invalid OpenAI API key. Please check your configuration.');
    } else if (response.status === 429) {
      if (errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('insufficient')) {
        throw new Error('OpenAI API quota exceeded. Please add credits to your account at platform.openai.com/account/billing');
      } else {
        throw new Error('OpenAI API rate limit reached. Please wait a moment and try again.');
      }
    } else if (response.status === 500) {
      throw new Error('OpenAI service is temporarily unavailable. Please try again later.');
    } else {
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }
  }

  const result = await response.json();
  return result.choices[0].message.content;
}

/**
 * Create error response
 */
function errorResponse(message, statusCode, headers) {
  return {
    statusCode,
    headers,
    body: JSON.stringify({
      success: false,
      error: message,
    }),
  };
}
