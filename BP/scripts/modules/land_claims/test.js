import { world } from '@minecraft/server';
world.beforeEvents.entityHurt.subscribe((ev) => {
  const { hurtEntity } = ev;
  const fam = hurtEntity.getComponent('minecraft:type_family');
  if (fam) {
    world.sendMessage('Families for ' + hurtEntity.typeId + ': ' + fam.getTypeFamilies().join(', '));
  }
});