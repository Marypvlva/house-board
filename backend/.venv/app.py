from fastapi import FastAPI, Depends, HTTPException, status, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import (
    OAuth2PasswordBearer,
    OAuth2PasswordRequestForm,
    HTTPBearer,
    HTTPAuthorizationCredentials,
)
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, ForeignKey, func
from sqlalchemy.orm import sessionmaker, declarative_base, relationship, Session

# --- Конфиг ---
SECRET_KEY = "change-me-please"  # замените в проде
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

DATABASE_URL = "sqlite:///./app.db"

# --- БД ---
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()

class House(Base):
    __tablename__ = "houses"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    users = relationship("User", back_populates="house")
    announcements = relationship("Announcement", back_populates="house")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="admin")
    house_id = Column(Integer, ForeignKey("houses.id"), nullable=False)
    house = relationship("House", back_populates="users")
    announcements = relationship("Announcement", back_populates="author")

class Announcement(Base):
    __tablename__ = "announcements"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    pinned = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    house_id = Column(Integer, ForeignKey("houses.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    house = relationship("House", back_populates="announcements")
    author = relationship("User", back_populates="announcements")

# --- Модели API ---
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserOut(BaseModel):
    id: int
    email: str
    role: str
    house_slug: str
    class Config:
        orm_mode = True  # pydantic v1/v2

class HouseOut(BaseModel):
    name: str
    slug: str
    class Config:
        orm_mode = True

class AnnouncementIn(BaseModel):
    title: str
    content: str
    pinned: Optional[bool] = False

class AnnouncementOut(BaseModel):
    id: int
    title: str
    content: str
    pinned: bool
    created_at: datetime
    author_email: str
    class Config:
        orm_mode = True

# --- Безопасность ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
bearer_scheme = HTTPBearer(auto_error=False)  # для опционального юзера

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

def hash_password(plain):
    return pwd_context.hash(plain)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не авторизован",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = get_user_by_email(db, email)
    if user is None:
        raise credentials_exception
    return user

# опциональный текущий пользователь (если есть валидный токен)
def get_current_user_optional(
    db: Session = Depends(get_db),
    creds: HTTPAuthorizationCredentials = Security(bearer_scheme)
) -> Optional[User]:
    if not creds:
        return None
    try:
        payload = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            return None
    except JWTError:
        return None
    return get_user_by_email(db, email)

# --- App ---
app = FastAPI(title="House Board")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # в проде ограничьте доменами фронта
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    # seed 5 домов и админов
    with SessionLocal() as db:
        for i in range(1, 6):
            slug = f"dom{i}"
            house = db.query(House).filter_by(slug=slug).first()
            if not house:
                house = House(name=f"Дом {i}", slug=slug)
                db.add(house)
                db.commit()
                db.refresh(house)
            email = f"admin{i}@example.com"
            user = db.query(User).filter_by(email=email).first()
            if not user:
                user = User(
                    email=email,
                    password_hash=hash_password("admin12345"),
                    role="admin",
                    house_id=house.id
                )
                db.add(user)
                db.commit()

@app.get("/health")
def health():
    return {"status": "ok"}

# --- Auth ---
@app.post("/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = get_user_by_email(db, form_data.username)
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Неверный email или пароль")
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}

# ДОМо-зависимый логин: можно войти только со своей ссылки
@app.post("/auth/login/{slug}", response_model=Token)
def login_for_house(
    slug: str,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = get_user_by_email(db, form_data.username)
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Неверный email или пароль")
    house = db.query(House).filter_by(id=user.house_id).first()
    if not house or house.slug != slug:
        raise HTTPException(status_code=400, detail="Вы не на ссылке своего дома")
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}

@app.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut(
        id=user.id,
        email=user.email,
        role=user.role,
        house_slug=user.house.slug
    )

# --- Дома и объявления ---
# Анонимам — все дома; залогиненному админу — только его дом.
@app.get("/houses", response_model=List[HouseOut])
def list_houses(
    db: Session = Depends(get_db),
    current: Optional[User] = Depends(get_current_user_optional)
):
    q = db.query(House)
    if current and current.role == "admin":
        q = q.filter(House.id == current.house_id)
    houses = q.all()
    return [HouseOut(name=h.name, slug=h.slug) for h in houses]

# Читать чужой дом, будучи залогиненным админом — запрещаем (403).
@app.get("/houses/{slug}/announcements", response_model=List[AnnouncementOut])
def get_announcements(
    slug: str,
    db: Session = Depends(get_db),
    current: Optional[User] = Depends(get_current_user_optional)
):
    house = db.query(House).filter_by(slug=slug).first()
    if not house:
        raise HTTPException(404, "Дом не найден")

    if current and current.role == "admin" and current.house_id != house.id:
        raise HTTPException(403, "Нет доступа к чужому дому")

    anns = (
        db.query(Announcement)
        .filter(Announcement.house_id == house.id)
        .order_by(Announcement.pinned.desc(), Announcement.created_at.desc())
        .all()
    )
    return [
        AnnouncementOut(
            id=a.id,
            title=a.title,
            content=a.content,
            pinned=a.pinned,
            created_at=a.created_at,
            author_email=a.author.email
        ) for a in anns
    ]

@app.post("/houses/{slug}/announcements", response_model=AnnouncementOut)
def create_announcement(
    slug: str,
    payload: AnnouncementIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    house = db.query(House).filter_by(slug=slug).first()
    if not house:
        raise HTTPException(404, "Дом не найден")
    if user.role != "admin" or user.house_id != house.id:
        raise HTTPException(403, "Нет прав публиковать объявления для этого дома")
    a = Announcement(
        title=payload.title.strip(),
        content=payload.content.strip(),
        pinned=bool(payload.pinned),
        house_id=house.id,
        author_id=user.id
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return AnnouncementOut(
        id=a.id,
        title=a.title,
        content=a.content,
        pinned=a.pinned,
        created_at=a.created_at,
        author_email=user.email
    )

@app.patch("/announcements/{ann_id}", response_model=AnnouncementOut)
def update_announcement(
    ann_id: int,
    payload: AnnouncementIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    a = db.query(Announcement).filter_by(id=ann_id).first()
    if not a:
        raise HTTPException(404, "Объявление не найдено")
    if user.role != "admin" or user.house_id != a.house_id:
        raise HTTPException(403, "Нет прав")
    a.title = payload.title.strip()
    a.content = payload.content.strip()
    a.pinned = bool(payload.pinned)
    db.commit()
    db.refresh(a)
    return AnnouncementOut(
        id=a.id,
        title=a.title,
        content=a.content,
        pinned=a.pinned,
        created_at=a.created_at,
        author_email=a.author.email
    )

@app.delete("/announcements/{ann_id}")
def delete_announcement(
    ann_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    a = db.query(Announcement).filter_by(id=ann_id).first()
    if not a:
        raise HTTPException(404, "Объявление не найдено")
    if user.role != "admin" or user.house_id != a.house_id:
        raise HTTPException(403, "Нет прав")
    db.delete(a)
    db.commit()
    return {"ok": True}
