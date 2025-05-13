from enum import Enum
from pydantic import BaseModel
from langchain_core.outputs import LLMResult
from langchain_core.output_parsers import BaseOutputParser

class EmotionCategory(str, Enum):
    neutral = "neutral"
    happy = "happy"
    sad = "sad"
    angry = "angry"
    fear = "fear"
    surprise = "surprise"
    disgust = "disgust"

class EmotionTaggedOutput(BaseModel):
    text: str
    emotion: EmotionCategory

class EmotionOutputParser(BaseOutputParser):
    def parse(self, text: str) -> EmotionTaggedOutput:
        # 아주 단순한 감정 분류 규칙 (MVP용)
        lower = text.lower()
        if any(word in lower for word in ["기뻐", "행복", "좋아", "웃어"]):
            emotion = EmotionCategory.happy
        elif any(word in lower for word in ["슬퍼", "우울", "눈물"]):
            emotion = EmotionCategory.sad
        elif any(word in lower for word in ["화나", "짜증", "열받", "분노"]):
            emotion = EmotionCategory.angry
        elif any(word in lower for word in ["무서워", "불안", "겁나"]):
            emotion = EmotionCategory.fear
        elif any(word in lower for word in ["헉", "놀랐", "깜짝"]):
            emotion = EmotionCategory.surprise
        elif any(word in lower for word in ["역겨", "징그러", "불쾌"]):
            emotion = EmotionCategory.disgust
        else:
            emotion = EmotionCategory.neutral

        return EmotionTaggedOutput(text=text, emotion=emotion)

    @property
    def _type(self) -> str:
        return "emotion_tagged_output"
