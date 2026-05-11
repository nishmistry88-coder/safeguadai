import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load .env variables
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

if not MONGO_URI:
    raise ValueError("MONGO_URI is missing from .env")

client = MongoClient(MONGO_URI)

db = client["safeguard_ai"]
