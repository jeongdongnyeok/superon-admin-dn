from backend.services.chat_graph import run_chat_graph
from dotenv import load_dotenv
import os

def test_chat_graph_basic():
    load_dotenv()
    memory = {"chat_log": [{"content": "사주오빠? 오늘 운세 알려줘!"}]}
    steps = run_chat_graph(memory=memory)
    last_step = steps[-1] if steps else {}
    # 마지막 노드명('update_memory')의 결과만 추출
    node_result = last_step.get("update_memory", {})
    print("Node result:", node_result)
    assert "response_text" in node_result
    assert "emotion_tag" in node_result
    assert node_result["response_text"].strip() != ""
    assert node_result["emotion_tag"] in ["happy", "sad", "angry", "neutral", "surprise", "disgust", "fear"]
