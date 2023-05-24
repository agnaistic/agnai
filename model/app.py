from flask import Flask, request
from flask_cors import CORS
from summary import summarize

# from args import args

app = Flask("agnai-pipeline")
CORS(app)


@app.get("/status")
def statusGet():
    # memory = True if args.memory or args.all else False
    # summary = True if args.summary or args.all else False
    return {"status": "ok"}


@app.post("/status")
def statusPost():
    payload = request.get_json(silent=True)
    if payload is None:
        return {"payload": "None"}
    value = payload.get("status", False) or "None"
    return {"payload": value}


@app.post("/summarize")
def summarizePost():
    payload = request.get_json(silent=True)
    if payload is None:
        return {"success": False, "message": "Payload empty"}

    prompt = payload.get("prompt", False) or "None"
    resp = summarize(prompt)
    return {"success": True, "summary": resp}


print(
    'Pipeline API started: Remember to enable "USE LOCAL PIPELINE" in your Agnaistic account settings'
)
