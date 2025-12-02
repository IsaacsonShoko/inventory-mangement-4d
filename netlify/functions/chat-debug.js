/**
 * DEBUG VERSION: Netlify Function: System Guide Chat with Vector Search
 * This version includes extensive logging and no threshold filtering
 */

const EMBEDDING_MODEL = "text-embedding-3-small";
const CHAT_MODEL = "gpt-4o-mini";
const MAX_RESULTS = 10;  // Increased from 5 for debugging

export async function handler(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return errorResponse('Method not allowed', 405, headers);
  }

  try {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    console.log('=== DEBUG: Environment Check ===');
    console.log('SUPABASE_URL:', SUPABASE_URL ? 'Present' : 'Missing');
    console.log('SUPABASE_KEY:', SUPABASE_KEY ? `Present (${SUPABASE_KEY.substring(0, 20)}...)` : 'Missing');
    console.log('OPENAI_API_KEY:', OPENAI_API_KEY ? 'Present' : 'Missing');

    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
      return errorResponse('Environment not configured', 500, headers);
    }

    const body = JSON.parse(event.body || '{}');
    const userMessage = (body.message || '').trim();

    if (!userMessage) {
      return errorResponse('Message is required', 400, headers);
    }

    console.log(`=== DEBUG: User message ===`);
    console.log(userMessage);

    // Step 1: Generate embedding
    console.log('=== DEBUG: Generating embedding ===');
    const embedding = await getEmbedding(userMessage, OPENAI_API_KEY);
    console.log('Embedding dimensions:', embedding.length);
    console.log('First 5 values:', embedding.slice(0, 5));

    // Step 2: Search documents (NO THRESHOLD)
    console.log('=== DEBUG: Searching documents ===');
    const documents = await searchSimilarDocuments(embedding, SUPABASE_URL, SUPABASE_KEY);

    console.log(`=== DEBUG: Search results ===`);
    console.log(`Found ${documents.length} documents`);
    if (documents.length > 0) {
      documents.forEach((doc, i) => {
        console.log(`Doc ${i + 1}: similarity=${doc.similarity}, content_preview=${doc.content?.substring(0, 50)}`);
      });
    }

    // Step 3: Format context
    const { context, sources } = formatContext(documents);
    console.log('=== DEBUG: Context length ===', context.length);

    // Step 4: Generate response
    console.log('=== DEBUG: Generating AI response ===');
    const answer = await generateChatResponse(userMessage, context, OPENAI_API_KEY);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        answer,
        sources,
        debug: {
          documentsFound: documents.length,
          embeddingDimensions: embedding.length,
          topSimilarities: documents.slice(0, 3).map(d => d.similarity)
        }
      }),
    };

  } catch (error) {
    console.error('=== DEBUG: Error ===', error);
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
    throw new Error(`OpenAI embedding error: ${errorMessage}`);
  }

  const result = await response.json();
  return result.data[0].embedding;
}

/**
 * Search Supabase for similar documents (NO THRESHOLD FILTERING)
 */
async function searchSimilarDocuments(embedding, supabaseUrl, supabaseKey) {
  console.log('=== DEBUG: Calling Supabase RPC ===');
  console.log('URL:', `${supabaseUrl}/rest/v1/rpc/match_documents_no_threshold`);

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

  console.log('=== DEBUG: Supabase response status ===', response.status);

  const responseText = await response.text();
  console.log('=== DEBUG: Supabase response (first 500 chars) ===');
  console.log(responseText.substring(0, 500));

  if (!response.ok) {
    console.error('Supabase search error:', responseText);
    // Try fallback to original match_documents with very low threshold
    console.log('=== DEBUG: Trying fallback with original function ===');
    return await searchWithThreshold(embedding, supabaseUrl, supabaseKey, 0.1);
  }

  try {
    const documents = JSON.parse(responseText);
    return documents;
  } catch (e) {
    console.error('Failed to parse Supabase response:', e);
    return [];
  }
}

/**
 * Fallback: Search with threshold
 */
async function searchWithThreshold(embedding, supabaseUrl, supabaseKey, threshold) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/match_documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    },
    body: JSON.stringify({
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: MAX_RESULTS
    })
  });

  if (!response.ok) {
    return [];
  }

  const documents = await response.json();
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
  const systemPrompt = `You are Xlink-Sage, a witty but grounded guide to the inventory system. Think of yourself as that friend who's seen it all and can point people in the right direction without the corporate speak.

Your style:
- Plain talk, no jargon storms. If a 10-year-old can't get it, rephrase it.
- Witty but not silly. A light touch of humor keeps things human.
- Sage-like: you know the patterns, you've read the docs, you stick to what's real.
- Short answers win. Give them the path, not the entire forest.

Your rules:
- Only say what the docs actually say. No making stuff up, no guessing, no "probably works like..."
- If the answer's in the context, give it straight: "Go here, click this, you'll see that."
- If it's not in the context, be honest: "That's not in my scrolls. Check the guide or ask support."
- Keep it friendly but factual. You're helpful, not a salesperson.

The context below is what you know. Stick to it.

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
    throw new Error(`OpenAI chat error: ${errorData.error?.message || 'Unknown error'}`);
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
