-- Test Vector Search Functionality
-- Run these queries in Supabase SQL Editor to debug the issue

-- 1. Check if documents exist and have embeddings
SELECT
  COUNT(*) as total_docs,
  COUNT(embedding) as docs_with_embeddings,
  COUNT(*) FILTER (WHERE embedding IS NULL) as docs_without_embeddings
FROM documents;

-- 2. Check embedding dimensions (should be 1536)
SELECT
  id,
  content,
  array_length(embedding::float[], 1) as embedding_dimension
FROM documents
LIMIT 3;

-- 3. Check a sample document
SELECT
  id,
  LEFT(content, 100) as content_preview,
  metadata,
  (embedding::text)[1:50] as embedding_preview
FROM documents
LIMIT 1;

-- 4. Test cosine distance calculation manually
-- This gets the most similar documents to the first document (self-similarity test)
SELECT
  d1.id as query_doc_id,
  d2.id as result_doc_id,
  LEFT(d2.content, 50) as content_preview,
  (d1.embedding <=> d2.embedding) as cosine_distance,
  1 - (d1.embedding <=> d2.embedding) as similarity
FROM
  documents d1,
  documents d2
WHERE d1.id = (SELECT id FROM documents LIMIT 1)
ORDER BY d1.embedding <=> d2.embedding
LIMIT 5;

-- 5. Check similarity distribution (no threshold)
-- This helps us understand what threshold values are realistic
WITH similarity_check AS (
  SELECT
    d1.id as doc1,
    d2.id as doc2,
    1 - (d1.embedding <=> d2.embedding) as similarity
  FROM
    documents d1,
    documents d2
  WHERE d1.id != d2.id
  LIMIT 1000
)
SELECT
  MIN(similarity) as min_similarity,
  MAX(similarity) as max_similarity,
  AVG(similarity) as avg_similarity,
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY similarity) as percentile_25,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY similarity) as median,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY similarity) as percentile_75,
  PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY similarity) as percentile_90
FROM similarity_check;
