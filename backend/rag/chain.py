import os
from dotenv import load_dotenv

# 절대 경로로 상위 폴더의 .env 로드
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.env'))
load_dotenv(env_path)

from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnableMap, RunnablePassthrough
from langchain_openai import ChatOpenAI
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

# 캐릭터 체인 캐시
character_chains = {}

# 공통 임베딩 및 모델
embedding_model = HuggingFaceEmbeddings(model_name="BAAI/bge-small-en-v1.5")
llm = ChatOpenAI(model="gpt-4o", temperature=0.7, api_key=os.getenv("OPENAI_API_KEY"))

# 텍스트 분할기
splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=100)

# 캐릭터 속성 기반 템플릿
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

# 저장 경로
db_dir = "rag/storage"
os.makedirs(db_dir, exist_ok=True)


def load_character_chain(character_id: str, world_text: str, character_profile: dict):
    docs = []

    # 캐릭터 속성 정보를 단일 문서로 저장
    profile_text = f"""Character name: {character_profile['name']}
Style: {character_profile['style']}
Perspective: {character_profile['perspective']}
Tone: {character_profile['tone']}"""

    docs.append(Document(
        page_content=profile_text,
        metadata={"type": "profile"}
    ))

    # 세계관 설명을 여러 조각으로 나누고 metadata 태그 지정
    world_docs = splitter.create_documents([world_text])
    for doc in world_docs:
        doc.metadata["type"] = "world"
    docs.extend(world_docs)

    # 벡터 DB 저장
    vectordb = FAISS.from_documents(docs, embedding_model)
    vectordb.save_local(os.path.join(db_dir, character_id))
    retriever = vectordb.as_retriever(search_kwargs={"k": 3})

    # 템플릿 구성
    prompt = PromptTemplate.from_template(character_prompt_template).partial(
        name=character_profile["name"],
        style=character_profile["style"],
        perspective=character_profile["perspective"],
        tone=character_profile["tone"],
        world=world_text
    )

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

    fallback_prompt = PromptTemplate.from_template(
        "Character context:\n{context}\n\nUser input:\n{input}"
    )

    chain = (
        RunnableMap({"context": retriever, "input": RunnablePassthrough()}) |
        fallback_prompt |
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