# System Guide Bot Setup Guide

This guide will help you set up the AI-powered System Guide chatbot for your 4D Inventory Management System. The bot uses vector embeddings to search your documentation and provide contextual answers to users.

## Architecture Overview

The System Guide Bot consists of three main components:

1. **Vector Database**: Supabase with pgvector extension stores document embeddings
2. **Backend**: Netlify serverless function (or optional n8n workflow) handles queries
3. **Frontend**: React component provides the chat interface

## Prerequisites

Before starting, ensure you have:

- ✅ Supabase project with pgvector extension enabled
- ✅ OpenAI API key (for embeddings and chat)
- ✅ Python 3.8+ (for document ingestion)
- ✅ Node.js 16+ (for the frontend)

## Step 1: Setup Supabase Vector Database

### 1.1 Run the SQL Schema

Execute the SQL file to create the documents table and search function:

```bash
# In Supabase SQL Editor, run:
cat scripts/create-vector-table-documents.sql
```

Or execute it directly in your Supabase dashboard:
1. Go to SQL Editor in Supabase
2. Copy contents of `scripts/create-vector-table-documents.sql`
3. Run the query

This creates:
- `documents` table with UUID primary key and vector(1536) embedding column
- `match_documents()` function for similarity search

### 1.2 Verify Table Creation

```sql
-- Run in Supabase SQL Editor to verify
SELECT * FROM documents LIMIT 1;
```

## Step 2: Configure Environment Variables

### 2.1 Update Your `.env` File

Add these variables to your `.env` file:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# Chat Endpoint (use Netlify function)
VITE_CHAT_ENDPOINT=/.netlify/functions/chat
```

**Important Notes:**
- `VITE_SUPABASE_SERVICE_ROLE_KEY`: Found in Supabase Project Settings → API → service_role key (keep secret!)
- `OPENAI_API_KEY`: Get from https://platform.openai.com/api-keys
- `VITE_CHAT_ENDPOINT`: This points to the Netlify function (no change needed for local dev)

### 2.2 Configure Netlify Environment Variables

For production, add these to your Netlify dashboard:

1. Go to Site Settings → Environment Variables
2. Add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`

## Step 3: Ingest Your Documentation

### 3.1 Install Python Dependencies

```bash
cd scripts
pip install -r requirements.txt
```

If `requirements.txt` doesn't exist, install manually:

```bash
pip install python-dotenv langchain langchain-community langchain-openai langchain-text-splitters supabase
```

### 3.2 Run the Ingestion Script

```bash
cd scripts
python ingest_documents.py
```

Expected output:
```
Loading Product Documentation from ..\PRODUCT_DOCUMENTATION.md...
Splitting Product Documentation...
Created 70 chunks.
Upserting to Supabase in batches...
  Processing batch 1/7...
  Processing batch 2/7...
  ...
✓ Successfully ingested Product Documentation (70 chunks)!

Loading Knowledge Base Guide from ..\KNOWLEDGE_BASE_WORKFLOW_GUIDE.md...
Splitting Knowledge Base Guide...
Created 45 chunks.
Upserting to Supabase in batches...
  Processing batch 1/5...
  ...
✓ Successfully ingested Knowledge Base Guide (45 chunks)!

Ingestion complete!
```

### 3.3 Verify Ingestion

Check Supabase to confirm documents were added:

```sql
-- Run in Supabase SQL Editor
SELECT
  COUNT(*) as total_chunks,
  COUNT(DISTINCT metadata->>'source') as num_sources
FROM documents;

-- View sources
SELECT DISTINCT metadata->>'source' as source_name
FROM documents;
```

Expected result: ~115 total chunks from 2 sources.

### 3.4 Add More Documents (Optional)

To add more documentation:

1. Create a new markdown file in the project root
2. Add it to `scripts/ingest_documents.py`:

```python
if __name__ == "__main__":
    ingest_file("PRODUCT_DOCUMENTATION.md", "Product Documentation")
    ingest_file("KNOWLEDGE_BASE_WORKFLOW_GUIDE.md", "Knowledge Base Guide")
    ingest_file("YOUR_NEW_FILE.md", "Your New Documentation")  # Add this

    print("Ingestion complete!")
```

3. Run the script again

## Step 4: Deploy the Backend

### Option A: Netlify Function (Recommended)

The Netlify function is already created at `netlify/functions/chat.py`.

**Local Testing:**
```bash
# Install Netlify CLI if needed
npm install -g netlify-cli

# Run local dev server
netlify dev
```

Test the endpoint:
```bash
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"How do I create an order?"}'
```

**Production Deployment:**
```bash
# Deploy to Netlify
netlify deploy --prod
```

The function will be automatically available at:
`https://your-site.netlify.app/.netlify/functions/chat`

### Option B: n8n Workflow (Alternative)

If you prefer using n8n for orchestration:

1. Import the workflow:
   - Open n8n
   - Import `n8n flows/SystemGuideChat.json`

2. Configure credentials:
   - OpenAI API credentials
   - Supabase credentials

3. Activate the workflow and copy the webhook URL

4. Update your `.env`:
   ```bash
   # Comment out VITE_CHAT_ENDPOINT
   # VITE_CHAT_ENDPOINT=/.netlify/functions/chat

   # Use n8n instead
   VITE_N8N_CHAT_WEBHOOK_URL=https://your-n8n-instance.com/webhook/chat
   ```

