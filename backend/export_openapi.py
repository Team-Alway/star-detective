"""
Utility script to export FastAPI's live OpenAPI 3.1.0 schema to `openapi.json`.
Run this anytime you add or modify an endpoint in `main.py`:
    python export_openapi.py
"""
import json
from main import app

if __name__ == "__main__":
    schema = app.openapi()
    with open("openapi.json", "w", encoding="utf-8") as f:
        json.dump(schema, f, indent=2)
    print("Successfully exported openapi.json! Endpoints documented:", len(schema.get("paths", {})))
