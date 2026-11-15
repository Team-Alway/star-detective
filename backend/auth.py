"""Auth + saved progress (argon2, JWT cookie).

Storage: PostgreSQL when DATABASE_URL is set (Render), otherwise a local SQLite file.
"""
import os, sqlite3, time
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import APIRouter, Cookie, HTTPException, Response, Depends
from pydantic import BaseModel, Field, field_validator

DB_PATH = os.environ.get("SD_DB_PATH", os.path.join(os.path.dirname(__file__), "data", "app.db"))
JWT_SECRET = os.environ.get("SD_JWT_SECRET", "dev-only-secret-change-me-0123456789abcdef")
COOKIE = "sd_session"
MAX_AGE = 7 * 24 * 3600
ph = PasswordHasher()
router = APIRouter(prefix="/api", tags=["Auth & Progress"])


DATABASE_URL = os.environ.get("DATABASE_URL", "")
IS_PG = DATABASE_URL.startswith(("postgres://", "postgresql://"))
COOKIE_SECURE = os.environ.get("SD_COOKIE_SECURE") == "1"
# "lax" when the site and API share a domain (local dev, or the Vercel /api proxy); "none" for direct cross-site calls.
COOKIE_SAMESITE = os.environ.get("SD_COOKIE_SAMESITE", "lax").lower()

if IS_PG:
    import psycopg
    from psycopg.rows import dict_row

    IntegrityError = psycopg.errors.UniqueViolation
    _SCHEMA = [
        """CREATE TABLE IF NOT EXISTS users(id BIGSERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL, display_name TEXT NOT NULL, created_at TEXT NOT NULL)""",
        """CREATE TABLE IF NOT EXISTS progress(user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          xp INTEGER NOT NULL DEFAULT 0, stage INTEGER NOT NULL DEFAULT 1, results TEXT NOT NULL DEFAULT '{}',
          updated_at TEXT NOT NULL)""",
    ]
else:
    IntegrityError = sqlite3.IntegrityError
    _SCHEMA = [
        """CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL, display_name TEXT NOT NULL, created_at TEXT NOT NULL)""",
        """CREATE TABLE IF NOT EXISTS progress(user_id INTEGER PRIMARY KEY, xp INTEGER NOT NULL DEFAULT 0,
          stage INTEGER NOT NULL DEFAULT 1, results TEXT NOT NULL DEFAULT '{}', updated_at TEXT NOT NULL)""",
    ]


class _Conn:
    """Same tiny API for SQLite and Postgres: execute() with '?' placeholders, commit(), close()."""

    def __init__(self):
        if IS_PG:
            self._c = psycopg.connect(DATABASE_URL, row_factory=dict_row)
        else:
            os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
            self._c = sqlite3.connect(DB_PATH)
            self._c.row_factory = sqlite3.Row

    def execute(self, sql, params=()):
        if IS_PG:
            sql = sql.replace("?", "%s")
        return self._c.execute(sql, params)

    def commit(self):
        self._c.commit()

    def rollback(self):
        self._c.rollback()

    def close(self):
        self._c.close()


_schema_ready = False


def db() -> _Conn:
    global _schema_ready
    c = _Conn()
    if not _schema_ready:
        for stmt in _SCHEMA:
            c.execute(stmt)
        c.commit()
        _schema_ready = True
    return c


class SignupRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=254)
    password: str = Field(..., min_length=8, max_length=256)
    display_name: str = Field(..., min_length=1, max_length=60)

    @field_validator("email")
    @classmethod
    def _e(cls, v):
        v = v.strip().lower()
        if "@" not in v or v.startswith("@") or v.endswith("@"):
            raise ValueError("invalid email")
        return v


class LoginRequest(BaseModel):
    email: str
    password: str


class User(BaseModel):
    id: int
    email: str
    display_name: str


class Progress(BaseModel):
    xp: int = 0
    stage: int = 1
    results: Dict[str, bool] = {}
    updated_at: Optional[str] = None


class LeaderboardEntry(BaseModel):
    display_name: str
    xp: int


def _set_cookie(resp: Response, uid: int):
    tok = jwt.encode({"sub": str(uid), "exp": int(time.time()) + MAX_AGE}, JWT_SECRET, algorithm="HS256")
    resp.set_cookie(COOKIE, tok, max_age=MAX_AGE, httponly=True, samesite=COOKIE_SAMESITE,
                    secure=COOKIE_SECURE or COOKIE_SAMESITE == "none", path="/")


