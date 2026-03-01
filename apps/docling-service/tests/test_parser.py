import pytest
from fastapi.testclient import TestClient
from main import app
import os

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "docling"


def test_parse_rejects_non_pdf():
    """Test that non-PDF files are rejected."""
    response = client.post(
        "/parse",
        files={"file": ("test.txt", b"hello world", "text/plain")},
    )
    assert response.status_code == 400


def test_parse_rejects_missing_file():
    """Test that missing file returns error."""
    response = client.post("/parse")
    assert response.status_code == 422


def test_parse_accepts_pdf():
    """Test that PDF files are accepted (uses fixture if available)."""
    fixture_path = os.path.join(os.path.dirname(__file__), "fixtures", "sample.pdf")
    if os.path.exists(fixture_path):
        with open(fixture_path, "rb") as f:
            response = client.post(
                "/parse",
                files={"file": ("sample.pdf", f, "application/pdf")},
            )
            assert response.status_code == 200
            data = response.json()
            assert "pages" in data
            assert "total_pages" in data
    else:
        pytest.skip("No sample.pdf fixture available")
