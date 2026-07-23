import os
import re

PROJECT_DIR = r"C:\Users\gio1135\Projects\Dragon sword"

def clean_js(content):
  def replace_block(match):
    s = match.group(0)
    if s.startswith('/*'):
      return ''
    return s

  pattern = r'("(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|`(?:\\.|[^`\\])*`)|(/\*[\s\S]*?\*/)'
  content = re.sub(pattern, replace_block, content)

  lines = content.splitlines()
  cleaned_lines = []
  for line in lines:
    line_no_comment = []
    in_quote = None
    i = 0
    while i < len(line):
      char = line[i]
      if in_quote:
        line_no_comment.append(char)
        if char == in_quote and (i == 0 or line[i-1] != '\\'):
          in_quote = None
      else:
        if char in ('"', "'", '`'):
          in_quote = char
          line_no_comment.append(char)
        elif char == '/' and i + 1 < len(line) and line[i+1] == '/':
          break
        else:
          line_no_comment.append(char)
      i += 1
    
    l_str = ''.join(line_no_comment).rstrip()
    if not l_str and line.strip():
      continue
    
    cleaned_lines.append(l_str)
  
  final_lines = []
  last_was_blank = False
  for line in cleaned_lines:
    if not line:
      if not last_was_blank:
        final_lines.append(line)
        last_was_blank = True
    else:
      final_lines.append(line)
      last_was_blank = False
      
  return '\n'.join(final_lines).rstrip('\r\n')

def clean_generic(content):
  lines = content.splitlines()
  cleaned_lines = [l.rstrip() for l in lines]
  return '\n'.join(cleaned_lines).rstrip('\r\n')

def main():
  skip_dirs = {'.git', 'bedrock-samples-v1.26.30.5-full', 'bedrock.dev', 'learn.microsoft.com', 'wiki.bedrock.dev'}
  processed = 0

  for root, dirs, files in os.walk(PROJECT_DIR):
    dirs[:] = [d for d in dirs if d not in skip_dirs]
    for file in files:
      p = os.path.join(root, file)
      rel_p = os.path.relpath(p, PROJECT_DIR)
      
      if file.endswith('.js'):
        try:
          with open(p, 'r', encoding='utf-8', errors='ignore') as f:
            c = f.read()
          new_c = clean_js(c)
          with open(p, 'w', encoding='utf-8', newline='') as f:
            f.write(new_c)
          processed += 1
        except Exception as e:
          print(f"Error cleaning {rel_p}: {e}")
      elif file.endswith(('.json', '.md', '.bat', '.txt')) and file != 'clean.py':
        try:
          with open(p, 'r', encoding='utf-8', errors='ignore') as f:
            c = f.read()
          new_c = clean_generic(c)
          with open(p, 'w', encoding='utf-8', newline='') as f:
            f.write(new_c)
          processed += 1
        except Exception as e:
          print(f"Error cleaning {rel_p}: {e}")

  print(f"Cleaned {processed} files across project.")

if __name__ == '__main__':
  main()