def current_user(sd_session: Optional[str] = Cookie(default=None)) -> User:
    if not sd_session:
        raise HTTPException(401, "Not authenticated")
    try:
        uid = int(jwt.decode(sd_session, JWT_SECRET, algorithms=["HS256"])["sub"])
    except Exception:
        raise HTTPException(401, "Invalid session")
    c = db()
    try:
        r = c.execute("SELECT id,email,display_name FROM users WHERE id=?", (uid,)).fetchone()
    finally:
        c.close()
    if not r:
        raise HTTPException(401, "Invalid session")
    return User(**dict(r))


def _now():
    return datetime.now(timezone.utc).isoformat()


@router.post("/auth/signup", response_model=User, status_code=201, summary="Create account")
def signup(body: SignupRequest, response: Response):
    c = db()
    try:
        try:
            row = c.execute("INSERT INTO users(email,password_hash,display_name,created_at) VALUES(?,?,?,?) RETURNING id",
                            (body.email, ph.hash(body.password), body.display_name.strip(), _now())).fetchone()
        except IntegrityError:
            c.rollback()
            raise HTTPException(409, "Email already registered")
        uid = row["id"]
        c.commit()
    finally:
        c.close()
    _set_cookie(response, uid)
    return User(id=uid, email=body.email, display_name=body.display_name.strip())


@router.post("/auth/login", response_model=User, summary="Log in")
def login(body: LoginRequest, response: Response):
    c = db()
    try:
        r = c.execute("SELECT * FROM users WHERE email=?", (body.email.strip().lower(),)).fetchone()
    finally:
        c.close()
    try:
        if not r:
            raise VerifyMismatchError()
        ph.verify(r["password_hash"], body.password)
    except Exception:
        raise HTTPException(401, "Invalid email or password")
    _set_cookie(response, r["id"])
    return User(id=r["id"], email=r["email"], display_name=r["display_name"])


@router.post("/auth/logout", status_code=204, summary="Log out")
def logout():
    resp = Response(status_code=204)
    resp.delete_cookie(COOKIE, path="/", httponly=True, samesite=COOKIE_SAMESITE,
                       secure=COOKIE_SECURE or COOKIE_SAMESITE == "none")
    return resp


@router.get("/auth/me", response_model=User, summary="Current user")
def me(user: User = Depends(current_user)):
    return user


def _read(c, uid) -> Progress:
    import json
    r = c.execute("SELECT * FROM progress WHERE user_id=?", (uid,)).fetchone()
    if not r:
        return Progress(xp=0, stage=1, results={}, updated_at=None)
    return Progress(xp=r["xp"], stage=r["stage"], results=json.loads(r["results"]), updated_at=r["updated_at"])


@router.get("/progress", response_model=Progress, summary="Get saved progress")
def get_progress(user: User = Depends(current_user)):
    c = db()
    try:
        return _read(c, user.id)
    finally:
        c.close()


@router.put("/progress", response_model=Progress, summary="Save progress")
def put_progress(body: Progress, user: User = Depends(current_user)):
    import json
    c = db()
    try:
        old = _read(c, user.id)
        xp = max(0, body.xp)
        stage = min(5, max(1, body.stage, old.stage))
        results = {**old.results, **body.results}
        c.execute("""INSERT INTO progress(user_id,xp,stage,results,updated_at) VALUES(?,?,?,?,?)
          ON CONFLICT(user_id) DO UPDATE SET xp=excluded.xp,stage=excluded.stage,results=excluded.results,updated_at=excluded.updated_at""",
                  (user.id, xp, stage, json.dumps(results), _now()))
        c.commit()
        return _read(c, user.id)
    finally:
        c.close()


@router.get("/leaderboard", response_model=List[LeaderboardEntry], summary="Top 20 by XP")
def leaderboard():
    c = db()
    try:
        rows = c.execute("""SELECT u.display_name, p.xp FROM progress p JOIN users u ON u.id=p.user_id
                            ORDER BY p.xp DESC, p.updated_at ASC LIMIT 20""").fetchall()
        return [LeaderboardEntry(display_name=r["display_name"], xp=r["xp"]) for r in rows]
    finally:
        c.close()
