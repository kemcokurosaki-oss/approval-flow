import re

def check(fname, code):
    pairs = {')':'(', '}':'{', ']':'['}
    stack = []
    in_str = None
    i = 0
    n = len(code)
    line = 1
    while i < n:
        c = code[i]
        if c == '\n':
            line += 1
        if in_str:
            if c == '\\':
                i += 2
                continue
            if c == in_str:
                in_str = None
            i += 1
            continue
        if c in ('"', "'", '`'):
            in_str = c
            i += 1
            continue
        if c == '/' and i + 1 < n and code[i+1] == '/':
            j = code.find('\n', i)
            i = j if j != -1 else n
            continue
        if c == '/' and i + 1 < n and code[i+1] == '*':
            j = code.find('*/', i + 2)
            i = j + 2 if j != -1 else n
            continue
        if c in '({[':
            stack.append((c, line))
        elif c in ')}]':
            if not stack:
                print(fname, 'UNMATCHED CLOSE', c, 'at line', line)
                return
            top, ln = stack.pop()
            if pairs[c] != top:
                print(fname, 'MISMATCH', top, 'vs', c, 'opened line', ln, 'closed line', line)
                return
        i += 1
    if stack:
        print(fname, 'UNCLOSED', stack[:5])
    else:
        print(fname, 'OK balanced')

for fname in ['app.js', 'sheet.html', 'denki_sheet.html', 'test_run_sheet.html']:
    with open(fname, encoding='utf-8') as f:
        content = f.read()
    if fname == 'app.js':
        code = content
    else:
        m = re.search(r'<script>(.*)</script>', content, re.S)
        code = m.group(1) if m else ''
    check(fname, code)
