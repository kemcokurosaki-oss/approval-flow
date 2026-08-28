import sys
s = open('app.js', encoding='utf-8').read()
pairs = {')':'(', '}':'{', ']':'['}
stack = []
in_str = None
i = 0
n = len(s)
line = 1
while i < n:
    c = s[i]
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
    if c == '/' and i+1 < n and s[i+1] == '/':
        while i < n and s[i] != '\n':
            i += 1
        continue
    if c == '/' and i+1 < n and s[i+1] == '*':
        i += 2
        while i+1 < n and not (s[i]=='*' and s[i+1]=='/'):
            if s[i]=='\n': line+=1
            i += 1
        i += 2
        continue
    if c in '({[':
        stack.append((c, line))
    elif c in ')}]':
        if not stack:
            print('UNMATCHED CLOSE', c, 'at line', line)
            sys.exit(1)
        top, tl = stack.pop()
        if pairs[c] != top:
            print('MISMATCH', top, 'opened at', tl, 'closed by', c, 'at line', line)
            sys.exit(1)
    i += 1
if stack:
    print('UNCLOSED:', stack[-5:])
else:
    print('BALANCED OK, total lines', line)
