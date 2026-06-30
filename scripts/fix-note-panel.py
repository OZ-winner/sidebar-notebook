import re
with open('E:/sidebar-notes/src/components/NotePanel.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
start = content.find('{notes.length > 0 && listView && (')
if start >= 0:
    end = content.find('       )}', start)
    if end >= 0:
        end = content.find('\n', end) + 1
        while start > 0 and content[start-1] == '\n':
            start -= 1
        content = content[:start] + content[end:]
with open('E:/sidebar-notes/src/components/NotePanel.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('fixed:', len(content), 'chars')
