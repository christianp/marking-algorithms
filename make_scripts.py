import re
import os
import json

re_def = re.compile(r'## Student answer\n+```((?:.|\n)*)```\n+## Settings\n+```((?:.|\n)*)```\n+## Marking script\n+```((?:.|\n)*)```',re.MULTILINE)

algorithms = {}

for fname in os.listdir('algorithms'):
    name,_ = os.path.splitext(fname)
    with open(os.path.join('algorithms',fname)) as f:
        content= f.read()
    m = re_def.match(content)
    algorithms[name] = {
        'student_answer': m.group(1).strip(),
        'settings': m.group(2).strip(),
        'script': m.group(3).strip(),
    }
with open('algorithms.js','w') as f:
    f.write('var algorithms = '+json.dumps(algorithms))
