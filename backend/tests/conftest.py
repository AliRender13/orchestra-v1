"""Shared fixtures: isolated in-memory SQLite per test."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.main as main_module
from app import models  # noqa: F401 — register models
from app.db import Base


@pytest.fixture
def db_engine():
    # StaticPool: one shared connection, so the TestClient thread sees the tables.
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    return engine


@pytest.fixture
def db(db_engine):
    factory = sessionmaker(bind=db_engine, autoflush=False, expire_on_commit=False)
    session = factory()
    yield session
    session.close()


@pytest.fixture
def client(db, monkeypatch):
    # never touch the real database engine during API tests
    monkeypatch.setattr(main_module, "init_db", lambda: None)

    def _get_db():
        yield db

    main_module.app.dependency_overrides[main_module.get_db] = _get_db
    yield TestClient(main_module.app, raise_server_exceptions=False)
    main_module.app.dependency_overrides.clear()
