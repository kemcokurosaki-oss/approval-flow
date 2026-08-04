import re

path = 'style.css'
with open(path, encoding='utf-8') as f:
    lines = f.readlines()

EXCLUDE_LINES = {904, 1957, 2063, 2122}  # .mph-pnum, .rail-brand-name, .side-panel-title, #page_title

pattern = re.compile(r'font-size:\s*(\d+)px')

def bump(m):
    return 'font-size: %dpx' % (int(m.group(1)) + 1)

changed = 0
for i, line in enumerate(lines, start=1):
    if i in EXCLUDE_LINES:
        continue
    new_line, n = pattern.subn(bump, line)
    if n:
        lines[i - 1] = new_line
        changed += n

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('changed occurrences:', changed)
