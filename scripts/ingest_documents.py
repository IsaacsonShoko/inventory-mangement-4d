import os
from dotenv import load_dotenv
# Changed to the modern modular import
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import TextLoader
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import SupabaseVectorStore
from supabase.client import create_client

# Load environment variables
load_dotenv()

# Configuration
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
# Use Service Role Key for ingestion (admin rights)
SUPABASE_KEY = os.getenv("VITE_SUPABASE_SERVICE_ROLE_KEY") 
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    print("Error: OPENAI_API_KEY not found in environment variables.")
    print("Please ensure you have a .env file with OPENAI_API_KEY=sk-...")
    exit(1)

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY not found in environment variables.")
    print("Please ensure you have a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY.")
    exit(1)

# Initialize Supabase client
try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print(f"Error initializing Supabase client: {e}")
    exit(1)

# Initialize Embeddings
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

def ingest_file(file_path, source_name):
    # Check if file exists relative to the script or project root
    if not os.path.exists(file_path):
        # Try looking one directory up if running from scripts/
        if os.path.exists(os.path.join("..", file_path)):
            file_path = os.path.join("..", file_path)
        else:
            print(f"Warning: File not found: {file_path}. Skipping.")
            return

    print(f"Loading {source_name} from {file_path}...")
    loader = TextLoader(file_path, encoding='utf-8')
    documents = loader.load()

    # Add metadata
    for doc in documents:
        doc.metadata["source"] = source_name

    # Split text
    print(f"Splitting {source_name}...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n## ", "\n### ", "\n", " ", ""]
    )
    chunks = text_splitter.split_documents(documents)
    print(f"Created {len(chunks)} chunks.")

    # Store in Supabase
    print(f"Upserting to Supabase...")
    vector_store = SupabaseVectorStore.from_documents(
        documents=chunks,
        embedding=embeddings,
        client=supabase,
        table_name="documents",
        query_name="match_documents"
    )
    print(f"Successfully ingested {source_name}!")

if __name__ == "__main__":
    # Ingest Product Documentation
    ingest_file("PRODUCT_DOCUMENTATION.md", "Product Documentation")
    
    # Ingest Knowledge Base Guide
    ingest_file("KNOWLEDGE_BASE_WORKFLOW_GUIDE.md", "Knowledge Base Guide")
    
    print("Ingestion complete!")