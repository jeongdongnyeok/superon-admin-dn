import json
import os

json_path = os.path.join(os.path.dirname(__file__), '../public/backend/65d3ca8d-3fa2-47a8-b736-8a95d625b11a/motion/list.json')

with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

for file in data['files']:
    name = file['name'].lower()
    if 'talking' in name:
        file['tag'] = 'talking'
    elif 'neutral' in name:
        file['tag'] = 'neutral'
    else:
        file['tag'] = ''

with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
