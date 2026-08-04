import re

path = 'index.html'
with open(path, encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r'font-size:\s*(\d+)px')

def bump(m):
    return 'font-size:%dpx' % (int(m.group(1)) + 1)

new_content, n = pattern.subn(bump, content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print('changed occurrences:', n)
