"""
Netlify Function: System Guide Chat with Vector Search
Handles chat requests using Supabase vector similarity search and OpenAI

Usage:
  POST /.netlify/functions/chat
  Body: { "message": "user question" }

Environment Variables (set in Netlify Dashboard):
  VITE_SUPABASE_URL - Your Supabase project URL
  VITE_SUPABASE_SERVICE_ROLE_KEY - Supabase service role key (for vector search)
  OPENAI_API_KEY - OpenAI API key for embeddings and chat
"""

import json
import os
import urllib.request
import urllib.error
from typing import Dict, Any, List

# Environment variables
SUPABASE_URL = os.environ.get('VITE_SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('VITE_SUPABASE_SERVICE_ROLE_KEY', '')
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')

# Configuration
EMBEDDING_MODEL = "text-embedding-3-small"
CHAT_MODEL = "gpt-4o-mini"
SIMILARITY_THRESHOLD = 0.7
MAX_RESULTS = 5


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main handler for chat requests"""

    # CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json',
    }

    # Handle OPTIONS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': '',
        }

    # Only allow POST
    if event.get('httpMethod') != 'POST':
        return error_response('Method not allowed', 405, headers)

    try:
        # Validate environment variables
        if not OPENAI_API_KEY:
            return error_response('OpenAI API key not configured', 500, headers)

        if not SUPABASE_URL or not SUPABASE_KEY:
            return error_response('Supabase credentials not configured', 500, headers)

        # Parse request
        body = json.loads(event.get('body', '{}'))
        user_message = body.get('message', '').strip()

        if not user_message:
            return error_response('Message is required', 400, headers)

        print(f"Processing chat request: {user_message[:50]}...")

        # Step 1: Generate embedding for user message
        embedding = get_embedding(user_message)

        # Step 2: Search Supabase for similar documents
        documents = search_similar_documents(embedding)

        # Step 3: Format context from documents
        context, sources = format_context(documents)

        # Step 4: Generate AI response using context
        answer = generate_chat_response(user_message, context)

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'answer': answer,
                'sources': sources,
            }),
        }

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return error_response(f'Failed to process chat: {str(e)}', 500, headers)


def get_embedding(text: str) -> List[float]:
    """Get OpenAI embedding for text"""
    url = 'https://api.openai.com/v1/embeddings'

    data = json.dumps({
        'input': text,
        'model': EMBEDDING_MODEL
    }).encode('utf-8')

    req = urllib.request.Request(
        url,
        data=data,
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {OPENAI_API_KEY}'
        },
        method='POST'
    )

    with urllib.request.urlopen(req, timeout=30) as response:
        result = json.loads(response.read().decode('utf-8'))
        return result['data'][0]['embedding']


def search_similar_documents(embedding: List[float]) -> List[Dict[str, Any]]:
    """Search Supabase for similar documents using vector similarity"""

    # Call the match_documents function
    url = f"{SUPABASE_URL}/rest/v1/rpc/match_documents"

    data = json.dumps({
        'query_embedding': embedding,
        'match_threshold': SIMILARITY_THRESHOLD,
        'match_count': MAX_RESULTS
    }).encode('utf-8')

    req = urllib.request.Request(
        url,
        data=data,
        headers={
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}'
        },
        method='POST'
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            documents = json.loads(response.read().decode('utf-8'))
            print(f"Found {len(documents)} similar documents")
            return documents
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"Supabase search error: {error_body}")
        # Return empty list if search fails
        return []


def format_context(documents: List[Dict[str, Any]]) -> tuple[str, List[Dict[str, str]]]:
    """Format documents into context string and sources list"""

    if not documents:
        return "No relevant documentation found.", []

    # Build context
    context_parts = []
    sources = []

    for idx, doc in enumerate(documents[:MAX_RESULTS], 1):
        content = doc.get('content', '')
        metadata = doc.get('metadata', {})
        similarity = doc.get('similarity', 0)

        source_name = metadata.get('source', 'Documentation')

        context_parts.append(f"[{idx}] Source: {source_name}\n{content}")
        sources.append({
            'title': source_name,
            'similarity': round(similarity, 3)
        })

    context = '\n\n---\n\n'.join(context_parts)

    return context, sources


def generate_chat_response(user_message: str, context: str) -> str:
    """Generate chat response using OpenAI with context"""

    url = 'https://api.openai.com/v1/chat/completions'

    system_prompt = f"""You are a helpful 4D Inventory Management System assistant. Use the following documentation to answer the user's question. If the documentation doesn't contain relevant information, say so politely and suggest contacting support.

Documentation:
{context}

Provide clear, concise answers based on this documentation. Include specific details when available."""

    data = json.dumps({
        'model': CHAT_MODEL,
        'messages': [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_message}
        ],
        'temperature': 0.7,
        'max_tokens': 500
    }).encode('utf-8')

    req = urllib.request.Request(
        url,
        data=data,
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {OPENAI_API_KEY}'
        },
        method='POST'
    )

    with urllib.request.urlopen(req, timeout=30) as response:
        result = json.loads(response.read().decode('utf-8'))
        return result['choices'][0]['message']['content']


def error_response(message: str, status_code: int, headers: Dict[str, str]) -> Dict[str, Any]:
    """Create error response"""
    return {
        'statusCode': status_code,
        'headers': headers,
        'body': json.dumps({
            'success': False,
            'error': message,
        }),
    }
