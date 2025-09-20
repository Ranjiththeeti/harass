from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Initialize LLM Chat
emergent_llm_key = os.environ.get('EMERGENT_LLM_KEY')

# Harassment detection categories
HARASSMENT_CATEGORIES = {
    "hate_speech": "Hate Speech",
    "bullying": "Bullying",
    "sexual_harassment": "Sexual Harassment", 
    "threats": "Threats/Violence",
    "discrimination": "Discrimination",
    "toxic": "Toxic Language"
}

# Define Models
class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_flagged: bool = False
    safety_score: Optional[float] = None
    harassment_type: Optional[str] = None
    flagged_reason: Optional[str] = None

class ChatMessageCreate(BaseModel):
    content: str

class AnalyticsResponse(BaseModel):
    total_messages: int
    flagged_messages: int
    safety_percentage: float
    harassment_breakdown: dict
    recent_flagged_messages: List[ChatMessage]

async def analyze_message_harassment(content: str) -> dict:
    """Analyze message for harassment using OpenAI GPT-4o"""
    try:
        logging.info(f"Analyzing message: '{content}'")
        
        # Initialize chat with system prompt for harassment detection
        chat = LlmChat(
            api_key=emergent_llm_key,
            session_id=f"harassment-detection-{uuid.uuid4()}",
            system_message="""You are a highly sensitive AI harassment detection system designed to protect users from harmful content. You must be strict and vigilant in detecting harassment, bullying, or toxic behavior while avoiding false positives on clearly positive or neutral messages.

DETECT AND FLAG these categories:
1. HATE SPEECH: Any discriminatory language based on race, gender, religion, sexuality, etc.
2. BULLYING: Name-calling, insults, put-downs, intimidation (like "idiot", "stupid", "loser", "annoying")  
3. SEXUAL HARASSMENT: Unwanted sexual comments, objectification, inappropriate advances
4. THREATS: Any mention of violence, harm, or dangerous actions
5. DISCRIMINATION: Prejudice based on personal characteristics  
6. TOXIC LANGUAGE: Rude, offensive, or deliberately hurtful language

IMPORTANT GUIDELINES:
- Mild insults like "stupid", "idiot", "annoying", "shut up" should be flagged as bullying
- Be conservative - when in doubt about genuinely harmful content, FLAG IT for safety
- DO NOT flag clearly positive messages like "thank you", "have a great day", greetings, or neutral statements
- Context matters - distinguish between constructive communication and harassment
- Polite expressions of gratitude, pleasantries, and normal conversation should NEVER be flagged

Always respond ONLY in this exact JSON format (no code blocks or extra formatting):
{
    "is_flagged": true/false,
    "safety_score": 0.0-1.0,
    "harassment_type": "hate_speech|bullying|sexual_harassment|threats|discrimination|toxic",
    "flagged_reason": "Brief explanation why this was flagged"
}

For safe messages only:
{
    "is_flagged": false,
    "safety_score": 1.0,
    "harassment_type": null,
    "flagged_reason": null
}"""
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(
            text=f"Analyze this message for harassment: '{content}'"
        )
        
        response = await chat.send_message(user_message)
        logging.info(f"AI Response: {response}")
        
        # Parse JSON response
        import json
        import re
        try:
            # Clean the response - remove code blocks if present
            clean_response = response.strip()
            if clean_response.startswith('```json'):
                clean_response = re.sub(r'^```json\s*', '', clean_response)
                clean_response = re.sub(r'\s*```$', '', clean_response)
            elif clean_response.startswith('```'):
                clean_response = re.sub(r'^```\s*', '', clean_response)
                clean_response = re.sub(r'\s*```$', '', clean_response)
            
            result = json.loads(clean_response)
            
            # Additional rule-based fallback for common harassment patterns
            content_lower = content.lower()
            harassment_keywords = ['idiot', 'stupid', 'shut up', 'loser', 'annoying', 'dumb', 'hate you', 'go away']
            
            # If AI missed obvious harassment, override with rule-based detection
            if not result.get('is_flagged', False):
                for keyword in harassment_keywords:
                    if keyword in content_lower:
                        logging.warning(f"AI missed harassment keyword '{keyword}', overriding result")
                        result = {
                            "is_flagged": True,
                            "safety_score": 0.3,
                            "harassment_type": "bullying",
                            "flagged_reason": f"Contains harassment language: '{keyword}'"
                        }
                        break
            
            logging.info(f"Final result: {result}")
            return result
            
        except json.JSONDecodeError as e:
            logging.error(f"JSON parsing error: {e}, Response: {response}")
            # Fallback if JSON parsing fails
            return {
                "is_flagged": False,
                "safety_score": 1.0,
                "harassment_type": None,
                "flagged_reason": None
            }
            
    except Exception as e:
        logging.error(f"Error analyzing message: {e}")
        # Return safe default on error
        return {
            "is_flagged": False,
            "safety_score": 1.0,
            "harassment_type": None,
            "flagged_reason": None
        }

# Helper function to prepare datetime for MongoDB
def prepare_for_mongo(data):
    if isinstance(data.get('timestamp'), datetime):
        data['timestamp'] = data['timestamp'].isoformat()
    return data

def parse_from_mongo(item):
    if isinstance(item.get('timestamp'), str):
        item['timestamp'] = datetime.fromisoformat(item['timestamp'])
    return item

# API Routes
@api_router.get("/")
async def root():
    return {"message": "AI Harassment Detection API"}

@api_router.post("/messages", response_model=ChatMessage)
async def analyze_message(input: ChatMessageCreate):
    """Analyze a message for harassment and store it"""
    try:
        # Analyze the message using AI
        analysis = await analyze_message_harassment(input.content)
        
        # Create message object
        message = ChatMessage(
            content=input.content,
            is_flagged=analysis.get("is_flagged", False),
            safety_score=analysis.get("safety_score", 1.0),
            harassment_type=analysis.get("harassment_type"),
            flagged_reason=analysis.get("flagged_reason")
        )
        
        # Store in database
        message_dict = prepare_for_mongo(message.dict())
        await db.messages.insert_one(message_dict)
        
        return message
        
    except Exception as e:
        logging.error(f"Error processing message: {e}")
        raise HTTPException(status_code=500, detail="Error processing message")

@api_router.get("/messages", response_model=List[ChatMessage])
async def get_messages():
    """Get all messages"""
    try:
        messages = await db.messages.find().sort("timestamp", -1).to_list(100)
        return [ChatMessage(**parse_from_mongo(msg)) for msg in messages]
    except Exception as e:
        logging.error(f"Error fetching messages: {e}")
        raise HTTPException(status_code=500, detail="Error fetching messages")

@api_router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics():
    """Get harassment detection analytics"""
    try:
        # Get total message count
        total_messages = await db.messages.count_documents({})
        
        # Get flagged message count
        flagged_messages = await db.messages.count_documents({"is_flagged": True})
        
        # Calculate safety percentage
        safety_percentage = ((total_messages - flagged_messages) / max(total_messages, 1)) * 100
        
        # Get harassment breakdown
        harassment_breakdown = {}
        for category_key, category_name in HARASSMENT_CATEGORIES.items():
            count = await db.messages.count_documents({"harassment_type": category_key})
            harassment_breakdown[category_name] = count
        
        # Get recent flagged messages
        recent_flagged = await db.messages.find({"is_flagged": True}).sort("timestamp", -1).limit(10).to_list(10)
        recent_flagged_messages = [ChatMessage(**parse_from_mongo(msg)) for msg in recent_flagged]
        
        return AnalyticsResponse(
            total_messages=total_messages,
            flagged_messages=flagged_messages,
            safety_percentage=round(safety_percentage, 1),
            harassment_breakdown=harassment_breakdown,
            recent_flagged_messages=recent_flagged_messages
        )
        
    except Exception as e:
        logging.error(f"Error generating analytics: {e}")
        raise HTTPException(status_code=500, detail="Error generating analytics")

@api_router.delete("/messages")
async def clear_messages():
    """Clear all messages (for demo purposes)"""
    try:
        result = await db.messages.delete_many({})
        return {"message": f"Cleared {result.deleted_count} messages"}
    except Exception as e:
        logging.error(f"Error clearing messages: {e}")
        raise HTTPException(status_code=500, detail="Error clearing messages")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()