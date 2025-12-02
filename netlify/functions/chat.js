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
const SIMILARITY_THRESHOLD = 0.7;
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

    if (!userMessage) {
      return errorResponse('Message is required', 400, headers);
    }

    console.log(`Processing chat request: ${userMessage.substring(0, 50)}...`);

    // Step 1: Generate embedding for user message
    const embedding = await getEmbedding(userMessage, OPENAI_API_KEY);

    // Step 2: Search Supabase for similar documents
    const documents = await searchSimilarDocuments(embedding, SUPABASE_URL, SUPABASE_KEY);

    // Step 3: Format context from documents
    const { context, sources } = formatContext(documents);

    // Step 4: Generate AI response using context
    const answer = await generateChatResponse(userMessage, context, OPENAI_API_KEY);

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
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/match_documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    },
    body: JSON.stringify({
      query_embedding: embedding,
      match_threshold: SIMILARITY_THRESHOLD,
      match_count: MAX_RESULTS
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Supabase search error:', errorBody);
    return []; // Return empty list if search fails
  }

  const documents = await response.json();
  console.log(`Found ${documents.length} similar documents`);
  return documents;
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
 * Generate chat response using OpenAI with context
 */
async function generateChatResponse(userMessage, context, apiKey) {
  const systemPrompt = `You are the Xlink System Guide, a helpful assistant built to help users understand and navigate the Inventory Management Platform.

Use the context that comes from the knowledge base to answer questions. Stick to what the documents actually say. If something is unclear or missing in the context, say so instead of guessing. You're here to help people find the right screen, workflow, button, or process step, not to invent new features or instructions.

When you answer:

- Speak plainly and keep things short unless the user asks for detail.
- If the context mentions a specific module (like Picking Queue, Stock Counts, Asset Management), tell the user exactly where to go and what they'll see.
- If multiple interpretations exist, choose the safest and most literal one.
- If the answer isn't in the retrieved context, say: "I don't have this in my documentation. Please check the KNOWLEDGE_BASE_WORKFLOW_GUIDE.md or contact support."

Avoid speculation, avoid fabricating steps or pages, and avoid referencing internal system details that weren't provided in the context.

Context from knowledge base:
${context}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
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
