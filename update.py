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
  try:
    with open(path, 'r', encoding='utf-8') as f:
      content = strip_json_comments(f.read())
      return json.loads(content, strict=False)
  except Exception:
    return None

def format_json_compact(obj, indent=0):
  sp = '  ' * indent
  sp1 = '  ' * (indent + 1)
  if isinstance(obj, dict):
    if not obj:
      return '{}'
    items = []
    for k, v in obj.items():
      items.append(f'{sp1}{json.dumps(k)}: {format_json_compact(v, indent + 1)}')
    return '{\n' + ',\n'.join(items) + '\n' + sp + '}'
  elif isinstance(obj, list):
    if len(obj) <= 3 and all(isinstance(x, (int, float)) for x in obj):
      inner = ', '.join(json.dumps(x) for x in obj)
      return f'[ {inner} ]'
    if not obj:
      return '[]'
    items = []
    for v in obj:
      items.append(f'{sp1}{format_json_compact(v, indent + 1)}')
    return '[\n' + ',\n'.join(items) + '\n' + sp + ']'
  else:
    return json.dumps(obj)

def write_manifest(path, data):
  with open(path, 'w', encoding='utf-8') as f:
    f.write(format_json_compact(data))

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

def clean_zip_backups(current_version_str, previous_version_str=None):
  current_zip = f"Dragon_sword_v{current_version_str}.zip"
  current_mcaddon = f"Dragon_sword_v{current_version_str}.mcaddon"
  prev_zip = f"Dragon_sword_v{previous_version_str}.zip" if previous_version_str else None
  prev_mcaddon = f"Dragon_sword_v{previous_version_str}.mcaddon" if previous_version_str else None

  allowed_zips = {current_zip, current_mcaddon}
  if prev_zip:
    allowed_zips.add(prev_zip)
    allowed_zips.add(prev_mcaddon)

  for file in os.listdir(PROJECT_DIR):
    if file.startswith("Dragon_sword_v") and (file.endswith(".zip") or file.endswith(".mcaddon")):
      if file not in allowed_zips:
        p = os.path.join(PROJECT_DIR, file)
        try:
          os.remove(p)
          print(f"Removed old backup: {file}")
        except Exception as e:
          print(f"Failed to remove {file}: {e}")

  for d in [DEV_BP_DIR, DEV_RP_DIR, REGULAR_BP_DIR, REGULAR_RP_DIR]:
    if os.path.exists(d):
      for root, _, files in os.walk(d):
        for f in files:
          if f.endswith('.zip'):
            try:
              os.remove(os.path.join(root, f))
            except Exception:
              pass

def strip_json_comments(text):
  pattern = r'(".*?"|\'.*?\')|(/\*.*?\*/|//[^\r\n]*$)'
  regex = re.compile(pattern, re.MULTILINE | re.DOTALL)
  def _replacer(match):
    if match.group(2) is not None:
      return ""
    else:
      return match.group(1)
  return regex.sub(_replacer, text)

def build_mounts():
  print("Building mounts from local bedrock-samples...")
  mounts = ['horse.json', 'camel.json', 'camel_husk.json', 'donkey.json', 'mule.json', 'zombie_horse.json']
  samples_dir = os.path.join(PROJECT_DIR, "Docs", "bedrock-samples-v1.26.50.4-full", "behavior_pack", "entities")

  for mount in mounts:
    source_path = os.path.join(samples_dir, 'horse.json' if mount == 'zombie_horse.json' else mount)
    try:
      if not os.path.exists(source_path):
        print(f"  Skipped {mount}: not found in local samples")
        continue
      with open(source_path, 'r', encoding='utf-8') as f:
        content = f.read()

      content = strip_json_comments(content)
      data = json.loads(content)

      entity = data.get("minecraft:entity", {})
      components = entity.get("components", {})
      component_groups = entity.get("component_groups", {})

      if mount == 'zombie_horse.json':
        entity.get('description', {})['identifier'] = 'minecraft:zombie_horse'

      def update_float(obj):
        for k, v in obj.items():
          if k == "minecraft:behavior.float" and isinstance(v, dict):
            v["time_under_water_to_dismount_passengers"] = 999999.0

      update_float(components)
      for cg_name, cg in component_groups.items():
        update_float(cg)

      if mount in ['horse.json', 'zombie_horse.json']:
        components['minecraft:movement'] = {'value': {'range_min': 0.12, 'range_max': 0.25}}
        components['minecraft:horse.jump_strength'] = {'value': {'range_min': 0.6, 'range_max': 0.95}}
        if mount == 'zombie_horse.json':
          components['minecraft:health'] = {'value': 25, 'max': 25}
        components['minecraft:damage_sensor'] = {'triggers': [{'cause': 'fall', 'deals_damage': 'no'}]}
      elif mount == 'mule.json':
        components['minecraft:movement'] = {'value': {'range_min': 0.16, 'range_max': 0.4}}
        components['minecraft:horse.jump_strength'] = {'value': {'range_min': 0.6, 'range_max': 0.95}}
        components['minecraft:damage_sensor'] = {'triggers': [{'cause': 'fall', 'deals_damage': 'no'}]}
      elif mount == 'donkey.json':
        components['minecraft:movement'] = {'value': {'range_min': 0.16, 'range_max': 0.4}}
        components['minecraft:horse.jump_strength'] = {'value': {'range_min': 0.3, 'range_max': 0.5}}
      elif mount in ['camel.json', 'camel_husk.json']:
        for cg_name, cg in component_groups.items():
          if 'minecraft:dash_action' in cg:
            cg['minecraft:dash_action']['horizontal_momentum'] = 12.0
        if 'minecraft:dash_action' in components:
          components['minecraft:dash_action']['horizontal_momentum'] = 12.0

      out_path = os.path.join(BP_DIR, "entities", mount)
      os.makedirs(os.path.dirname(out_path), exist_ok=True)
      with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
      print(f"  Successfully patched {mount}")

    except Exception as e:
      print(f"  Failed to process {mount}: {e}")

