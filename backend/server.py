from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, Response
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import base64
import re


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection - MUST use existing envs
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ---------------------
# Models
# ---------------------
class NumberCreate(BaseModel):
    phone: str
    operatorKey: str

class NumberModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    phone: str
    operatorKey: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class PlaceCreate(BaseModel):
    name: str
    category: str

class PlaceModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str
    # We store logo inline as base64+contentType, but do not return it by default from list APIs
    logo: Optional[Dict[str, Any]] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class UsageSet(BaseModel):
    numberId: str
    placeId: str
    used: bool

class SearchResult(BaseModel):
    numbers: List[Dict[str, Any]]
    places: List[Dict[str, Any]]

# ---------------------
# Utils
# ---------------------
PHONE_RE = re.compile(r"^\+?[0-9\s\-()]{5,20}$")

async def get_number_or_404(number_id: str) -> Dict[str, Any]:
    doc = await db.numbers.find_one({"id": number_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Number not found")
    return doc

async def get_place_or_404(place_id: str) -> Dict[str, Any]:
    doc = await db.places.find_one({"id": place_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Place not found")
    return doc


def sanitize_number_phone(phone: str) -> str:
    return phone.strip()

# ---------------------
# Root
# ---------------------
@api_router.get("/")
async def root():
    return {"message": "FIRST API ready"}

# ---------------------
# Numbers
# ---------------------
@api_router.get("/numbers", response_model=List[NumberModel])
async def list_numbers(q: Optional[str] = None):
    query: Dict[str, Any] = {}
    if q:
        query = {"phone": {"$regex": re.escape(q), "$options": "i"}}
    items = await db.numbers.find(query).sort("createdAt", -1).to_list(1000)
    # Remove MongoDB _id field from each item
    clean_items = []
    for item in items:
        clean_item = dict(item)
        clean_item.pop("_id", None)
        clean_items.append(clean_item)
    return [NumberModel(**i) for i in clean_items]

@api_router.post("/numbers", response_model=NumberModel)
async def create_number(payload: NumberCreate):
    phone = sanitize_number_phone(payload.phone)
    if not PHONE_RE.match(phone):
        raise HTTPException(status_code=400, detail="Invalid phone format")
    # prevent duplicates by phone
    existing = await db.numbers.find_one({"phone": phone})
    if existing:
        raise HTTPException(status_code=409, detail="Phone already exists")
    number = NumberModel(phone=phone, operatorKey=payload.operatorKey)
    await db.numbers.insert_one(number.model_dump())
    return number

@api_router.get("/numbers/{number_id}", response_model=NumberModel)
async def get_number(number_id: str):
    doc = await get_number_or_404(number_id)
    clean_doc = dict(doc)
    clean_doc.pop("_id", None)
    return NumberModel(**clean_doc)

@api_router.put("/numbers/{number_id}", response_model=NumberModel)
async def update_number(number_id: str, payload: NumberCreate):
    phone = sanitize_number_phone(payload.phone)
    if not PHONE_RE.match(phone):
        raise HTTPException(status_code=400, detail="Invalid phone format")
    # ensure no duplicate phone on another id
    dup = await db.numbers.find_one({"phone": phone, "id": {"$ne": number_id}})
    if dup:
        raise HTTPException(status_code=409, detail="Phone already exists")
    update_doc = {"$set": {"phone": phone, "operatorKey": payload.operatorKey}}
    res = await db.numbers.update_one({"id": number_id}, update_doc)
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Number not found")
    updated = await db.numbers.find_one({"id": number_id})
    return NumberModel(**updated)

@api_router.delete("/numbers/{number_id}")
async def delete_number(number_id: str):
    # delete usages too
    await db.usages.delete_many({"numberId": number_id})
    res = await db.numbers.delete_one({"id": number_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Number not found")
    return {"ok": True}

@api_router.get("/numbers/{number_id}/usage")
async def number_usage(number_id: str):
    await get_number_or_404(number_id)
    places = await db.places.find({}).to_list(5000)
    usage_list = await db.usages.find({"numberId": number_id}).to_list(5000)
    used_place_ids = {u["placeId"] for u in usage_list if u.get("used")}
    unused_place_ids = set(p["id"] for p in places) - used_place_ids
    used = [
        {k: v for k, v in p.items() if k not in ["logo", "_id"]}
        for p in places if p["id"] in used_place_ids
    ]
    unused = [
        {k: v for k, v in p.items() if k not in ["logo", "_id"]}
        for p in places if p["id"] in unused_place_ids
    ]
    return {"used": used, "unused": unused}

# ---------------------
# Places
# ---------------------
@api_router.get("/places")
async def list_places(q: Optional[str] = None, category: Optional[str] = None, sort: Optional[str] = None):
    query: Dict[str, Any] = {}
    if q:
        query["name"] = {"$regex": re.escape(q), "$options": "i"}
    if category:
        query["category"] = category
    cursor = db.places.find(query)
    if sort == "old" or sort == "asc":
        cursor = cursor.sort("createdAt", 1)
    else:
        cursor = cursor.sort("createdAt", -1)
    items = await cursor.to_list(5000)
    # strip logo binary to reduce payload and remove MongoDB _id
    def strip_logo(p: Dict[str, Any]):
        p2 = dict(p)
        p2.pop("_id", None)  # Remove MongoDB ObjectId
        if "logo" in p2:
            p2["hasLogo"] = bool(p2["logo"])
            p2.pop("logo", None)
        else:
            p2["hasLogo"] = False
        return p2
    return [strip_logo(p) for p in items]

@api_router.post("/places")
async def create_place(
    name: str = Form(...),
    category: str = Form(...),
    logo: Optional[UploadFile] = File(None)
):
    name = name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name required")
    exist = await db.places.find_one({"name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}})
    if exist:
        raise HTTPException(status_code=409, detail="Place already exists")
    doc = PlaceModel(name=name, category=category).model_dump()
    if logo is not None:
        content = await logo.read()
        if len(content) > 2 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Logo too large (max 2MB)")
        doc["logo"] = {
            "contentType": logo.content_type or "image/png",
            "data": base64.b64encode(content).decode('utf-8')
        }
    await db.places.insert_one(doc)
    # Create response using PlaceModel to ensure proper serialization
    place_model = PlaceModel(**doc)
    resp = place_model.model_dump()
    resp.pop("logo", None)
    resp["hasLogo"] = "logo" in doc
    return resp

@api_router.get("/places/{place_id}")
async def get_place(place_id: str):
    doc = await get_place_or_404(place_id)
    # strip logo and _id
    resp = dict(doc)
    resp.pop("_id", None)
    resp.pop("logo", None)
    resp["hasLogo"] = "logo" in doc and bool(doc["logo"])
    return resp

@api_router.get("/places/{place_id}/logo")
async def get_place_logo(place_id: str):
    doc = await get_place_or_404(place_id)
    logo = doc.get("logo")
    if not logo:
        raise HTTPException(status_code=404, detail="Logo not set")
    data = base64.b64decode(logo.get("data", ""))
    return Response(content=data, media_type=logo.get("contentType", "image/png"))

@api_router.put("/places/{place_id}")
async def update_place(
    place_id: str,
    name: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    logo: Optional[UploadFile] = File(None),
    removeLogo: Optional[bool] = Form(False)
):
    await get_place_or_404(place_id)
    update: Dict[str, Any] = {}
    if name is not None:
        n = name.strip()
        if not n:
            raise HTTPException(status_code=400, detail="Name required")
        dup = await db.places.find_one({"name": {"$regex": f"^{re.escape(n)}$", "$options": "i"}, "id": {"$ne": place_id}})
        if dup:
            raise HTTPException(status_code=409, detail="Place already exists")
        update["name"] = n
    if category is not None:
        update["category"] = category
    logo_doc = None
    if logo is not None:
        content = await logo.read()
        if len(content) > 2 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Logo too large (max 2MB)")
        logo_doc = {
            "contentType": logo.content_type or "image/png",
            "data": base64.b64encode(content).decode('utf-8')
        }
    set_obj: Dict[str, Any] = {}
    unset_obj: Dict[str, Any] = {}
    if update:
        set_obj.update(update)
    if logo_doc is not None:
        set_obj["logo"] = logo_doc
    if removeLogo:
        unset_obj["logo"] = ""
    update_cmd: Dict[str, Any] = {}
    if set_obj:
        update_cmd["$set"] = set_obj
    if unset_obj:
        update_cmd["$unset"] = unset_obj
    if not update_cmd:
        return JSONResponse({"updated": False})
    res = await db.places.update_one({"id": place_id}, update_cmd)
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Place not found")
    doc = await db.places.find_one({"id": place_id})
    # strip logo
    resp = dict(doc)
    resp.pop("logo", None)
    resp["hasLogo"] = "logo" in doc and bool(doc["logo"])
    return resp

@api_router.delete("/places/{place_id}")
async def delete_place(place_id: str):
    await db.usages.delete_many({"placeId": place_id})
    res = await db.places.delete_one({"id": place_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Place not found")
    return {"ok": True}

@api_router.get("/places/{place_id}/usage")
async def place_usage(place_id: str):
    await get_place_or_404(place_id)
    numbers = await db.numbers.find({}).to_list(5000)
    usage_list = await db.usages.find({"placeId": place_id}).to_list(5000)
    used_number_ids = {u["numberId"] for u in usage_list if u.get("used")}
    unused_number_ids = set(n["id"] for n in numbers) - used_number_ids
    used = [
        {k: v for k, v in n.items() if k != "_id"} for n in numbers if n["id"] in used_number_ids
    ]
    unused = [
        {k: v for k, v in n.items() if k != "_id"} for n in numbers if n["id"] in unused_number_ids
    ]
    return {"used": used, "unused": unused}

# ---------------------
# Usage toggle
# ---------------------
@api_router.post("/usage")
async def set_usage(payload: UsageSet):
    # validate existence
    await get_number_or_404(payload.numberId)
    await get_place_or_404(payload.placeId)
    now = datetime.utcnow()
    await db.usages.update_one(
        {"numberId": payload.numberId, "placeId": payload.placeId},
        {"$set": {"used": payload.used, "updatedAt": now}, "$setOnInsert": {"id": str(uuid.uuid4())}},
        upsert=True,
    )
    return {"ok": True}

# ---------------------
# Search
# ---------------------
@api_router.get("/search", response_model=SearchResult)
async def search(q: str):
    q = q.strip()
    is_digits = bool(re.fullmatch(r"[0-9+\-()\s]+", q))
    numbers: List[Dict[str, Any]] = []
    places: List[Dict[str, Any]] = []
    if is_digits:
        numbers = await db.numbers.find({"phone": {"$regex": re.escape(q), "$options": "i"}}).limit(10).to_list(10)
        # places = []  # optionally none
    else:
        places = await db.places.find({"name": {"$regex": re.escape(q), "$options": "i"}}).limit(10).to_list(10)
    # strip logo and _id from places
    def strip_logo(p: Dict[str, Any]):
        p2 = dict(p)
        p2.pop("_id", None)
        p2.pop("logo", None)
        p2["hasLogo"] = "logo" in p and bool(p.get("logo"))
        return p2
    # Clean numbers by removing _id
    clean_numbers = []
    for n in numbers:
        clean_n = dict(n)
        clean_n.pop("_id", None)
        clean_numbers.append(clean_n)
    return {
        "numbers": [NumberModel(**n).model_dump() for n in clean_numbers],
        "places": [strip_logo(p) for p in places]
    }

# Include the router in the main app
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()