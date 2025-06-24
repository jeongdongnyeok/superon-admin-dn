from dotenv import load_dotenv
load_dotenv()
from typing import TypedDict, Dict, Any
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langgraph.graph import END, StateGraph
from langchain_openai import ChatOpenAI
import re
from backend.rag.parsers.emotion_parser import EmotionOutputParser

# 1️⃣ State 정의
default_memory = {}

class GraphState(TypedDict):
    instruction_prompt: str
    examples: str
    selected_input: str
    response_text: str
    emotion_tag: str
    memory: Dict[str, Any]

# 2️⃣ 어드민 instruction node
def instruction_loader(state: GraphState) -> GraphState:
    # PlaygroundTab 등에서 전달한 instruction_prompt, examples를 state에 그대로 사용
    state["instruction_prompt"] = state.get("instruction_prompt", "")
    state["examples"] = state.get("examples", "")
    return state

# 3️⃣ 상황판단 엔진 node
def situation_filter(state: GraphState) -> GraphState:
    # TODO: 실제 chat log에서 적합 input 선택
    # 임시: memory에 chat log가 있으면 가장 최근 content 사용
    chat_log = state.get("memory", {}).get("chat_log", [])
    selected_input = chat_log[-1]["content"] if chat_log else "사주오빠? 제 운세 봐주세요!"
    state["selected_input"] = selected_input
    return state

# 4️⃣ LLM 응답 node
llm = ChatOpenAI(model="gpt-4o")

# 예시 Q&A를 Q/A 쌍으로 포맷하는 함수
def format_examples(examples):
    if not examples:
        return "(예시 없음)"
    # 배열/문자열 모두 허용
    if isinstance(examples, str):
        return examples
    lines = []
    for qa in examples:
        user = qa.get('user') or qa.get('input') or ''
        character = qa.get('character') or qa.get('output') or ''
        if user and character:
            lines.append(f"Q: {user}\nA: {character}")
    return "\n".join(lines)

prompt_template = ChatPromptTemplate.from_template(
    """
    [캐릭터 설명]
    {instruction_prompt}

    [예시 문답]
    {examples}

    [실제 사용자 입력]
    Q: {selected_input}
    A: (캐릭터로서 자연스럽게 답변하고 마지막에 [감정: happy|sad|angry|neutral|surprise|disgust|fear] 태그를 붙이세요.)
    """
)
llm_chain = prompt_template | llm | StrOutputParser()

def llm_response(state: GraphState) -> GraphState:
    response_text = llm_chain.invoke({
        "instruction_prompt": state["instruction_prompt"],
        "examples": format_examples(state.get("examples", [])),
        "selected_input": state["selected_input"]
    })
    state["response_text"] = response_text
    return state

# 5️⃣ OutputParser node
def output_parser(state: GraphState) -> GraphState:
    # 단순히 응답 텍스트만 파싱
    state["parsed_text"] = state["response_text"]
    return state

# 5-2️⃣ Emotion 판단 node (신규)
def emotion_node(state: GraphState) -> GraphState:
    text = state.get("parsed_text", state.get("response_text", ""))
    # 1. [감정: ...] 태그 우선 추출
    match = re.search(r"\[감정: (.*?)\]", text)
    if match:
        emotion_tag = match.group(1)
    else:
        # 2. 태그 없으면 키워드 기반 분류
        parser = EmotionOutputParser()
        emotion_tag = parser.parse(text).emotion.value
    state["emotion_tag"] = emotion_tag
    return state

# 6️⃣ Memory update node
def memory_update(state: GraphState) -> GraphState:
    # 실제 DB 저장 로직은 별도 함수에서 처리 가능
    state["memory"] = {
        "last_response": state["response_text"],
        "last_emotion": state["emotion_tag"]
    }
    return state

# 7️⃣ LangGraph 구성
def build_chat_graph():
    builder = StateGraph(GraphState)
    builder.add_node("load_instruction", instruction_loader)
    builder.add_node("filter_input", situation_filter)
    builder.add_node("llm_response", llm_response)
    builder.add_node("parse_output", output_parser)
    builder.add_node("emotion_node", emotion_node)
    builder.add_node("update_memory", memory_update)
    builder.set_entry_point("load_instruction")
    builder.add_edge("load_instruction", "filter_input")
    builder.add_edge("filter_input", "llm_response")
    builder.add_edge("llm_response", "parse_output")
    builder.add_edge("parse_output", "emotion_node")
    builder.add_edge("emotion_node", "update_memory")
    builder.add_edge("update_memory", END)
    return builder.compile()

# 8️⃣ 실행 래퍼 (테스트용)
from langchain_core.runnables import RunnableConfig

def run_chat_graph(memory=None):
    graph = build_chat_graph()
    state = {"memory": memory or default_memory}
    steps = []
    config = RunnableConfig(project_name="Superon", tags=["langgraph", "superon"])
    for step in graph.stream(state, config=config):
        steps.append(step)
    return steps
