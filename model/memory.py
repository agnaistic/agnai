from os.path import abspath
import chromadb
from chromadb.utils import embedding_functions
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from args import args

enabled = False

dir = abspath("./db")

if args.all or args.memory:
    print(f"Preparing ChromaDB... {dir}")

    model = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="all-MiniLM-L6-v2"
    )
    trx = SentenceTransformer("all-MiniLM-L6-v2")

    client = chromadb.Client(
        Settings(
            anonymized_telemetry=False,
            persist_directory=dir,
            chroma_db_impl="duckdb+parquet",
        )
    )
    embed = lambda *args, **kwargs: trx.encode(*args, **kwargs).tolist()
    print("ChromaDB ready")
    enabled = True
else:
    print("ChromeDB skipped")
