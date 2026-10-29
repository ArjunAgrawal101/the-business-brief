"""One-off authoring helper: quote stakeholder entries written in YAML flow style.

Flow mappings such as { name: A, reaction: B, mood: C } break when a value contains
a comma. This rewrites such lines with quoted values. Usage:
    python3 scripts/qa/quote-flow-values.py FILE [FILE ...]
"""
import re, sys

PAT = re.compile(r'^(\s*- )\{ name: (.*?), reaction: (.*), mood: (positive|mixed|negative) \}\s*$')

def q(s: str) -> str:
    s = s.strip()
    if len(s) >= 2 and s[0] == s[-1] and s[0] in "'\"":
        return s
    return '"' + s.replace('\\', '\\\\').replace('"', '\\"') + '"'

for path in sys.argv[1:]:
    out, n = [], 0
    for line in open(path, encoding='utf-8').read().split('\n'):
        m = PAT.match(line)
        if m:
            line = f'{m.group(1)}{{ name: {q(m.group(2))}, reaction: {q(m.group(3))}, mood: {m.group(4)} }}'
            n += 1
        out.append(line)
    open(path, 'w', encoding='utf-8').write('\n'.join(out))
    print(path, n, 'entries quoted')
