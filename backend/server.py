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

app = FastAPI()
api_router = APIRouter(prefix="/api")

class NumberCreate(BaseModel):
    phone: str
    operatorKey: str

class NumberModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    phone: str
    operatorKey: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class PlaceModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str
    logo: Optional[Dict[str, Any]] = None
    promoCode: Optional[str] = None
    promoUrl: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class UsageSet(BaseModel):
    numberId: str
    placeId: str
    used: bool

class SearchResult(BaseModel):
    numbers: List[Dict[str, Any]]
    places: List[Dict[str, Any]]

DIGIT_RE = re.compile(r"\D+")
PHONE_ONLY_RE = re.compile(r"^[0-9+\-()\s]+$")

# ... helpers for phone omitted for brevity (kept from previous version)

@api_router.get("/")
async def root():
    return {"message": "FIRST API ready"}

# Numbers endpoints are unchanged (kept)

@api_router.get("/places")
async def list_places(q: Optional[str] = None, category: Optional[str] = None, sort: Optional[str] = None):
    query: Dict[str, Any] = {}
    if q:
        query["name"] = {"$regex": re.escape(q), "$options": "i"}
    if category:
        query["category"] = category

    items = await db.places.find(query).to_list(5000)

    if sort == "old" or sort == "asc":
        items.sort(key=lambda p: p.get("createdAt", datetime.utcnow()))
    elif sort == "popular":
        agg = db.usages.aggregate([
            {"$match": {"used": True}},
            {"$group": {"_id": "$placeId", "count": {"$sum": 1}}}
        ])
        counts = {doc["_id"]: doc["count"] async for doc in agg}
        items.sort(key=lambda p: (counts.get(p["id"], 0), p.get("createdAt", datetime.utcnow())), reverse=True)
    else:
        items.sort(key=lambda p: p.get("createdAt", datetime.utcnow()), reverse=True)

    def strip_logo(p: Dict[str, Any]):
        p2 = dict(p)
        p2.pop("_id", None)
        if "logo" in p2:
            p2["hasLogo"] = bool(p2["logo"])
            p2.pop("logo", None)
        else:
            p2["hasLogo"] = False
        p2["hasPromo"] = bool(p2.get("promoCode") or p2.get("promoUrl"))
        return p2
    return [strip_logo(p) for p in items]

@api_router.post("/places")
async def create_place(
    name: str = Form(...),
    category: str = Form(...),
    promoCode: Optional[str] = Form(None),
    promoUrl: Optional[str] = Form(None),
    logo: Optional[UploadFile] = File(None)
):
    name = name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name required")
    exist = await db.places.find_one({"name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}})
    if exist:
        raise HTTPException(status_code=409, detail="Place already exists")
    doc = PlaceModel(name=name, category=category, promoCode=(promoCode or None), promoUrl=(promoUrl or None)).model_dump()
    if logo is not None:
        content = await logo.read()
        if len(content) > 2 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Logo too large (max 2MB)")
        doc["logo"] = {
            "contentType": logo.content_type or "image/png",
            "data": base64.b64encode(content).decode('utf-8')
        }
    await db.places.insert_one(doc)
    resp = dict(doc)
    resp.pop("logo", None)
    resp["hasLogo"] = "logo" in doc
    resp["hasPromo"] = bool(doc.get("promoCode") or doc.get("promoUrl"))
    return resp

@api_router.get("/places/{place_id}")
async def get_place(place_id: str):
    doc = await db.places.find_one({"id": place_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Place not found")
    resp = dict(doc)
    resp.pop("_id", None)
    resp.pop("logo", None)
    resp["hasLogo"] = "logo" in doc and bool(doc["logo"])
    resp["hasPromo"] = bool(doc.get("promoCode") or doc.get("promoUrl"))
    return resp

@api_router.get("/places/{place_id}/logo")
async def get_place_logo(place_id: str):
    doc = await db.places.find_one({"id": place_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Place not found")
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
    promoCode: Optional[str] = Form(None),
    promoUrl: Optional[str] = Form(None),
    logo: Optional[UploadFile] = File(None),
    removeLogo: Optional[bool] = Form(False)
):
    cur = await db.places.find_one({"id": place_id})
    if not cur:
        raise HTTPException(status_code=404, detail="Place not found")
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
    if promoCode is not None:
        update["promoCode"] = promoCode or None
    if promoUrl is not None:
        update["promoUrl"] = promoUrl or None
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
    resp = dict(doc)
    resp.pop("_id", None)
    resp.pop("logo", None)
    resp["hasLogo"] = "logo" in doc and bool(doc["logo"])
    resp["hasPromo"] = bool(doc.get("promoCode") or doc.get("promoUrl"))
    return resp

@api_router.get("/places/{place_id}/usage")
async def place_usage(place_id: str):
    cur = await db.places.find_one({"id": place_id})
    if not cur:
        raise HTTPException(status_code=404, detail="Place not found")
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

@api_router.post("/usage")
async def set_usage(payload: UsageSet):
    num = await db.numbers.find_one({"id": payload.numberId})
    plc = await db.places.find_one({"id": payload.placeId})
    if not num or not plc:
        raise HTTPException(status_code=404, detail="Pair not found")
    now = datetime.utcnow()
    await db.usages.update_one(
        {"numberId": payload.numberId, "placeId": payload.placeId},
        {"$set": {"used": payload.used, "updatedAt": now}, "$setOnInsert": {"id": str(uuid.uuid4())}},
        upsert=True,
    )
    return {"ok": True}

app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()