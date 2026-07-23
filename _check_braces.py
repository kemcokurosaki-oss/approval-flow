with open('app.js', encoding='utf-8') as f:
    s = f.read()
print('braces', s.count('{'), s.count('}'))
print('parens', s.count('('), s.count(')'))
print('brackets', s.count('['), s.count(']'))
