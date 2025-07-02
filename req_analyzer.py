#!/usr/bin/env python3
"""
requirements.txt 최적화 도구
실제 import되는 패키지만 추출해서 새로운 requirements.txt 생성
"""

import os
import re
import subprocess

def find_imports(directory):
    """디렉토리에서 모든 import 문 찾기"""
    imports = set()
    
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.py'):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                        
                    # import 패턴 찾기
                    patterns = [
                        r'^import\s+(\w+)',  # import package
                        r'^from\s+(\w+)',   # from package import
                    ]
                    
                    for pattern in patterns:
                        matches = re.findall(pattern, content, re.MULTILINE)
                        for match in matches:
                            if not match.startswith('backend'):  # 로컬 모듈 제외
                                imports.add(match)
                except Exception as e:
                    print(f"Error reading {filepath}: {e}")
    
    return sorted(imports)

def get_package_mapping():
    """Python 모듈명을 pip 패키지명으로 매핑"""
    return {
        'fastapi': 'fastapi',
        'uvicorn': 'uvicorn',
        'langchain_core': 'langchain-core',
        'langchain_openai': 'langchain-openai', 
        'langchain_community': 'langchain-community',
        'langchain_text_splitters': 'langchain-text-splitters',
        'langchain_huggingface': 'langchain-huggingface',
        'supabase': 'supabase',
        'torch': 'torch',
        'transformers': 'transformers',
        'gradio': 'gradio',
        'pandas': 'pandas',
        'numpy': 'numpy',
        'requests': 'requests',
        'yaml': 'PyYAML',
        'sklearn': 'scikit-learn',
        'PIL': 'Pillow',
        'cv2': 'opencv-python',
        'httpx': 'httpx',
        'pydantic': 'pydantic',
        'sqlalchemy': 'SQLAlchemy',
        'aiofiles': 'aiofiles',
        'openai': 'openai',
        'tiktoken': 'tiktoken',
        'obs_websocket_py': 'obs-websocket-py',
        'sentence_transformers': 'sentence-transformers',
        'faiss': 'faiss-cpu',
    }

def get_builtin_modules():
    """Python 내장 모듈 목록"""
    return {
        '__future__', 'os', 'sys', 'json', 're', 'datetime', 'asyncio',
        'typing', 'logging', 'pathlib', 'functools', 'collections', 
        'itertools', 'time', 'random', 'math', 'io', 'subprocess',
        'threading', 'multiprocessing', 'socket', 'urllib', 'http',
        'email', 'html', 'xml', 'csv', 'configparser', 'argparse',
        'tempfile', 'shutil', 'glob', 'fnmatch', 'pickle', 'base64',
        'hashlib', 'hmac', 'secrets', 'uuid', 'queue', 'copy',
        'weakref', 'gc', 'inspect', 'dis', 'traceback', 'warnings'
    }

def analyze_requirements():
    """현재 requirements.txt와 실제 사용 패키지 비교"""
    
    print("🔍 백엔드 코드에서 import 문 분석 중...")
    imports = find_imports('backend')
    
    # 내장 모듈 필터링
    builtin_modules = get_builtin_modules()
    external_imports = [imp for imp in imports if imp not in builtin_modules]
    
    print(f"\n📦 외부 패키지 import들 ({len(external_imports)}개):")
    for imp in external_imports:
        print(f"  - {imp}")
    
    if len(imports) > len(external_imports):
        filtered_out = len(imports) - len(external_imports)
        print(f"\n🚫 내장 모듈 {filtered_out}개 필터링됨")
    
    print("\n🔄 pip 패키지명으로 변환 중...")
    package_mapping = get_package_mapping()
    required_packages = set()
    
    for imp in external_imports:
        if imp in package_mapping:
            required_packages.add(package_mapping[imp])
            print(f"  {imp} → {package_mapping[imp]}")
        else:
            print(f"  ❓ {imp} → (매핑 정보 없음, 확인 필요)")
            required_packages.add(imp)  # 일단 추가
    
    # 현재 requirements.txt 읽기
    current_packages = set()
    if os.path.exists('requirements.txt'):
        with open('requirements.txt', 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    package = line.split('==')[0].split('>=')[0].split('<=')[0]
                    current_packages.add(package)
    
    print(f"\n📊 분석 결과:")
    print(f"  현재 requirements.txt: {len(current_packages)}개 패키지")
    print(f"  실제 필요한 패키지: {len(required_packages)}개 패키지")
    
    # 불필요한 패키지 찾기
    unnecessary = current_packages - required_packages
    missing = required_packages - current_packages
    
    if unnecessary:
        print(f"\n❌ 제거 가능한 패키지들 ({len(unnecessary)}개):")
        for pkg in sorted(unnecessary):
            print(f"  - {pkg}")
    
    if missing:
        print(f"\n➕ 추가 필요한 패키지들 ({len(missing)}개):")
        for pkg in sorted(missing):
            print(f"  - {pkg}")
    
    # 최적화된 requirements.txt 생성
    print(f"\n💾 requirements_minimal.txt 생성 중...")
    with open('requirements_minimal.txt', 'w') as f:
        f.write("# 실제 사용되는 패키지만 포함\n")
        f.write("# 자동 생성됨 - requirements_analyzer.py\n\n")
        
        for package in sorted(required_packages):
            f.write(f"{package}\n")
    
    print("✅ 완료! requirements_minimal.txt 파일을 확인하세요.")
    print("\n💡 다음 단계:")
    print("1. requirements_minimal.txt 내용 검토")
    print("2. 버전 정보 추가 (필요시)")
    print("3. requirements.txt 교체")
    print("4. 테스트 후 배포")

if __name__ == "__main__":
    analyze_requirements()
