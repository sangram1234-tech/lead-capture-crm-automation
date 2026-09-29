import os
import tempfile
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from app import database
from app.main import app

@pytest.fixture
def client(monkeypatch):
    fd, path = tempfile.mkstemp(suffix=".db"); os.close(fd)
    monkeypatch.setattr(database, "DB_PATH", Path(path))
    database.init_db()
    with TestClient(app) as test_client:
        yield test_client
    os.unlink(path)

def lead(email="jane@example.com"):
    return {"name":"Jane Smith","email":email,"company":"Acme","message":"Let's talk"}

def test_valid_lead_creation(client):
    response=client.post('/api/leads',json=lead())
    assert response.status_code==200
    assert response.json()['email']=='jane@example.com'
    assert response.json()['status']=='New'

def test_invalid_email(client):
    assert client.post('/api/leads',json=lead('bad-email')).status_code==422

def test_missing_field(client):
    payload=lead(); payload.pop('company')
    assert client.post('/api/leads',json=payload).status_code==422

def test_duplicate_email(client):
    client.post('/api/leads',json=lead())
    assert client.post('/api/leads',json=lead()).status_code==409

def test_case_insensitive_duplicate_detection(client):
    client.post('/api/leads',json=lead('John@gmail.com'))
    response=client.post('/api/leads',json=lead(' JOHN@GMAIL.COM '))
    assert response.status_code==409

def test_csv_import(client):
    content=b'name,email,company,message\nJane,jane@example.com,Acme,Hello\nBob,bob@example.com,Other,Hi\nBad,nope,Co,Oops\n'
    response=client.post('/api/leads/import',files={'file':('leads.csv',content,'text/csv')})
    assert response.status_code==200
    assert response.json()['total_rows']==3
    assert response.json()['successfully_imported']==2
    assert response.json()['invalid_rows']==1

def test_statistics_endpoint(client):
    client.post('/api/leads',json=lead())
    stats=client.get('/api/stats').json()
    assert stats['total_leads']==1 and stats['new_leads']==1 and stats['website_leads']==1
