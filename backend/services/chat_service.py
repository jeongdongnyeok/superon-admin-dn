import re
from backend.models.schemas import AskPayload
from fastapi import HTTPException
from backend.services.chat_graph import run_chat_graph
from backend.config.settings import supabase
from datetime import datetime

def clean_response_text(text: str) -> str:
    """
    Clean the response text by:
    1. Removing all content within square brackets (emotion/action tags)
    2. Removing any leading 'A:' or 'a:' prefix
    3. Cleaning up whitespace
    """
    # Remove all content within square brackets, including the brackets themselves
    text = re.sub(r'\[.*?\]', '', text)
    # Remove any leading 'A:' or 'a:' prefix
    text = re.sub(r'^[aA]:\s*', '', text)
    # Clean up any double spaces or leading/trailing spaces
    return ' '.join(text.split()).strip()

def get_chat_logs(character_id: str = None, session_id: str = None, date: str = None):
    query = supabase.table("chat_logs").select("id, character_id, session_id, viewer_id, question, response, emotion, timestamp")
    if character_id:
        query = query.eq("character_id", character_id)
    if session_id:
        query = query.eq("session_id", session_id)
    if date:
        query = query.gte("timestamp", f"{date}T00:00:00").lt("timestamp", f"{date}T23:59:59")
    rows = query.order("timestamp", desc=True).execute()
    return rows.data

def build_prompt(instruction, examples, user_input):
    prompt = instruction.strip() + "\n\n"
    if examples:
        prompt += "예시 문답:\n"
        for qa in examples:
            prompt += f"Q: {qa['user']}\nA: {qa['character']}\n"
        prompt += "\n"
    prompt += f"Q: {user_input}\nA:"
    return prompt

def ask(payload: AskPayload):
    try:
        # 실제 대화 이력이 있을 때만 memory에 포함
        chat_log = [turn.dict() for turn in payload.history] if payload.history else []
        memory = {"chat_log": chat_log} if chat_log else {}

        # profile에서 instruction/examples 추출
        instruction = payload.profile.get("instruction", "") if payload.profile else ""
        examples = payload.profile.get("examples", [])[:3] if payload.profile else []
        user_input = payload.history[-1].content if payload.history else ""

        # 프롬프트 조합 (instruction + 예시 + user_input)
        prompt = build_prompt(instruction, examples, user_input)

        # LangGraph 실행 (prompt를 memory에 포함)
        memory["prompt"] = prompt
        steps = run_chat_graph(memory=memory)
        # steps의 반환 구조를 디버깅용으로 출력
        print('[ask] run_chat_graph steps:', steps)
        if not steps or not isinstance(steps[-1], dict):
            raise HTTPException(status_code=400, detail=f"LangGraph 실행 결과가 올바르지 않습니다: {steps}")
        # LangGraph 반환이 {'update_memory': {...}} 형태일 때 마지막 노드의 value를 state로 사용
        last_step = steps[-1]
        if "state" in last_step:
            last_state = last_step["state"]
        else:
            # 마지막 key의 value를 state로 간주
            last_state = list(last_step.values())[-1] if last_step else {}
        if not last_state:
            raise HTTPException(status_code=400, detail=f"LangGraph state 없음: {steps[-1]}")
            
        raw_response = last_state.get("response_text", "응답 생성 실패")
        emotion = last_state.get("emotion_tag", "neutral")
        now = datetime.now().isoformat()
        
        # Clean the response text for TTS
        clean_text = clean_response_text(raw_response)
        
        # supabase 저장 (실제 대화만)
        UUID_REGEX = re.compile(r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')
        if payload.history and UUID_REGEX.match(payload.session_id):
            supabase.table("chat_logs").insert({
                "character_id": payload.id,
                "session_id": payload.session_id,
                "viewer_id": payload.viewer_id,
                "question": payload.history[-1].content,
                "response": raw_response,  # Store raw response with formatting
                "clean_response": clean_text,  # Store cleaned version for TTS
                "emotion": emotion,
                "timestamp": now,
            }).execute()
            
        # Prefix user question with 'Q:' for frontend display
        user_question = payload.history[-1].content if payload.history else ''
        user_question_prefixed = f"Q: {user_question}" if user_question and not user_question.strip().lower().startswith('q:') else user_question

        # Return both raw and cleaned response, and prefixed question
        return {
            "response": raw_response,  # For display in UI
            "clean_response": clean_text,  # For TTS
            "emotion": emotion,
            "user_question": user_question_prefixed
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"질문 처리 실패: {str(e)}")
