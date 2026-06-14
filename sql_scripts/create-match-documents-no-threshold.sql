-- Alternative match_documents function WITHOUT threshold filtering
-- This gets top N results regardless of similarity score (like ChromaDB)
-- Useful for debugging what similarity scores we're actually getting

create or replace function match_documents_no_threshold (
  query_embedding vector(1536),
  match_count int
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where documents.embedding IS NOT NULL  -- Only exclude null embeddings
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Test the new function with a sample embedding (all zeros for testing)
-- In production, this would be a real embedding from OpenAI
SELECT
  id,
  LEFT(content, 100) as content_preview,
  similarity
FROM match_documents_no_threshold(
  (SELECT embedding FROM documents LIMIT 1),  -- Use first document's embedding as test
  10
);
