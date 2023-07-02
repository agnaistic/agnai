from flask import Flask, request
from flask_cors import CORS

app = Flask("agnai-pipeline")


CORS(app)
