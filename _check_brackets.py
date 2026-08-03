import sys, re
path = sys.argv[1]
src = open(path, encoding='utf-8').read()

i = 0
n = len(src)
stack = []
line = 1
errors = []
while i < n:
    c = src[i]
    if c == '\n':
        line += 1
    if c == '/' and i+1 < n and src[i+1] == '/':
        j = src.find('\n', i)
        if j == -1: j = n
        line += src.count('\n', i, j)
        i = j
        continue
    if c == '/' and i+1 < n and src[i+1] == '*':
        j = src.find('*/', i+2)
        if j == -1: j = n
        else: j += 2
        line += src.count('\n', i, j)
        i = j
        continue
    if c in ('"', "'"):
        q = c
        j = i+1
        while j < n and src[j] != q:
            if src[j] == '\\':
                j += 2
                continue
            if src[j] == '\n':
                break
            j += 1
        line += src.count('\n', i, j)
        i = j+1
        continue
    if c == '`':
        j = i+1
        depth = 0
        while j < n:
            if src[j] == '\\':
                j += 2
                continue
            if src[j] == '`' and depth == 0:
                break
            if src[j] == '$' and j+1 < n and src[j+1] == '{':
                depth += 1
                j += 2
                continue
            if src[j] == '{' and depth > 0:
                depth += 1
                j += 1
                continue
            if src[j] == '}' and depth > 0:
                depth -= 1
                j += 1
                continue
            j += 1
        line += src.count('\n', i, j)
        i = j+1
        continue
    if c in '({[':
        stack.append((c, line))
    elif c in ')}]':
        pairs = {'(': ')', '{': '}', '[': ']'}
        if not stack:
            errors.append("unmatched closing %s at line %d" % (c, line))
        else:
            open_c, open_line = stack.pop()
            if pairs[open_c] != c:
                errors.append("mismatched %s(line %d) closed by %s at line %d" % (open_c, open_line, c, line))
    i += 1

print("remaining unclosed:", stack[:5], "total", len(stack))
print("errors:", errors[:10])
print("RESULT:", "OK" if not stack and not errors else "PROBLEM")
