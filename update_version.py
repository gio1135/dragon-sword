import os
import sys
import json
import zipfile
import shutil
import re
import urllib.request

PROJECT_DIR = r"C:\Users\gio1135\Projects\Dragon sword"
BP_DIR = os.path.join(PROJECT_DIR, "BP")
RP_DIR = os.path.join(PROJECT_DIR, "RP")

MOJANG_DIR = r"C:\Users\gio1135\AppData\Roaming\Minecraft Bedrock\Users\Shared\games\com.mojang"
DEV_BP_DIR = os.path.join(MOJANG_DIR, "development_behavior_packs", "Dragon sword")
DEV_RP_DIR = os.path.join(MOJANG_DIR, "development_resource_packs", "Dragon sword")
REGULAR_BP_DIR = os.path.join(MOJANG_DIR, "behavior_packs", "Dragon sword")
REGULAR_RP_DIR = os.path.join(MOJANG_DIR, "resource_packs", "Dragon sword")

def read_manifest(path):
  if not os.path.exists(path):
    return None
  with open(path, 'r', encoding='utf-8') as f:
    return json.load(f)

def write_manifest(path, data):
  with open(path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

def bump_version(version_array, bump_type):
  if bump_type == 'major':
    version_array[0] += 1
    version_array[1] = 0
    version_array[2] = 0
  elif bump_type == 'minor':
    version_array[1] += 1
    version_array[2] = 0
  elif bump_type == 'patch':
    version_array[2] += 1
  return version_array

def zip_directory(dir_path, zip_file, arc_prefix=""):
  for root, dirs, files in os.walk(dir_path):
    for file in files:
      file_path = os.path.join(root, file)
      arcname = os.path.join(arc_prefix, os.path.relpath(file_path, dir_path))
      zip_file.write(file_path, arcname)

def strip_json_comments(text):
    # Regex to remove C-style block and inline comments
    pattern = r'(".*?"|\'.*?\')|(/\*.*?\*/|//[^\r\n]*$)'
    regex = re.compile(pattern, re.MULTILINE | re.DOTALL)
    def _replacer(match):
        if match.group(2) is not None:
            return ""
        else:
            return match.group(1)
    return regex.sub(_replacer, text)

def build_mounts():
    print("Building mounts from bedrock-samples...")
    mounts = ['horse.json', 'camel.json', 'camel_husk.json', 'donkey.json', 'mule.json']
    base_url = "https://raw.githubusercontent.com/Mojang/bedrock-samples/main/behavior_pack/entities/"
    
    speed_mult = 2.0
    jump_mult = 1.5
    ai_mult = 0.5
    
    for mount in mounts:
        url = base_url + mount
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                content = response.read().decode('utf-8')
                
            content = strip_json_comments(content)
            data = json.loads(content)
            
            # Apply patches
            entity = data.get("minecraft:entity", {})
            components = entity.get("components", {})
            component_groups = entity.get("component_groups", {})
            
            # Helper to modify values
            def modify_range(obj, prop, multiplier):
                if prop in obj:
                    val = obj[prop]
                    if isinstance(val, dict) and "value" in val:
                        v = val["value"]
                        if isinstance(v, dict) and "range_min" in v and "range_max" in v:
                            v["range_min"] *= multiplier
                            v["range_max"] *= multiplier
                        elif isinstance(v, (int, float)):
                            val["value"] *= multiplier
                    elif isinstance(val, (int, float)):
                        obj[prop] *= multiplier

            modify_range(components, "minecraft:movement", speed_mult)
            modify_range(components, "minecraft:horse.jump_strength", jump_mult)
            
            # Also check component groups for these
            for cg_name, cg in component_groups.items():
                modify_range(cg, "minecraft:movement", speed_mult)
                modify_range(cg, "minecraft:horse.jump_strength", jump_mult)
                
            # Scale down AI speeds
            def scale_ai_speed(obj):
                for k, v in obj.items():
                    if k.startswith("minecraft:behavior.") and isinstance(v, dict):
                        if "speed_multiplier" in v:
                            v["speed_multiplier"] *= ai_mult
                            
            scale_ai_speed(components)
            for cg_name, cg in component_groups.items():
                scale_ai_speed(cg)
                
            # Save to BP/entities
            out_path = os.path.join(BP_DIR, "entities", mount)
            os.makedirs(os.path.dirname(out_path), exist_ok=True)
            with open(out_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
            print(f"  Successfully patched {mount}")
            
        except Exception as e:
            print(f"  Failed to process {mount}: {e}")

def main():
  if len(sys.argv) < 2 or sys.argv[1] not in ['major', 'minor', 'patch', 'dev']:
    print("Usage: python update_version.py [major|minor|patch|dev]")
    sys.exit(1)
    
  bump_type = sys.argv[1]
  
  # Build step
  build_mounts()
  
  bp_manifest_path = os.path.join(BP_DIR, "manifest.json")
  rp_manifest_path = os.path.join(RP_DIR, "manifest.json")
  bp_data = read_manifest(bp_manifest_path)
  rp_data = read_manifest(rp_manifest_path)
  if not bp_data or not rp_data:
    print("Error: Could not find manifest.json in BP or RP folders.")
    sys.exit(1)
    
  old_version_array = bp_data['header']['version'].copy()
  old_version_str = ".".join(map(str, old_version_array))
  
  if bump_type != 'dev':
    print(f"Old version: {old_version_str}")
    bp_data['header']['version'] = bump_version(bp_data['header']['version'], bump_type)
    for module in bp_data.get('modules', []):
      if 'version' in module:
        module['version'] = list(bp_data['header']['version'])
    if 'dependencies' in bp_data:
      for dep in bp_data['dependencies']:
        if 'version' in dep and 'uuid' in dep and dep['uuid'] == rp_data['header']['uuid']:
          dep['version'] = list(bp_data['header']['version'])
    rp_data['header']['version'] = list(bp_data['header']['version'])
    for module in rp_data.get('modules', []):
      if 'version' in module:
        module['version'] = list(bp_data['header']['version'])
    if 'dependencies' in rp_data:
      for dep in rp_data['dependencies']:
        if 'version' in dep and 'uuid' in dep and dep['uuid'] == bp_data['header']['uuid']:
          dep['version'] = list(bp_data['header']['version'])
    new_version_str = ".".join(map(str, bp_data['header']['version']))
    print(f"New version: {new_version_str}")
    for data in [bp_data, rp_data]:
      if 'header' in data and 'description' in data['header']:
        data['header']['description'] = re.sub(r'v?\d+\.\d+\.\d+', f'v{new_version_str}', data['header']['description'])
    write_manifest(bp_manifest_path, bp_data)
    write_manifest(rp_manifest_path, rp_data)
    print("Updated manifest.json files.")
    
    backup_zip_path = os.path.join(PROJECT_DIR, f"Dragon_sword_v{old_version_str}.zip")
    with zipfile.ZipFile(backup_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
      if os.path.exists(DEV_BP_DIR):
        zip_directory(DEV_BP_DIR, zipf, "BP")
      if os.path.exists(DEV_RP_DIR):
        zip_directory(DEV_RP_DIR, zipf, "RP")
    print(f"Created backup: {backup_zip_path}")
    
  if os.path.exists(DEV_BP_DIR):
    shutil.rmtree(DEV_BP_DIR)
  if os.path.exists(DEV_RP_DIR):
    shutil.rmtree(DEV_RP_DIR)
    
  shutil.copytree(BP_DIR, DEV_BP_DIR)
  shutil.copytree(RP_DIR, DEV_RP_DIR)
  
  if bump_type != 'dev':
    if os.path.exists(REGULAR_BP_DIR):
      shutil.rmtree(REGULAR_BP_DIR)
    if os.path.exists(REGULAR_RP_DIR):
      shutil.rmtree(REGULAR_RP_DIR)
    shutil.copytree(BP_DIR, REGULAR_BP_DIR)
    shutil.copytree(RP_DIR, REGULAR_RP_DIR)

  # Process DEV manifests to make them unique
  def devify_uuid(u):
    char = u[0]
    new_char = 'f' if char != 'f' else 'e'
    return new_char + u[1:]

  for dev_dir in [DEV_BP_DIR, DEV_RP_DIR]:
    manifest_path = os.path.join(dev_dir, "manifest.json")
    if os.path.exists(manifest_path):
      data = read_manifest(manifest_path)
      data['header']['name'] += " (dev)"
      
      if 'uuid' in data['header']:
        data['header']['uuid'] = devify_uuid(data['header']['uuid'])
      for module in data.get('modules', []):
        if 'uuid' in module:
          module['uuid'] = devify_uuid(module['uuid'])
      for dep in data.get('dependencies', []):
        if 'uuid' in dep:
          dep['uuid'] = devify_uuid(dep['uuid'])
      
      write_manifest(manifest_path, data)

  print("Deployed updated BP and RP to Minecraft development folders.")

if __name__ == "__main__":
  main()
