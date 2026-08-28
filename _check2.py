import sys
s = open('app.js', encoding='utf-8').read()
pairs = {')':'(', '}':'{', ']':'['}
stack = []
in_str = None
i = 0
n = len(s)
line = 1

def prev_nonspace(s, i):
    j = i - 1
    while j >= 0 and s[j] in ' \t\n\r':
        j -= 1
    return s[j] if j >= 0 else ''

REGEX_PRECEDE = set('([{,;=!&|?:+-*%^~<>')
KEYWORDS_END = ('return', 'typeof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else')

def could_be_regex_start(s, i):
    j = i - 1
    while j >= 0 and s[j] in ' \t\n\r':
        j -= 1
    if j < 0:
        return True
    c = s[j]
    if c in REGEX_PRECEDE:
        return True
    # check for keyword ending at j
    k = j
    while k >= 0 and (s[k].isalnum() or s[k]=='_'):
        k -= 1
    word = s[k+1:j+1]
    if word in KEYWORDS_END:
        return True
    return False

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
    if c == '/' and could_be_regex_start(s, i):
        # scan regex literal
        j = i + 1
        in_class = False
        while j < n:
            if s[j] == '\\':
                j += 2
                continue
            if s[j] == '[':
                in_class = True
            elif s[j] == ']':
                in_class = False
            elif s[j] == '/' and not in_class:
                break
            elif s[j] == '\n':
                break
            j += 1
        if j < n and s[j] == '/':
            # skip flags
            j += 1
            while j < n and s[j].isalpha():
                j += 1
            i = j
            continue
        # not a regex after all, fall through as division
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
    print('UNCLOSED:', stack[-8:])
else:
    print('BALANCED OK, total lines', line)
