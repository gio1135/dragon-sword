import { EquipmentSlot } from '@minecraft/server';
import { IsBlockAllowed, CheckHunger } from './../requirements.js';

export function CheckModeActive(player) {
  return player.isSneaking;
}

export function ValidateMining(player, targetTypeId) {
  if (player.hasTag('ds:disable_veinminer')) return false;
  if (!IsBlockAllowed(player, targetTypeId)) return false;
  if (!CheckHunger(player)) return false;
  return true;
}