-- 1. Drop the incompatible table and function
drop function if exists match_documents;
drop table if exists documents;

-- 2. Enable pgvector (if not already)
create extension if not exists vector;

-- 3. Re-create table with UUID primary key (The Fix)
create table documents (
  id uuid primary key, -- This was 'bigint', now it matches LangChain's UUIDs
  content text,
  metadata jsonb,
  embedding vector(1536)
);

-- 4. Re-create the search function with UUID return type
create or replace function match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id uuid, -- This must match the table above
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
  where 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;