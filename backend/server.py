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
from datetime import datetime, timezone
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

class PlaceModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str
    logo: Optional[Dict[str, Any]] = None
    promoCode: Optional[str] = None
    promoUrl: Optional[str] = None
    comment: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class UsageSet(BaseModel):
    numberId: str
    placeId: str
    used: bool

class SearchResult(BaseModel):
    numbers: List[Dict[str, Any]]
    places: List[Dict[str, Any]]

# ---------------------
# Phone utils
# ---------------------
DIGIT_RE = re.compile(r"\D+")
PHONE_ONLY_RE = re.compile(r"^[0-9+\-()\s]+$")

def extract_ru_digits(raw: str) -> str:
    if not raw:
        return ""
    digits = re.sub(DIGIT_RE, "", raw)
    if not digits:
        return ""
    if digits[0] == '8':
        digits = '7' + digits[1:]
    if digits[0] != '7':
        if len(digits) >= 10:
            digits = '7' + digits[-10:]
        else:
            digits = '7' + digits
    return digits[:11]

def format_ru_phone_strict(raw: str) -> str:
    digits = extract_ru_digits(raw)
    if len(digits) != 11 or digits[0] != '7':
        raise ValueError("Invalid RU phone")
    c, a, b, c2, d2 = digits[0], digits[1:4], digits[4:7], digits[7:9], digits[9:11]
    return f"+{c} {a} {b} {c2} {d2}"

def format_ru_phone_partial(raw: str) -> str:
    digits = extract_ru_digits(raw)
    if not digits:
        return ""
    out = "+7"
    rest = digits[1:]
    if len(rest) > 0:
        out += " " + rest[:3]
    if len(rest) > 3:
        out += " " + rest[3:6]
    if len(rest) > 6:
        out += " " + rest[6:8]
    if len(rest) > 8:
        out += " " + rest[8:10]
    return out

async def find_number_by_digits(digits: str) -> Optional[Dict[str, Any]]:
    doc = await db.numbers.find_one({"phoneDigits": digits})
    if doc:
        return doc
    items = await db.numbers.find({}).to_list(2000)
    for it in items:
        p = it.get("phone", "")
        if extract_ru_digits(p) == digits:
            return it
    return None

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
        q = q.strip()
        if PHONE_ONLY_RE.match(q):
            d = extract_ru_digits(q)
            if d:
                query = {"phoneDigits": {"$regex": f"^{re.escape(d)}"}}
        else:
            query = {"phone": {"$regex": re.escape(q), "$options": "i"}}
    items = await db.numbers.find(query).sort("createdAt", -1).to_list(1000)
    return [NumberModel(**i) for i in items]

@api_router.post("/numbers", response_model=NumberModel)
async def create_number(payload: NumberCreate):
    try:
        formatted = format_ru_phone_strict(payload.phone)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid phone format. Expect +7 777 777 77 77")
    digits = extract_ru_digits(formatted)
    existing = await find_number_by_digits(digits)
    if existing:
        raise HTTPException(status_code=409, detail="Phone already exists")
    number = NumberModel(phone=formatted, operatorKey=payload.operatorKey)
    doc = number.model_dump()
    doc["phoneDigits"] = digits
    await db.numbers.insert_one(doc)
    return number

@api_router.get("/numbers/{number_id}", response_model=NumberModel)
async def get_number(number_id: str):
    doc = await db.numbers.find_one({"id": number_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Number not found")
    return NumberModel(**doc)

@api_router.put("/numbers/{number_id}", response_model=NumberModel)
async def update_number(number_id: str, payload: NumberCreate):
    cur = await db.numbers.find_one({"id": number_id})
    if not cur:
        raise HTTPException(status_code=404, detail="Number not found")
    try:
        formatted = format_ru_phone_strict(payload.phone)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid phone format. Expect +7 777 777 77 77")
    digits = extract_ru_digits(formatted)
    existing = await find_number_by_digits(digits)
    if existing and existing.get("id") != number_id:
        raise HTTPException(status_code=409, detail="Phone already exists")
    update_doc = {"$set": {"phone": formatted, "phoneDigits": digits, "operatorKey": payload.operatorKey}}
    await db.numbers.update_one({"id": number_id}, update_doc)
    updated = await db.numbers.find_one({"id": number_id})
    return NumberModel(**updated)

@api_router.delete("/numbers/{number_id}")
async def delete_number(number_id: str):
    await db.usages.delete_many({"numberId": number_id})
    res = await db.numbers.delete_one({"id": number_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Number not found")
    return {"ok": True}

@api_router.get("/numbers/{number_id}/usage")
async def number_usage(number_id: str):
    doc = await db.numbers.find_one({"id": number_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Number not found")
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
    # Compute last event time = latest usage.updatedAt (if any)
    last_event_dt = None
    for u in usage_list:
        dt = u.get("updatedAt")
        if dt and (last_event_dt is None or dt > last_event_dt):
            last_event_dt = dt
    last_event = last_event_dt.isoformat() if last_event_dt else None
    return {"used": used, "unused": unused, "lastEventAt": last_event}

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
    comment: Optional[str] = Form(None),
    logo: Optional[UploadFile] = File(None)
):
    name = name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name required")
    exist = await db.places.find_one({"name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}})
    if exist:
        raise HTTPException(status_code=409, detail="Place already exists")
    doc = PlaceModel(
        name=name, 
        category=category, 
        promoCode=(promoCode or None), 
        promoUrl=(promoUrl or None),
        comment=(comment or None)
    ).model_dump()
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
    comment: Optional[str] = Form(None),
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
    if comment is not None:
        update["comment"] = comment or None
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

@api_router.delete("/places/{place_id}")
async def delete_place(place_id: str):
    # Check if place exists
    place = await db.places.find_one({"id": place_id})
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    
    # Delete the place
    await db.places.delete_one({"id": place_id})
    
    # Also delete all usage records for this place
    await db.usages.delete_many({"placeId": place_id})
    
    return {"ok": True, "message": "Place deleted successfully"}

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

# ---------------------
# Usage toggle
# ---------------------
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

# ---------------------
# Search
# ---------------------
@api_router.get("/search", response_model=SearchResult)
async def search(q: str):
    q = q.strip()
    is_phone_like = bool(PHONE_ONLY_RE.match(q))
    numbers: List[Dict[str, Any]] = []
    places: List[Dict[str, Any]] = []
    if is_phone_like:
        d = extract_ru_digits(q)
        if d:
            numbers = await db.numbers.find({"phoneDigits": {"$regex": f"^{re.escape(d)}"}}).limit(10).to_list(10)
        if not numbers:
            all_nums = await db.numbers.find({}).limit(1000).to_list(1000)
            for n in all_nums:
                if extract_ru_digits(n.get("phone", "")).startswith(d):
                    numbers.append(n)
                    if len(numbers) >= 10:
                        break
    else:
        places = await db.places.find({"name": {"$regex": re.escape(q), "$options": "i"}}).limit(10).to_list(10)
    def strip_place(p: Dict[str, Any]):
        p2 = dict(p)
        p2.pop("_id", None)
        p2["hasLogo"] = bool(p.get("logo"))
        p2["hasPromo"] = bool(p.get("promoCode") or p.get("promoUrl"))
        p2.pop("logo", None)
        return p2
    clean_numbers = []
    for n in numbers:
        nn = dict(n)
        nn.pop("_id", None)
        clean_numbers.append(nn)
    return {"numbers": [NumberModel(**n).model_dump() for n in clean_numbers], "places": [strip_place(p) for p in places]}

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