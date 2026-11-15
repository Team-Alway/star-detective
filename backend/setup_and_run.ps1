# PowerShell Quick-Start Script for Star Detective Backend
Write-Host "=== Star Detective Academy Backend ===" -ForegroundColor Cyan

# Verify FITS cache
python fetch_real_nasa.py

# Refresh OpenAPI JSON spec for Frontend Team
python export_openapi.py

Write-Host "`nStarting FastAPI Server on http://localhost:8000 ..." -ForegroundColor Green
Write-Host "Interactive Swagger UI: http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host "OpenAPI JSON URL:       http://localhost:8000/openapi.json`n" -ForegroundColor Yellow

uvicorn main:app --reload --host 0.0.0.0 --port 8000
