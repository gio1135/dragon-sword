import { EquipmentSlot } from "@minecraft/server";
import { IsBlockAllowed } from "./../requirements.js";

export function CheckModeActive(player) {
  return player.isSneaking;
}

export function ValidateMining(player, targetTypeId) {
  if (player.hasTag("ds:disable_veinminer")) return false;
  if (!IsBlockAllowed(player, targetTypeId)) return false;
  return true;
}