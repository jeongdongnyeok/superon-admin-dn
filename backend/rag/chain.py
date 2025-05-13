import os
from dotenv import load_dotenv
from typing import List

from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnableMap, RunnablePassthrough, RunnableLambda
from langchain_openai import ChatOpenAI
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

from backend.rag.parsers import emotion_parser

# storage 저장위치 지정
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
db_dir = os.path.join(CURRENT_DIR, "storage")

# .env 로드
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.env'))
load_dotenv(env_path)

# 모델 및 임베딩 설정
embedding_model = HuggingFaceEmbeddings(model_name="BAAI/bge-small-en-v1.5")
llm = ChatOpenAI(model="gpt-4o", temperature=0.7, api_key=os.getenv("OPENAI_API_KEY"))
splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=100)

# 캐릭터 체인 캐시
character_chains = {}

# 템플릿
character_prompt_template = """
You are a virtual character named **{name}**.

World setting:
"{world}"

Personality:
- Style: {style}
- Perspective: {perspective}
- Tone: {tone}

Using the above information, answer the following input **in character**:
"{input}"
"""

# 문서 → 문자열 변환 함수
def format_docs(docs: List[Document]) -> str:
    return "\n\n".join([str(doc.page_content) if doc.page_content is not None else "" for doc in docs])

def load_character_chain(character_id: str, world_text: str, character_profile: dict):
    docs = []

    profile_text = f"""Character name: {character_profile.get('name', '')}
Style: {character_profile.get('style', '')}
Perspective: {character_profile.get('perspective', '')}
Tone: {character_profile.get('tone', '')}"""

    docs.append(Document(page_content=profile_text, metadata={"type": "profile"}))

    world_docs = splitter.create_documents([world_text])
    for doc in world_docs:
        doc.metadata["type"] = "world"
    docs.extend(world_docs)

    vectordb = FAISS.from_documents(docs, embedding_model)
    vectordb.save_local(os.path.join(db_dir, character_id))
    retriever = vectordb.as_retriever(search_kwargs={"k": 3})

    prompt = PromptTemplate.from_template(character_prompt_template).partial(
        name=str(character_profile.get("name", "")),
        style=str(character_profile.get("style", "")),
        perspective=str(character_profile.get("perspective", "")),
        tone=str(character_profile.get("tone", "")),
        world=str(world_text)
    )

    chain = (
        RunnableMap({
            "context": retriever | RunnableLambda(format_docs),
            "input": RunnablePassthrough()
        }) |
        prompt |
        llm |
        EmotionOutputParser()  # 감정 태깅 파서 추가
    )

    character_chains[character_id] = chain

def load_character_index(character_id: str):
    path = os.path.join(db_dir, character_id)
    if not os.path.exists(path):
        raise FileNotFoundError(f"No FAISS index found for character {character_id}")

    vectordb = FAISS.load_local(path, embedding_model, allow_dangerous_deserialization=True)
    retriever = vectordb.as_retriever(search_kwargs={"k": 3})

    fallback_prompt = PromptTemplate.from_template(
        "Character context:\n{context}\n\nUser input:\n{input}"
    )

    chain = (
        RunnableMap({
            "context": retriever | RunnableLambda(format_docs),
            "input": RunnablePassthrough()
        }) |
        fallback_prompt |
        llm |
        EmotionOutputParser()  # 감정 태깅 파서 추가
    )

    character_chains[character_id] = chain

def ask_character(character_id: str, history: List[dict]) -> dict:
    if character_id not in character_chains:
        try:
            load_character_index(character_id)
        except Exception as e:
            return {"error": str(e)}

    chain = character_chains[character_id]

    if not history or not isinstance(history, list):
        return {"error": "Invalid chat history"}

    chat_context = ""
    for turn in history[:-1]:
        if isinstance(turn, dict) and "role" in turn and "content" in turn:
            role = "User" if turn["role"] == "user" else "AI"
            chat_context += f"{role}: {turn['content']}\n"

    last_turn = history[-1]
    last_input = last_turn["content"] if isinstance(last_turn, dict) else ""

    final_user_input = ""
    if chat_context:
        final_user_input += f"Previous conversation:\n{chat_context}\n\n"
    final_user_input += f"User: {last_input}"

    return chain.invoke(final_user_input)  # 반환값은 dict (response + emotion)