def deploy_external_packs():
  source_roots = [
    os.path.join(PROJECT_DIR, '32k packs'),
    os.path.join(PROJECT_DIR, 'External packs')
  ]

  source_packs = []
  seen_uuids = set()

  for root_dir in source_roots:
    if not os.path.exists(root_dir):
      continue
    for pack_name in os.listdir(root_dir):
      pack_path = os.path.join(root_dir, pack_name)
      if not os.path.isdir(pack_path):
        continue
      for sub in os.listdir(pack_path):
        sub_path = os.path.join(pack_path, sub)
        manifest_path = os.path.join(sub_path, 'manifest.json')
        if os.path.isdir(sub_path) and os.path.exists(manifest_path):
          m = read_manifest(manifest_path)
          if m and 'header' in m and 'uuid' in m['header']:
            uuid = m['header']['uuid']
            if uuid in seen_uuids:
              continue
            seen_uuids.add(uuid)
            pack_type = 'behavior' if any(mod.get('type') in ['data', 'script'] for mod in m.get('modules', [])) else 'resource'
            source_packs.append({
              'name': m['header'].get('name', sub),
              'uuid': uuid,
              'type': pack_type,
              'path': sub_path
            })

  for p_path, p_type in [(BP_DIR, 'behavior'), (RP_DIR, 'resource')]:
    manifest_path = os.path.join(p_path, 'manifest.json')
    if os.path.exists(manifest_path):
      m = read_manifest(manifest_path)
      if m and 'header' in m and 'uuid' in m['header']:
        uuid = m['header']['uuid']
        if uuid not in seen_uuids:
          seen_uuids.add(uuid)
          source_packs.append({
            'name': m['header'].get('name', os.path.basename(p_path)),
            'uuid': uuid,
            'type': p_type,
            'path': p_path
          })

  users_dir = os.path.abspath(os.path.join(MOJANG_DIR, '..', '..', '..'))
  search_dirs = []
  if os.path.exists(users_dir):
    for user in os.listdir(users_dir):
      user_mojang = os.path.join(users_dir, user, 'games', 'com.mojang')
      if not os.path.isdir(user_mojang):
        continue
      search_dirs.append(('behavior', os.path.join(user_mojang, 'development_behavior_packs')))
      search_dirs.append(('behavior', os.path.join(user_mojang, 'behavior_packs')))
      search_dirs.append(('resource', os.path.join(user_mojang, 'development_resource_packs')))
      search_dirs.append(('resource', os.path.join(user_mojang, 'resource_packs')))
      worlds_dir = os.path.join(user_mojang, 'minecraftWorlds')
      if os.path.isdir(worlds_dir):
        for world in os.listdir(worlds_dir):
          world_dir = os.path.join(worlds_dir, world)
          if os.path.isdir(world_dir):
            search_dirs.append(('behavior', os.path.join(world_dir, 'behavior_packs')))
            search_dirs.append(('resource', os.path.join(world_dir, 'resource_packs')))

  clean_keywords = ['actualplay', 'playerhead']
  for _, bdir in search_dirs:
    if os.path.exists(bdir) and ('development_' not in bdir):
      for it in os.listdir(bdir):
        if any(kw in it.lower() for kw in clean_keywords):
          ip = os.path.join(bdir, it)
          if os.path.isdir(ip):
            shutil.rmtree(ip)
          elif os.path.isfile(ip):
            os.remove(ip)

  for sp in source_packs:
    deployed = False
    for p_type, base_dir in search_dirs:
      if p_type != sp['type'] or not os.path.exists(base_dir):
        continue
      for existing in os.listdir(base_dir):
        existing_path = os.path.join(base_dir, existing)
        existing_manifest = os.path.join(existing_path, 'manifest.json')
        if os.path.isdir(existing_path) and os.path.exists(existing_manifest):
          em = read_manifest(existing_manifest)
          if em and em.get('header', {}).get('uuid') == sp['uuid']:
            shutil.rmtree(existing_path)
            dest_target = os.path.join(base_dir, sp['name'])
            if os.path.exists(dest_target):
              shutil.rmtree(dest_target)
            shutil.copytree(sp['path'], dest_target, ignore=shutil.ignore_patterns('*.zip', '*.mcaddon'))
            print(f"Deployed {sp['name']} to {dest_target}")
            deployed = True

    if not deployed:
      dest_parent = os.path.join(MOJANG_DIR, 'development_behavior_packs' if sp['type'] == 'behavior' else 'development_resource_packs')
      os.makedirs(dest_parent, exist_ok=True)
      dest_path = os.path.join(dest_parent, sp['name'])
      if os.path.exists(dest_path):
        shutil.rmtree(dest_path)
      shutil.copytree(sp['path'], dest_path, ignore=shutil.ignore_patterns('*.zip', '*.mcaddon'))
      print(f"Deployed {sp['name']} to {dest_path}")

