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
  { x: 0, y: 0, z: -1, prop: "32k:north", opposite: "32k:south" },
  { x: 0, y: 0, z: 1, prop: "32k:south", opposite: "32k:north" },
  { x: 1, y: 0, z: 0, prop: "32k:east", opposite: "32k:west" },
  { x: -1, y: 0, z: 0, prop: "32k:west", opposite: "32k:east" },
  { x: 0, y: 1, z: 0, prop: "32k:up", opposite: "32k:down" },
  { x: 0, y: -1, z: 0, prop: "32k:down", opposite: "32k:up" },
  { x: 1, y: 0, z: -1, prop: "32k:ne", opposite: "32k:sw" },
  { x: -1, y: 0, z: -1, prop: "32k:nw", opposite: "32k:se" },
  { x: 1, y: 0, z: 1, prop: "32k:se", opposite: "32k:nw" },
  { x: -1, y: 0, z: 1, prop: "32k:sw", opposite: "32k:ne" },
  { x: 0, y: 1, z: -1, prop: "32k:tn", opposite: "32k:bs" },
  { x: 0, y: -1, z: -1, prop: "32k:bn", opposite: "32k:ts" },
  { x: 0, y: 1, z: 1, prop: "32k:ts", opposite: "32k:bn" },
  { x: 0, y: -1, z: 1, prop: "32k:bs", opposite: "32k:tn" },
  { x: 1, y: 1, z: 0, prop: "32k:te", opposite: "32k:bw" },
  { x: 1, y: -1, z: 0, prop: "32k:be", opposite: "32k:tw" },
  { x: -1, y: 1, z: 0, prop: "32k:tw", opposite: "32k:be" },
  { x: -1, y: -1, z: 0, prop: "32k:bw", opposite: "32k:te" },
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
