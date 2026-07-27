import sys

with open('app.js', encoding='utf-8') as f:
    src = f.read()

depth = 0
line = 1
stack = []
in_str = None
i = 0
n = len(src)
while i < n:
    c = src[i]
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
    if c == '/' and i+1 < n and src[i+1] == '/':
        while i < n and src[i] != '\n':
            i += 1
        continue
    if c == '/' and i+1 < n and src[i+1] == '*':
        i += 2
        while i+1 < n and not (src[i]=='*' and src[i+1]=='/'):
            if src[i]=='\n':
                line += 1
            i += 1
        i += 2
        continue
    if c in '({[':
        stack.append((c, line))
    elif c in ')}]':
        if not stack:
            print('UNMATCHED CLOSE', c, 'at line', line)
            sys.exit(1)
        oc, ol = stack.pop()
        pairs = {')':'(', '}':'{', ']':'['}
        if pairs[c] != oc:
            print('MISMATCH', oc, 'opened at', ol, 'closed with', c, 'at line', line)
            sys.exit(1)
    i += 1
else:
    if stack:
        print('UNCLOSED:', stack[-5:])
    else:
        print('BALANCED OK, total lines', line)