def update_external_packs():
  print('Updating external packs...')
  import patch_external_packs
  patch_external_packs.patch_all()
  deploy_external_packs()
  print('External packs updated and deployed successfully')

def main():
  if len(sys.argv) < 2 or sys.argv[1] not in ['major', 'minor', 'patch', 'dev', 'external', 'heads']:
    print("Usage: python update.py [major|minor|patch|dev|external|heads]")
    sys.exit(1)

  bump_type = sys.argv[1]

  if bump_type == 'external':
    update_external_packs()
    sys.exit(0)

  if bump_type == 'heads':
    from Tools import update_heads
    update_heads.update_workflow()
    sys.exit(0)

  build_mounts()
  build_items()
  build_other_entities()
  build_loot_tables()
  build_trades()

  bp_manifest_path = os.path.join(BP_DIR, "manifest.json")
  rp_manifest_path = os.path.join(RP_DIR, "manifest.json")
  bp_data = read_manifest(bp_manifest_path)
  rp_data = read_manifest(rp_manifest_path)
  if not bp_data or not rp_data:
    print("Error: Could not find manifest.json in BP or RP folders")
    sys.exit(1)

  old_version_array = bp_data['header']['version'].copy()
  old_version_str = ".".join(map(str, old_version_array))
  new_version_str = old_version_str

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
        if 'version' in dep and 'uuid' in dep:
          dep['version'] = list(bp_data['header']['version'])
    new_version_str = ".".join(map(str, bp_data['header']['version']))
    print(f"New version: {new_version_str}")
    for data in [bp_data, rp_data]:
      if 'header' in data and 'description' in data['header']:
        data['header']['description'] = re.sub(r'v?\d+\.\d+\.\d+', f'v{new_version_str}', data['header']['description'])
    write_manifest(bp_manifest_path, bp_data)
    write_manifest(rp_manifest_path, rp_data)
    print("Updated manifest.json files")

  current_zip_path = os.path.join(PROJECT_DIR, f"Dragon_sword_v{new_version_str}.zip")
  current_mcaddon_path = os.path.join(PROJECT_DIR, f"Dragon_sword_v{new_version_str}.mcaddon")

  with zipfile.ZipFile(current_mcaddon_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    if os.path.exists(BP_DIR):
      zip_directory(BP_DIR, zipf, "BP")
    if os.path.exists(RP_DIR):
      zip_directory(RP_DIR, zipf, "RP")
  print(f"Created version mcaddon: {current_mcaddon_path}")

  shutil.copy2(current_mcaddon_path, current_zip_path)
  print(f"Created version zip: {current_zip_path}")

  clean_zip_backups(new_version_str, old_version_str if bump_type != 'dev' else "7.7.9")

  if os.path.exists(DEV_BP_DIR):
    shutil.rmtree(DEV_BP_DIR)
  if os.path.exists(DEV_RP_DIR):
    shutil.rmtree(DEV_RP_DIR)

  shutil.copytree(BP_DIR, DEV_BP_DIR, ignore=shutil.ignore_patterns('*.zip', '*.mcaddon'))
  shutil.copytree(RP_DIR, DEV_RP_DIR, ignore=shutil.ignore_patterns('*.zip', '*.mcaddon'))

  if bump_type != 'dev':
    if os.path.exists(REGULAR_BP_DIR):
      shutil.rmtree(REGULAR_BP_DIR)
    if os.path.exists(REGULAR_RP_DIR):
      shutil.rmtree(REGULAR_RP_DIR)
    shutil.copytree(BP_DIR, REGULAR_BP_DIR, ignore=shutil.ignore_patterns('*.zip', '*.mcaddon'))
    shutil.copytree(RP_DIR, REGULAR_RP_DIR, ignore=shutil.ignore_patterns('*.zip', '*.mcaddon'))

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

  print("Deployed updated BP and RP to Minecraft development folders")
  update_external_packs()



def build_items():
  print("Building items...")
  items = ["honey_bottle.json", "suspicious_stew.json"]
  for item in items:
    source_path = os.path.join(PROJECT_DIR, "Docs", "bedrock-samples-v1.26.50.4-full", "behavior_pack", "items", item)
    if not os.path.exists(source_path): continue
    with open(source_path, "r", encoding="utf-8") as f: content = strip_json_comments(f.read())
    data = json.loads(content)
    if item == "honey_bottle.json":
      data["format_version"] = 1.1
      data["minecraft:item"]["components"]["minecraft:max_stack_size"] = 64
    elif item == "suspicious_stew.json":
      data["format_version"] = "1.1"
      data["minecraft:item"]["components"]["minecraft:max_stack_size"] = 16
      use_anim = data["minecraft:item"]["components"].get("minecraft:use_animation", {})
      if "on_use_action" in use_anim: del use_anim["on_use_action"]
      if "can_always_eat" in use_anim: del use_anim["can_always_eat"]
    out_path = os.path.join(BP_DIR, "items", item)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f: json.dump(data, f, indent=2)
def build_other_entities():
  print("Building other entities...")
  ents = ["skeleton_horse.json", "strider.json", "pig.json", "wolf.json"]
  for ent in ents:
    source_path = os.path.join(PROJECT_DIR, "Docs", "bedrock-samples-v1.26.50.4-full", "behavior_pack", "entities", ent)
    if not os.path.exists(source_path): continue
    with open(source_path, "r", encoding="utf-8") as f: content = strip_json_comments(f.read())
    data = json.loads(content)
    comps = data.get("minecraft:entity", {}).get("components", {})
    cgs = data.get("minecraft:entity", {}).get("component_groups", {})
    if ent == "skeleton_horse.json":
      comps["minecraft:underwater_mount_breathing"] = {}
      comps["minecraft:mob_effect"] = {"mob_effect": "breath_of_the_nautilus", "ambient": True, "effect_range": 1.6, "effect_time": 2, "entity_filter": {"all_of": [{"test": "is_family", "subject": "other", "value": "player"}, {"test": "is_riding_self", "subject": "other"}]}}
      comps["minecraft:movement"] = {"value": 0.28}
      comps["minecraft:underwater_movement"] = {"value": 0.12}
      comps["minecraft:horse.jump_strength"] = {"value": 0.75}
      if "minecraft:behavior.float" in comps:
        comps["minecraft:behavior.float"]["time_under_water_to_dismount_passengers"] = 999999.0
    elif ent == "strider.json":
      comps["minecraft:mob_effect"] = {"mob_effect": "fire_resistance", "ambient": True, "effect_range": 1.6, "effect_time": 2, "entity_filter": {"all_of": [{"test": "is_family", "subject": "other", "value": "player"}, {"test": "is_riding_self", "subject": "other"}]}}
    elif ent == "pig.json":
      if "minecraft:pig_saddled" in cgs:
        cgs["minecraft:pig_saddled"]["minecraft:movement"] = {"value": 0.35}
        if "minecraft:boostable" in cgs["minecraft:pig_saddled"]:
          cgs["minecraft:pig_saddled"]["minecraft:boostable"]["speed_multiplier"] = 1.7
          cgs["minecraft:pig_saddled"]["minecraft:boostable"]["duration"] = 5.0
    elif ent == "wolf.json":
      desc = data.get("minecraft:entity", {}).get("description", {})
      if "animations" not in desc: desc["animations"] = {}
      desc["animations"]["sitting_tracker"] = "controller.animation.wolf.sitting_tracker"
      if "scripts" not in desc: desc["scripts"] = {}
      if "animate" not in desc["scripts"]: desc["scripts"]["animate"] = []
      if "sitting_tracker" not in desc["scripts"]["animate"]:
        desc["scripts"]["animate"].append("sitting_tracker")
    out_path = os.path.join(BP_DIR, "entities", ent)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f: json.dump(data, f, indent=2)
def build_loot_tables():
  print("Building loot tables...")
  out_path = os.path.join(BP_DIR, "loot_tables", "chests", "ancient_city.json")
  os.makedirs(os.path.dirname(out_path), exist_ok=True)
  with open(out_path, "w", encoding="utf-8") as f: json.dump({'pools': [{'rolls': {'min': 2, 'max': 6}, 'entries': [{'type': 'item', 'name': 'minecraft:iron_ingot', 'functions': [{'function': 'set_count', 'count': {'min': 1, 'max': 5}}], 'weight': 20}, {'type': 'item', 'name': 'minecraft:arrow', 'functions': [{'function': 'set_count', 'count': {'min': 5, 'max': 15}}], 'weight': 25}, {'type': 'item', 'name': 'minecraft:bread', 'functions': [{'function': 'set_count', 'count': {'min': 2, 'max': 6}}], 'weight': 20}, {'type': 'item', 'name': 'minecraft:golden_apple', 'weight': 5}, {'type': 'item', 'name': 'minecraft:bone', 'functions': [{'function': 'set_count', 'count': {'min': 4, 'max': 6}}], 'weight': 30}]}]}, f, indent=2)
  out_path = os.path.join(BP_DIR, "loot_tables", "chests", "ancient_city_ice_box.json")
  os.makedirs(os.path.dirname(out_path), exist_ok=True)
  with open(out_path, "w", encoding="utf-8") as f: json.dump({'pools': [{'rolls': {'min': 2, 'max': 6}, 'entries': [{'type': 'item', 'name': 'minecraft:iron_ingot', 'functions': [{'function': 'set_count', 'count': {'min': 1, 'max': 5}}], 'weight': 20}, {'type': 'item', 'name': 'minecraft:arrow', 'functions': [{'function': 'set_count', 'count': {'min': 5, 'max': 15}}], 'weight': 25}, {'type': 'item', 'name': 'minecraft:bread', 'functions': [{'function': 'set_count', 'count': {'min': 2, 'max': 6}}], 'weight': 20}, {'type': 'item', 'name': 'minecraft:golden_apple', 'weight': 5}, {'type': 'item', 'name': 'minecraft:bone', 'functions': [{'function': 'set_count', 'count': {'min': 4, 'max': 6}}], 'weight': 30}]}]}, f, indent=2)
  out_path = os.path.join(BP_DIR, "loot_tables", "chests", "bastion_other.json")
  os.makedirs(os.path.dirname(out_path), exist_ok=True)
  with open(out_path, "w", encoding="utf-8") as f: json.dump({'pools': [{'rolls': {'min': 2, 'max': 6}, 'entries': [{'type': 'item', 'name': 'minecraft:iron_ingot', 'functions': [{'function': 'set_count', 'count': {'min': 1, 'max': 5}}], 'weight': 20}, {'type': 'item', 'name': 'minecraft:arrow', 'functions': [{'function': 'set_count', 'count': {'min': 5, 'max': 15}}], 'weight': 25}, {'type': 'item', 'name': 'minecraft:bread', 'functions': [{'function': 'set_count', 'count': {'min': 2, 'max': 6}}], 'weight': 20}, {'type': 'item', 'name': 'minecraft:golden_apple', 'weight': 5}, {'type': 'item', 'name': 'minecraft:bone', 'functions': [{'function': 'set_count', 'count': {'min': 4, 'max': 6}}], 'weight': 30}]}]}, f, indent=2)
  out_path = os.path.join(BP_DIR, "loot_tables", "chests", "bastion_treasure.json")
  os.makedirs(os.path.dirname(out_path), exist_ok=True)
  with open(out_path, "w", encoding="utf-8") as f: json.dump({'pools': [{'rolls': {'min': 2, 'max': 6}, 'entries': [{'type': 'item', 'name': 'minecraft:iron_ingot', 'functions': [{'function': 'set_count', 'count': {'min': 1, 'max': 5}}], 'weight': 20}, {'type': 'item', 'name': 'minecraft:arrow', 'functions': [{'function': 'set_count', 'count': {'min': 5, 'max': 15}}], 'weight': 25}, {'type': 'item', 'name': 'minecraft:bread', 'functions': [{'function': 'set_count', 'count': {'min': 2, 'max': 6}}], 'weight': 20}, {'type': 'item', 'name': 'minecraft:golden_apple', 'weight': 5}, {'type': 'item', 'name': 'minecraft:bone', 'functions': [{'function': 'set_count', 'count': {'min': 4, 'max': 6}}], 'weight': 30}]}]}, f, indent=2)
  out_path = os.path.join(BP_DIR, "loot_tables", "chests", "desert_pyramid.json")
  os.makedirs(os.path.dirname(out_path), exist_ok=True)
  with open(out_path, "w", encoding="utf-8") as f: json.dump({'pools': [{'rolls': {'min': 2, 'max': 6}, 'entries': [{'type': 'item', 'name': 'minecraft:iron_ingot', 'functions': [{'function': 'set_count', 'count': {'min': 1, 'max': 5}}], 'weight': 20}, {'type': 'item', 'name': 'minecraft:arrow', 'functions': [{'function': 'set_count', 'count': {'min': 5, 'max': 15}}], 'weight': 25}, {'type': 'item', 'name': 'minecraft:bread', 'functions': [{'function': 'set_count', 'count': {'min': 2, 'max': 6}}], 'weight': 20}, {'type': 'item', 'name': 'minecraft:golden_apple', 'weight': 5}, {'type': 'item', 'name': 'minecraft:rotten_flesh', 'functions': [{'function': 'set_count', 'count': {'min': 3, 'max': 7}}], 'weight': 30}]}]}, f, indent=2)
  out_path = os.path.join(BP_DIR, "loot_tables", "chests", "jungle_temple.json")
  os.makedirs(os.path.dirname(out_path), exist_ok=True)
  with open(out_path, "w", encoding="utf-8") as f: json.dump({'pools': [{'rolls': {'min': 2, 'max': 6}, 'entries': [{'type': 'item', 'name': 'minecraft:iron_ingot', 'functions': [{'function': 'set_count', 'count': {'min': 1, 'max': 5}}], 'weight': 20}, {'type': 'item', 'name': 'minecraft:arrow', 'functions': [{'function': 'set_count', 'count': {'min': 5, 'max': 15}}], 'weight': 25}, {'type': 'item', 'name': 'minecraft:bread', 'functions': [{'function': 'set_count', 'count': {'min': 2, 'max': 6}}], 'weight': 20}, {'type': 'item', 'name': 'minecraft:golden_apple', 'weight': 5}, {'type': 'item', 'name': 'minecraft:bone', 'functions': [{'function': 'set_count', 'count': {'min': 4, 'max': 6}}], 'weight': 30}]}]}, f, indent=2)
  out_path = os.path.join(BP_DIR, "loot_tables", "entities", "wither_boss.json")
  os.makedirs(os.path.dirname(out_path), exist_ok=True)
  with open(out_path, "w", encoding="utf-8") as f: json.dump({'pools': [{'rolls': 1, 'entries': [{'type': 'item', 'name': 'minecraft:nether_star', 'weight': 1}]}, {'rolls': 1, 'entries': [{'type': 'item', 'name': 'minecraft:bone_block', 'weight': 1}]}, {'rolls': 1, 'conditions': [{'condition': 'random_chance', 'chance': 0.5}], 'entries': [{'type': 'item', 'name': 'minecraft:ominous_bottle', 'weight': 1, 'functions': [{'function': 'set_data', 'data': {'min': 2, 'max': 4}}]}]}]}, f, indent=2)
def build_trades():
  print("Building trades...")
  source_path = os.path.join(PROJECT_DIR, "Docs", "bedrock-samples-v1.26.50.4-full", "behavior_pack", "trading", "armorer_trades.json")
  if os.path.exists(source_path):
    with open(source_path, "r", encoding="utf-8") as f: data = json.loads(strip_json_comments(f.read()))
    if 4 < len(data["tiers"]):
      data["tiers"][4] = {'trades': [{'wants': [{'item': 'minecraft:emerald', 'quantity': 32}, {'item': 'minecraft:heavy_core', 'quantity': 1}], 'gives': [{'item': 'minecraft:diamond_chestplate', 'quantity': 1, 'functions': [{'function': 'enchant_randomly'}]}]}, {'wants': [{'item': 'minecraft:emerald', 'quantity': 32}, {'item': 'minecraft:heavy_core', 'quantity': 1}], 'gives': [{'item': 'minecraft:diamond_chestplate', 'quantity': 1, 'functions': [{'function': 'enchant_randomly'}]}]}]}
    else:
      data["tiers"].append({'trades': [{'wants': [{'item': 'minecraft:emerald', 'quantity': 32}, {'item': 'minecraft:heavy_core', 'quantity': 1}], 'gives': [{'item': 'minecraft:diamond_chestplate', 'quantity': 1, 'functions': [{'function': 'enchant_randomly'}]}]}, {'wants': [{'item': 'minecraft:emerald', 'quantity': 32}, {'item': 'minecraft:heavy_core', 'quantity': 1}], 'gives': [{'item': 'minecraft:diamond_chestplate', 'quantity': 1, 'functions': [{'function': 'enchant_randomly'}]}]}]})
    out_path = os.path.join(BP_DIR, "trading", "armorer_trades.json")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f: json.dump(data, f, indent=2)
  source_path = os.path.join(PROJECT_DIR, "Docs", "bedrock-samples-v1.26.50.4-full", "behavior_pack", "trading", "cleric_trades.json")
  if os.path.exists(source_path):
    with open(source_path, "r", encoding="utf-8") as f: data = json.loads(strip_json_comments(f.read()))
    if 3 < len(data["tiers"]):
      data["tiers"][3] = {'groups': [{'num_to_select': -1, 'trades': [{'wants': [{'choice': [{'quantity': {'min': 3, 'max': 11}, 'item': 'minecraft:emerald', 'functions': []}]}], 'gives': [{'choice': [{'item': 'minecraft:experience_bottle', 'functions': []}]}]}, {'wants': [{'item': 'minecraft:emerald', 'quantity': 16}, {'item': 'minecraft:ominous_bottle', 'quantity': 1}], 'gives': [{'item': 'minecraft:slime_ball', 'quantity': 12}]}]}], 'total_exp_required': 3}
    else:
      data["tiers"].append({'groups': [{'num_to_select': -1, 'trades': [{'wants': [{'choice': [{'quantity': {'min': 3, 'max': 11}, 'item': 'minecraft:emerald', 'functions': []}]}], 'gives': [{'choice': [{'item': 'minecraft:experience_bottle', 'functions': []}]}]}, {'wants': [{'item': 'minecraft:emerald', 'quantity': 16}, {'item': 'minecraft:ominous_bottle', 'quantity': 1}], 'gives': [{'item': 'minecraft:slime_ball', 'quantity': 12}]}]}], 'total_exp_required': 3})
    out_path = os.path.join(BP_DIR, "trading", "cleric_trades.json")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f: json.dump(data, f, indent=2)
  source_path = os.path.join(PROJECT_DIR, "Docs", "bedrock-samples-v1.26.50.4-full", "behavior_pack", "trading", "farmer_trades.json")
  if os.path.exists(source_path):
    with open(source_path, "r", encoding="utf-8") as f: data = json.loads(strip_json_comments(f.read()))
    if 0 < len(data["tiers"]):
      data["tiers"][0] = {'groups': [{'num_to_select': -1, 'trades': [{'wants': [{'choice': [{'quantity': {'min': 18, 'max': 22}, 'item': 'minecraft:wheat', 'functions': []}]}], 'gives': [{'choice': [{'item': 'minecraft:emerald', 'functions': []}]}]}, {'wants': [{'choice': [{'quantity': {'min': 15, 'max': 19}, 'item': 'minecraft:potato', 'functions': []}]}], 'gives': [{'choice': [{'item': 'minecraft:emerald', 'functions': []}]}]}, {'wants': [{'choice': [{'quantity': {'min': 15, 'max': 19}, 'item': 'minecraft:carrot', 'functions': []}]}], 'gives': [{'choice': [{'item': 'minecraft:emerald', 'functions': []}]}]}, {'wants': [{'choice': [{'item': 'minecraft:emerald', 'functions': []}]}], 'gives': [{'choice': [{'quantity': {'min': 2, 'max': 4}, 'item': 'minecraft:bread', 'functions': []}]}]}]}, {'num_to_select': -1, 'trades': [{'wants': [{'item': 'minecraft:wheat', 'quantity': 64}], 'gives': [{'item': 'minecraft:emerald', 'quantity': 1}]}]}], 'total_exp_required': 0}
    else:
      data["tiers"].append({'groups': [{'num_to_select': -1, 'trades': [{'wants': [{'choice': [{'quantity': {'min': 18, 'max': 22}, 'item': 'minecraft:wheat', 'functions': []}]}], 'gives': [{'choice': [{'item': 'minecraft:emerald', 'functions': []}]}]}, {'wants': [{'choice': [{'quantity': {'min': 15, 'max': 19}, 'item': 'minecraft:potato', 'functions': []}]}], 'gives': [{'choice': [{'item': 'minecraft:emerald', 'functions': []}]}]}, {'wants': [{'choice': [{'quantity': {'min': 15, 'max': 19}, 'item': 'minecraft:carrot', 'functions': []}]}], 'gives': [{'choice': [{'item': 'minecraft:emerald', 'functions': []}]}]}, {'wants': [{'choice': [{'item': 'minecraft:emerald', 'functions': []}]}], 'gives': [{'choice': [{'quantity': {'min': 2, 'max': 4}, 'item': 'minecraft:bread', 'functions': []}]}]}]}, {'num_to_select': -1, 'trades': [{'wants': [{'item': 'minecraft:wheat', 'quantity': 64}], 'gives': [{'item': 'minecraft:emerald', 'quantity': 1}]}]}], 'total_exp_required': 0})
    out_path = os.path.join(BP_DIR, "trading", "farmer_trades.json")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f: json.dump(data, f, indent=2)
  source_path = os.path.join(PROJECT_DIR, "Docs", "bedrock-samples-v1.26.50.4-full", "behavior_pack", "trading", "fletcher_trades.json")
  if os.path.exists(source_path):
    with open(source_path, "r", encoding="utf-8") as f: data = json.loads(strip_json_comments(f.read()))
    if 1 < len(data["tiers"]):
      data["tiers"][1] = {'groups': [{'num_to_select': -1, 'trades': [{'wants': [{'choice': [{'quantity': {'min': 10, 'max': 10}, 'item': 'minecraft:gravel', 'functions': []}]}, {'choice': [{'item': 'minecraft:emerald', 'functions': []}]}], 'gives': [{'choice': [{'quantity': {'min': 6, 'max': 10}, 'item': 'minecraft:flint', 'functions': []}]}]}, {'wants': [{'choice': [{'quantity': {'min': 2, 'max': 3}, 'item': 'minecraft:emerald', 'functions': []}]}], 'gives': [{'choice': [{'item': 'minecraft:bow', 'functions': []}]}]}]}, {'num_to_select': -1, 'trades': [{'wants': [{'item': 'minecraft:emerald', 'quantity': 12}, {'item': 'minecraft:phantom_membrane', 'quantity': 1}], 'gives': [{'item': 'minecraft:arrow', 'quantity': 64, 'functions': [{'function': 'set_data', 'data': 17}]}]}]}], 'total_exp_required': 1}
    else:
      data["tiers"].append({'groups': [{'num_to_select': -1, 'trades': [{'wants': [{'choice': [{'quantity': {'min': 10, 'max': 10}, 'item': 'minecraft:gravel', 'functions': []}]}, {'choice': [{'item': 'minecraft:emerald', 'functions': []}]}], 'gives': [{'choice': [{'quantity': {'min': 6, 'max': 10}, 'item': 'minecraft:flint', 'functions': []}]}]}, {'wants': [{'choice': [{'quantity': {'min': 2, 'max': 3}, 'item': 'minecraft:emerald', 'functions': []}]}], 'gives': [{'choice': [{'item': 'minecraft:bow', 'functions': []}]}]}]}, {'num_to_select': -1, 'trades': [{'wants': [{'item': 'minecraft:emerald', 'quantity': 12}, {'item': 'minecraft:phantom_membrane', 'quantity': 1}], 'gives': [{'item': 'minecraft:arrow', 'quantity': 64, 'functions': [{'function': 'set_data', 'data': 17}]}]}]}], 'total_exp_required': 1})
    out_path = os.path.join(BP_DIR, "trading", "fletcher_trades.json")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f: json.dump(data, f, indent=2)
  source_path = os.path.join(PROJECT_DIR, "Docs", "bedrock-samples-v1.26.50.4-full", "behavior_pack", "trading", "librarian_trades.json")
  if os.path.exists(source_path):
    with open(source_path, "r", encoding="utf-8") as f: data = json.loads(strip_json_comments(f.read()))
    if 4 < len(data["tiers"]):
      data["tiers"][4] = {'trades': [{'wants': [{'item': 'minecraft:emerald', 'quantity': {'min': 5, 'max': 64}}, {'item': 'minecraft:book', 'quantity': 1}], 'gives': [{'item': 'minecraft:enchanted_book', 'functions': [{'function': 'enchant_book_for_trading', 'base_cost': 2, 'base_random_cost': 5, 'per_level_random_cost': 10, 'per_level_cost': 3}]}]}, {'wants': [{'item': 'minecraft:emerald', 'quantity': 24}, {'item': 'minecraft:trial_key', 'quantity': 1}], 'gives': [{'item': 'minecraft:enchanted_book', 'quantity': 1, 'functions': [{'function': 'specific_enchants', 'enchants': ['mending']}]}]}]}
    else:
      data["tiers"].append({'trades': [{'wants': [{'item': 'minecraft:emerald', 'quantity': {'min': 5, 'max': 64}}, {'item': 'minecraft:book', 'quantity': 1}], 'gives': [{'item': 'minecraft:enchanted_book', 'functions': [{'function': 'enchant_book_for_trading', 'base_cost': 2, 'base_random_cost': 5, 'per_level_random_cost': 10, 'per_level_cost': 3}]}]}, {'wants': [{'item': 'minecraft:emerald', 'quantity': 24}, {'item': 'minecraft:trial_key', 'quantity': 1}], 'gives': [{'item': 'minecraft:enchanted_book', 'quantity': 1, 'functions': [{'function': 'specific_enchants', 'enchants': ['mending']}]}]}]})
    out_path = os.path.join(BP_DIR, "trading", "librarian_trades.json")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f: json.dump(data, f, indent=2)
  source_path = os.path.join(PROJECT_DIR, "Docs", "bedrock-samples-v1.26.50.4-full", "behavior_pack", "trading", "stone_mason_trades.json")
  if os.path.exists(source_path):
    with open(source_path, "r", encoding="utf-8") as f: data = json.loads(strip_json_comments(f.read()))
    if 2 < len(data["tiers"]):
      data["tiers"][2] = {'groups': [{'num_to_select': -1, 'trades': [{'wants': [{'choice': [{'quantity': {'min': 16, 'max': 21}, 'item': 'minecraft:stone:1', 'functions': []}]}], 'gives': [{'choice': [{'item': 'minecraft:emerald', 'functions': []}]}]}, {'wants': [{'choice': [{'quantity': {'min': 16, 'max': 21}, 'item': 'minecraft:stone:5', 'functions': []}]}], 'gives': [{'choice': [{'item': 'minecraft:emerald', 'functions': []}]}]}, {'wants': [{'choice': [{'quantity': {'min': 16, 'max': 21}, 'item': 'minecraft:stone:3', 'functions': []}]}], 'gives': [{'choice': [{'item': 'minecraft:emerald', 'functions': []}]}]}, {'wants': [{'choice': [{'quantity': {'max': 2}, 'item': 'minecraft:emerald', 'functions': []}]}], 'gives': [{'choice': [{'quantity': {'min': 4, 'max': 4}, 'item': 'minecraft:stone:2', 'functions': []}]}]}, {'wants': [{'choice': [{'quantity': {'max': 2}, 'item': 'minecraft:emerald', 'functions': []}]}], 'gives': [{'choice': [{'quantity': {'min': 4, 'max': 4}, 'item': 'minecraft:stone:6', 'functions': []}]}]}, {'wants': [{'choice': [{'quantity': {'max': 2}, 'item': 'minecraft:emerald', 'functions': []}]}], 'gives': [{'choice': [{'quantity': {'min': 4, 'max': 4}, 'item': 'minecraft:stone:4', 'functions': []}]}]}]}], 'total_exp_required': 2, 'trades': [{'wants': [{'item': 'minecraft:echo_shard', 'quantity': 1}], 'gives': [{'item': 'minecraft:quartz_block', 'quantity': 64, 'functions': [{'function': 'set_data', 'data': 1}]}]}]}
    else:
      data["tiers"].append({'groups': [{'num_to_select': -1, 'trades': [{'wants': [{'choice': [{'quantity': {'min': 16, 'max': 21}, 'item': 'minecraft:stone:1', 'functions': []}]}], 'gives': [{'choice': [{'item': 'minecraft:emerald', 'functions': []}]}]}, {'wants': [{'choice': [{'quantity': {'min': 16, 'max': 21}, 'item': 'minecraft:stone:5', 'functions': []}]}], 'gives': [{'choice': [{'item': 'minecraft:emerald', 'functions': []}]}]}, {'wants': [{'choice': [{'quantity': {'min': 16, 'max': 21}, 'item': 'minecraft:stone:3', 'functions': []}]}], 'gives': [{'choice': [{'item': 'minecraft:emerald', 'functions': []}]}]}, {'wants': [{'choice': [{'quantity': {'max': 2}, 'item': 'minecraft:emerald', 'functions': []}]}], 'gives': [{'choice': [{'quantity': {'min': 4, 'max': 4}, 'item': 'minecraft:stone:2', 'functions': []}]}]}, {'wants': [{'choice': [{'quantity': {'max': 2}, 'item': 'minecraft:emerald', 'functions': []}]}], 'gives': [{'choice': [{'quantity': {'min': 4, 'max': 4}, 'item': 'minecraft:stone:6', 'functions': []}]}]}, {'wants': [{'choice': [{'quantity': {'max': 2}, 'item': 'minecraft:emerald', 'functions': []}]}], 'gives': [{'choice': [{'quantity': {'min': 4, 'max': 4}, 'item': 'minecraft:stone:4', 'functions': []}]}]}]}], 'total_exp_required': 2, 'trades': [{'wants': [{'item': 'minecraft:echo_shard', 'quantity': 1}], 'gives': [{'item': 'minecraft:quartz_block', 'quantity': 64, 'functions': [{'function': 'set_data', 'data': 1}]}]}]})
    out_path = os.path.join(BP_DIR, "trading", "stone_mason_trades.json")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f: json.dump(data, f, indent=2)

if __name__ == '__main__':
  main()