import sys
s = open('app.js', encoding='utf-8').read()
n = len(s)
pairs = {')':'(', '}':'{', ']':'['}

def calc_line(pos):
    return s.count('\n', 0, pos) + 1

REGEX_PRECEDE = set('([{,;=!&|?:+-*%^~<>')
KEYWORDS_END = ('return', 'typeof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else')

def could_be_regex_start(i):
    j = i - 1
    while j >= 0 and s[j] in ' \t\n\r':
        j -= 1
    if j < 0:
        return True
    c = s[j]
    if c in REGEX_PRECEDE:
        return True
    k = j
    while k >= 0 and (s[k].isalnum() or s[k]=='_'):
        k -= 1
    word = s[k+1:j+1]
    if word in KEYWORDS_END:
        return True
    return False

stack = []

def skip_regular_string(i, quote):
    i += 1
    while i < n:
        if s[i] == '\\':
            i += 2
            continue
        if s[i] == quote:
            return i + 1
        i += 1
    print('UNTERMINATED STRING near line', calc_line(i))
    sys.exit(1)

def skip_template(i):
    i += 1
    while i < n:
        if s[i] == '\\':
            i += 2
            continue
        if s[i] == '`':
            return i + 1
        if s[i] == '$' and i+1 < n and s[i+1] == '{':
            i = parse_code(i+2, terminator='}template')
            continue
        i += 1
    print('UNTERMINATED TEMPLATE near line', calc_line(i))
    sys.exit(1)

def parse_code(i, terminator=None):
    depth = 0
    while i < n:
        c = s[i]
        if c in (' ', '\t', '\n', '\r'):
            i += 1
            continue
        if c == '/' and i+1 < n and s[i+1] == '/':
            while i < n and s[i] != '\n':
                i += 1
            continue
        if c == '/' and i+1 < n and s[i+1] == '*':
            i += 2
            while i+1 < n and not (s[i]=='*' and s[i+1]=='/'):
                i += 1
            i += 2
            continue
        if c in ('"', "'"):
            i = skip_regular_string(i, c)
            continue
        if c == '`':
            i = skip_template(i)
            continue
        if c == '/' and could_be_regex_start(i):
            j = i + 1
            in_class = False
            ok = False
            while j < n:
                if s[j] == '\\':
                    j += 2
                    continue
                if s[j] == '[':
                    in_class = True
                elif s[j] == ']':
                    in_class = False
                elif s[j] == '/' and not in_class:
                    ok = True
                    break
                elif s[j] == '\n':
                    break
                j += 1
            if ok:
                j += 1
                while j < n and s[j].isalpha():
                    j += 1
                i = j
                continue
        if c in '([':
            stack.append((c, calc_line(i)))
            i += 1
            continue
        if c == '{':
            stack.append((c, calc_line(i)))
            if terminator == '}template':
                depth += 1
            i += 1
            continue
        if c in ')]':
            if not stack:
                print('UNMATCHED CLOSE', c, 'at line', calc_line(i))
                sys.exit(1)
            top, tl = stack.pop()
            if pairs[c] != top:
                print('MISMATCH', top, 'opened at', tl, 'closed by', c, 'at line', calc_line(i))
                sys.exit(1)
            i += 1
            continue
        if c == '}':
            if terminator == '}template' and depth == 0:
                return i + 1
            if not stack:
                print('UNMATCHED CLOSE } at line', calc_line(i))
                sys.exit(1)
            top, tl = stack.pop()
            if pairs[c] != top:
                print('MISMATCH', top, 'opened at', tl, 'closed by } at line', calc_line(i))
                sys.exit(1)
            if terminator == '}template':
                depth -= 1
            i += 1
            continue
        i += 1
    if terminator == '}template':
        print('UNTERMINATED ${} near EOF')
        sys.exit(1)
    return i

parse_code(0, terminator=None)
if stack:
    print('UNCLOSED:', stack[-10:])
else:
    print('BALANCED OK')
