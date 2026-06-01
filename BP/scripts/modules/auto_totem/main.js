import { world, system, EquipmentSlot } from '@minecraft/server';
import { DS } from '../../core/ds.js';

const TOTEM = 'minecraft:totem_of_undying';
const LOW_HEALTH = 6;
const ALERT_TAG = 'ds:hp_alert';

system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    try {
      const health = player.getComponent('minecraft:health');
      if (!health || health.currentValue <= 0) {
        player.removeTag(ALERT_TAG);
        continue;
      }

      if (health.currentValue <= LOW_HEALTH) {
        const inv = player.getComponent('minecraft:inventory')?.container;
        const equip = player.getComponent('minecraft:equippable');

        if (!inv || !equip) continue;

        const offItem = equip.getEquipment(EquipmentSlot.Offhand);
        if (offItem?.typeId === TOTEM) {
          continue;
        }

        let totemSlot = -1;
        for (let i = 0; i < inv.size; i++) {
          const item = inv.getItem(i);
          if (item?.typeId === TOTEM) {
            totemSlot = i;
            break;
          }
        }

        if (totemSlot !== -1) {
          const totemItem = inv.getItem(totemSlot);

          if (offItem) {
            inv.setItem(totemSlot, offItem);
          } else {
            inv.setItem(totemSlot, undefined);
          }

          equip.setEquipment(EquipmentSlot.Offhand, totemItem);

          if (!player.hasTag(ALERT_TAG)) {
            player.playSound('mob.ghast.scream', { volume: 0.6, pitch: 0.8 });
            player.addTag(ALERT_TAG);
          }
        }

      } else {
        player.removeTag(ALERT_TAG);
      }

    } catch (e) {
      DS.log(`Auto-totem error: ${e}`);
    }
  }
}, 10);
