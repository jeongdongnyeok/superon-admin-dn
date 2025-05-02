# backend/rag/chain.py
import os
from dotenv import load_dotenv

# 절대 경로로 상위 폴더의 .env 로드
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.env'))
print("[DEBUG] loading .env from:", env_path)
load_dotenv(env_path)

print("[DEBUG] OPENAI_API_KEY:", os.getenv("OPENAI_API_KEY"))

from langchain_community.vectorstores import FAISS
# 나머지 기존 코드 이어짐...
print("[DEBUG] OPENAI_API_KEY:", os.getenv("OPENAI_API_KEY"))
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnableMap, RunnablePassthrough
from langchain_openai import ChatOpenAI
from langchain.text_splitter import RecursiveCharacterTextSplitter


# 캐릭터 체인 캐시
character_chains = {}

# 공통 임베딩 및 모델
embedding_model = HuggingFaceEmbeddings(model_name="BAAI/bge-small-en-v1.5")
llm = ChatOpenAI(model="gpt-4o", temperature=0.7, api_key=os.getenv("OPENAI_API_KEY"))

# 텍스트 분할기
splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=100)

# 템플릿 설정
template = '''You are the character from the following world description:\n\n{context}\n\nBased on this, answer this:\n\n{input}'''
prompt = PromptTemplate.from_template(template)

# 저장 경로
db_dir = "rag/storage"
os.makedirs(db_dir, exist_ok=True)

def load_character_chain(character_id: str, world_text: str):
    docs = splitter.create_documents([world_text])
    vectordb = FAISS.from_documents(docs, embedding_model)
    vectordb.save_local(os.path.join(db_dir, character_id))
    retriever = vectordb.as_retriever(search_kwargs={"k": 3})

    chain = (
        RunnableMap({"context": retriever, "input": RunnablePassthrough()}) |
        prompt |
        llm
    )

    character_chains[character_id] = chain

def load_character_index(character_id: str):
    path = os.path.join(db_dir, character_id)
    if not os.path.exists(path):
        raise FileNotFoundError(f"No FAISS index found for character {character_id}")

    vectordb = FAISS.load_local(path, embedding_model, allow_dangerous_deserialization=True)
    retriever = vectordb.as_retriever(search_kwargs={"k": 3})

    chain = (
        RunnableMap({"context": retriever, "input": RunnablePassthrough()}) |
        prompt |
        llm
    )

    character_chains[character_id] = chain

def ask_character(character_id: str, question: str) -> str:
    if character_id not in character_chains:
        try:
            load_character_index(character_id)
        except Exception as e:
            return f"[ERROR] {str(e)}"

    chain = character_chains[character_id]
    return chain.invoke(question)