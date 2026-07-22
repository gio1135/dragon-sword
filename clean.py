import os
d = r"C:\Users\gio1135\Projects\Dragon sword"
exts = ('.py', '.md', '.json', '.bat', '.txt')
for root, _, files in os.walk(d):
  for file in files:
    if file.endswith(exts) and file != "clean.py":
      p = os.path.join(root, file)
      try:
        with open(p, 'r', encoding='utf-8') as f:
          lines = f.read().splitlines()
        content = '\n'.join([l.rstrip() for l in lines])
        with open(p, 'w', encoding='utf-8', newline='') as f:
          f.write(content)
      except Exception as e:
        print(f"Failed {p}: {e}")
