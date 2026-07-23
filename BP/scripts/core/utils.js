
import { Dimension, Vector3 } from "@minecraft/server";

export const Utils = {

findSafeLocation(dimension, centerLocation) {
 const radius = 3;

 for (let x = -radius; x <= radius; x++) {
 for (let z = -radius; z <= radius; z++) {
  if (x === 0 && z === 0) continue;

  const targetBase = {
  x: Math.floor(centerLocation.x) + x,
  y: Math.floor(centerLocation.y),
  z: Math.floor(centerLocation.z)
  };

  for (let yOffset = -2; yOffset <= 2; yOffset++) {
  const checkPos = { x: targetBase.x, y: targetBase.y + yOffset, z: targetBase.z };

  try {
   const block = dimension.getBlock(checkPos);
   if (!block) continue;

   if (block.isAir ||
   block.typeId.includes("portal") ||
   block.typeId.includes("lava") ||
   block.typeId.includes("fire")) {
   continue;
   }

   const above1 = block.above(1);
   const above2 = block.above(2);

   if (above1 && above1.isAir && above2 && above2.isAir) {
   return {
    x: checkPos.x + 0.5,
    y: checkPos.y + 1,
    z: checkPos.z + 0.5
   };
   }
  } catch (e) {
   continue;
  }
  }
 }
 }

 return {
 x: centerLocation.x + 3,
 y: centerLocation.y,
 z: centerLocation.z + 3
 };
}
};