from args import args
from flask import request
from server import app


@app.get("/pipeline/status")
def statusGet():
    return {
        "status": "ok",
        "summarizer": summary.enabled,
        "memory": memory.enabled,
        "desired": {"memory": args.memory, "summary": args.summary},
    }


@app.post("/pipeline/summarize")
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


import memory
import summary


print(
    'Pipeline API started: Remember to enable "USE LOCAL PIPELINE" in your Agnaistic account settings'
)
app.run(host="localhost", port=5001)