## Step 5: Test the Frontend

### 5.1 Add the Component to Your App

The SystemGuideBot component should already be added to your app. If not:

```tsx
// In src/App.tsx or your main layout
import { SystemGuideBot } from "@/components/SystemGuideBot";

function App() {
  return (
    <div>
      {/* Your app content */}

      {/* Add at the bottom */}
      <SystemGuideBot />
    </div>
  );
}
```

### 5.2 Run Development Server

```bash
npm run dev
```

### 5.3 Test the Chat

1. Open your app in the browser
2. Look for the floating chat button in the bottom-right corner
3. Click to open the chat
4. Ask a question like:
   - "How do I create an order?"
   - "What is the workflow for picking items?"
   - "How do I dispatch an order?"

Expected behavior:
- Bot responds with relevant information from your documentation
- Sources are included in the response (visible in dev console)
- Responses are contextual and accurate

## Troubleshooting

### Issue: "I couldn't reach the knowledge base"

**Possible causes:**
1. Missing environment variables
2. Netlify function not deployed
3. OpenAI API key invalid or out of credits

**Fix:**
```bash
# Check environment variables
echo $VITE_CHAT_ENDPOINT
echo $OPENAI_API_KEY

# Test Netlify function directly
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'
```

### Issue: Ingestion Script Fails

**Error: "OpenAI API key not found"**
```bash
# Make sure .env file exists in project root
# Check if OPENAI_API_KEY is set
cat .env | grep OPENAI_API_KEY
```

**Error: "Rate limit exceeded"**
- OpenAI has rate limits on embeddings
- The script now processes in batches with delays
- Wait a few minutes and try again

**Error: "Supabase connection failed"**
```bash
# Verify Supabase credentials
cat .env | grep SUPABASE
```

### Issue: No Relevant Results

If the bot can't find relevant documentation:

1. **Check if documents were ingested:**
   ```sql
   SELECT COUNT(*) FROM documents;
   ```

2. **Verify embeddings exist:**
   ```sql
   SELECT id, metadata, embedding IS NOT NULL as has_embedding
   FROM documents
   LIMIT 5;
   ```

3. **Lower similarity threshold:**
   Edit `netlify/functions/chat.py`:
   ```python
   SIMILARITY_THRESHOLD = 0.5  # Lower from 0.7
   ```

### Issue: Slow Responses

**Optimization tips:**
1. Use `gpt-4o-mini` (already configured) instead of `gpt-4`
2. Reduce `MAX_RESULTS` in `netlify/functions/chat.py`
3. Cache common queries (advanced)

## Customization

### Modify System Prompt

Edit the system prompt in `netlify/functions/chat.py`:

```python
system_prompt = f"""You are a helpful [YOUR COMPANY] assistant.
Use the following documentation to answer questions...
[Customize tone, style, instructions]
"""
```

### Change Embedding Model

Edit `scripts/ingest_documents.py`:

```python
# Options: text-embedding-3-small (default), text-embedding-3-large
embeddings = OpenAIEmbeddings(model="text-embedding-3-large")
```

**Note:** If you change models, you must:
1. Update both ingestion script AND Netlify function
2. Re-run ingestion to regenerate embeddings
3. Update vector dimension in SQL schema if needed

### Adjust Chunk Size

Edit `scripts/ingest_documents.py`:

```python
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1500,  # Increase for more context per chunk
    chunk_overlap=300,  # Increase for better continuity
    separators=["\n## ", "\n### ", "\n", " ", ""]
)
```

## Production Checklist

Before going live:

- [ ] All environment variables configured in Netlify
- [ ] Documents successfully ingested to Supabase
- [ ] Netlify function deployed and tested
- [ ] Chat interface tested with real questions
- [ ] Rate limiting considered (OpenAI API limits)
- [ ] Error handling tested (network failures, API errors)
- [ ] Service role key kept secure (not in frontend code)

## Cost Estimation

**OpenAI Costs:**
- Embeddings (text-embedding-3-small): $0.00002 / 1K tokens
- Chat (gpt-4o-mini): $0.15 / 1M input tokens, $0.60 / 1M output tokens

**Example for 100 chunks:**
- Ingestion: ~$0.01 (one-time)
- Per query: ~$0.001 - $0.01 (depending on context size)

**Supabase:** Free tier includes 500MB database + 2GB bandwidth

## Next Steps

1. **Monitor usage**: Check OpenAI dashboard for API usage
2. **Gather feedback**: Ask users if answers are helpful
3. **Improve documentation**: Add more detailed docs based on common questions
4. **Add analytics**: Track which questions are asked most
5. **Consider caching**: Cache common questions to reduce API costs

## Support

If you encounter issues:

1. Check the browser console for errors
2. Check Netlify function logs
3. Verify Supabase table has data
4. Test OpenAI API key directly

## Files Reference

- Frontend: `src/components/SystemGuideBot.tsx`
- Netlify Function: `netlify/functions/chat.py`
- n8n Workflow: `n8n flows/SystemGuideChat.json`
- Database Schema: `scripts/create-vector-table-documents.sql`
- Ingestion Script: `scripts/ingest_documents.py`
- Environment Config: `.env.example`
