from args import args
from flask import Flask, request
from flask_cors import CORS


# from args import args

app = Flask("agnai-pipeline")
app.run(host="localhost", port=5001)

CORS(app)


@app.get("/status")
def statusGet():
    return {
        "status": "ok",
        "summarizer": summary.enabled,
        "memory": memory.enabled,
        "desired": {"memory": args.memory, "summary": args.summary},
    }


@app.post("/summarize")
def summarizePost():
    if summary.enabled is False:
        return {"success": False, "summary": None, "error": "Summarizer disabled"}

    payload = request.get_json(silent=True)
    if payload is None:
        return {"success": False, "message": "Payload empty"}

    prompt = payload.get("prompt", False) or "None"
    resp = summary.summarize(prompt)
    if resp is None:
        return {"success": False, "summary": None}

    return {"success": True, "summary": resp}


@app.post("/memory/<chat_id>/embed")
def memoryEmbed(chat_id):
    payload = request.get_json(Silent=True)
    messages = payload.get("messages", False) or None

    if messages is None:
        return {"success": False, "error": "chatId or messages missing in payload"}

    documents = [msg["msg"] for msg in messages]
    ids = [msg["_id"] for msg in messages]
    metadatas = [{"name": msg["name"], "date": msg["createdAt"]} for msg in messages]

    collection = memory.client.get_or_create_collection(
        name=chat_id, embedding_function=memory.embed
    )
    collection.upsert(ids=ids, documents=documents, metadatas=metadatas)

    return {"success": True}


@app.post("/memory/<chat_id>")
def memoryRecall(chat_id):
    payload = request.get_json(Silent=True)
    collection = memory.client.get_or_create_collection(
        name=chat_id, embedding_function=memory.embed
    )


print(
    'Pipeline API started: Remember to enable "USE LOCAL PIPELINE" in your Agnaistic account settings'
)

import memory
import summary
