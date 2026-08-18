export function BuildDropdownData(list, currentId, getName) {
  const data = list.map((item) => {
    const id = typeof item === "object" ? item.id : item;
    return {
      id: String(id).trim(),
      name: getName ? getName(id) : id,
    };
  });

  const active = String(currentId ?? "").trim();

  const selected = data.find((d) => d.id === active);

  const sorted = selected
    ? [selected, ...data.filter((d) => d.id !== active)]
    : data;

  return {
    names: sorted.map((d) => d.name),
    data: sorted,
  };
}

export const IdToPos = (id) => {
  const s = id.split(",");
  return { x: parseInt(s[0]), y: parseInt(s[1]), z: parseInt(s[2]) };
};

export const GetLocId = (p) => {
  return `${Math.floor(p.x)},${Math.floor(p.y)},${Math.floor(p.z)}`;
};

export function DisplayActionBar(player, data) {}

export const CONNECTION_OFFSETS = [
  { x: 0, y: 0, z: -1, prop: "ds:north", opposite: "ds:south" },
  { x: 0, y: 0, z: 1, prop: "ds:south", opposite: "ds:north" },
  { x: 1, y: 0, z: 0, prop: "ds:east", opposite: "ds:west" },
  { x: -1, y: 0, z: 0, prop: "ds:west", opposite: "ds:east" },
  { x: 0, y: 1, z: 0, prop: "ds:up", opposite: "ds:down" },
  { x: 0, y: -1, z: 0, prop: "ds:down", opposite: "ds:up" },
  { x: 1, y: 0, z: -1, prop: "ds:ne", opposite: "ds:sw" },
  { x: -1, y: 0, z: -1, prop: "ds:nw", opposite: "ds:se" },
  { x: 1, y: 0, z: 1, prop: "ds:se", opposite: "ds:nw" },
  { x: -1, y: 0, z: 1, prop: "ds:sw", opposite: "ds:ne" },
  { x: 0, y: 1, z: -1, prop: "ds:tn", opposite: "ds:bs" },
  { x: 0, y: -1, z: -1, prop: "ds:bn", opposite: "ds:ts" },
  { x: 0, y: 1, z: 1, prop: "ds:ts", opposite: "ds:bn" },
  { x: 0, y: -1, z: 1, prop: "ds:bs", opposite: "ds:tn" },
  { x: 1, y: 1, z: 0, prop: "ds:te", opposite: "ds:bw" },
  { x: 1, y: -1, z: 0, prop: "ds:be", opposite: "ds:tw" },
  { x: -1, y: 1, z: 0, prop: "ds:tw", opposite: "ds:be" },
  { x: -1, y: -1, z: 0, prop: "ds:bw", opposite: "ds:te" },
  { x: 1, y: 1, z: 1 },
  { x: 1, y: 1, z: -1 },
  { x: 1, y: -1, z: 1 },
  { x: 1, y: -1, z: -1 },
  { x: -1, y: 1, z: 1 },
  { x: -1, y: 1, z: -1 },
  { x: -1, y: -1, z: 1 },
  { x: -1, y: -1, z: -1 },
];

export function HasItem(player, itemTypeId) {
  if (!player?.isValid) return false;

  const inventory = player.getComponent("minecraft:inventory");
  if (!inventory?.container) return false;

  const container = inventory.container;

  for (let i = 0; i < container.size; i++) {
    const item = container.getItem(i);
    if (item && item.typeId === itemTypeId) {
      return true;
    }
  }
  return false;
}
