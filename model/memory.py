from os.path import abspath
import chromadb
from chromadb.utils import embedding_functions
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from args import args
from server import app
from flask import request

enabled = False
dir = abspath("./db")


print(f"Preparing ChromaDB... {dir}")
client = chromadb.Client(
    Settings(
        anonymized_telemetry=False,
        persist_directory=dir,
        chroma_db_impl="duckdb+parquet",
    )
)
model = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)
trx = SentenceTransformer("all-MiniLM-L6-v2")
embed = lambda *args, **kwargs: trx.encode(*args, **kwargs).tolist()


@app.post("/embed/<chat_id>/reembed")
def memoryReembed(chat_id):
    payload = request.get_json(silent=True)
    messages = payload.get("messages", False) or None

    if messages is None:
        return {"success": False, "error": ".messages missing in payload"}

    documents = [msg["msg"] for msg in messages]
    ids = [msg["_id"] for msg in messages]
    metadatas = [{"name": msg["name"], "date": msg["createdAt"]} for msg in messages]

    try:
        client.delete_collection(chat_id)
    except:
        pass

    collection = client.get_or_create_collection(name=chat_id, embedding_function=embed)
    collection.upsert(ids=ids, documents=documents, metadatas=metadatas)

    return {"success": True}


@app.post("/embed/<chat_id>/chat")
def chatEmbed(chat_id):
    payload = request.get_json(silent=True)
    messages = payload.get("messages", False) or None

    if messages is None:
        return {"success": False, "error": ".messages missing in payload"}

    documents = [msg["msg"] for msg in messages]
    ids = [msg["_id"] for msg in messages]
    metadatas = [{"name": msg["name"], "date": msg["createdAt"]} for msg in messages]

    collection = client.get_or_create_collection(name=chat_id, embedding_function=embed)
    collection.upsert(ids=ids, documents=documents, metadatas=metadatas)

    return {"success": True}


@app.post("/embed/<name>")
def embedContent(name):
    payload = request.get_json(silent=True)
    documents = payload.get("documents")
    ids = payload.get("ids")
    metadatas = payload.get("metadataas")

    collection = client.get_or_create_collection(name=name, embedding_function=embed)
    collection.upsert(ids=ids, documents=documents, metadatas=metadatas)

    return {"success": True}


@app.post("/embed/<name>/query")
def recallContent(name):
    payload = request.get_json(silent=True)
    collection = client.get_or_create_collection(name=name, embedding_function=embed)

    results = collection.query(
        query_texts=payload["message"],
        n_results=25,
    )

    print(results)

    return {"result": results}


@app.get("/embed")
def listCollections():
    collections = client.list_collections()
    print(collections)

    results = []
    for i, row in enumerate(collections):
        row[i] = {"id": row.id, "name": row.name, "metadata": row.metadata}

    return {"result": results}


print("ChromaDB ready")
enabled = True
