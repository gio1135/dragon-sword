import { world, system } from '@minecraft/server';
import { DS } from '../../core/ds.js';
import { ClaimManager } from './manager.js';
import { PermissionTypes, PlayerPermissions, Claim } from './classes/data_model.js';
import { PermissionRegistry } from './classes/permission_registry.js';

/**
 * UI System for Claims
 */
export class ClaimUI {
  static openMainMenu(player, targetData = null) {
    const pd = targetData || ClaimManager.getOrCreatePlayer(player);
    pd.viewingClaim = false;

    // Admin View Context
    const title = targetData ? `Manage: §e${targetData.name}'s§r claims` : 'Land claims';

    if (pd.claims.length === 0) {
      const emptyMsg = targetData
        ? `${targetData.name} has §e0§r claims.\n§6Claim blocks: §e${pd.claimBlocks.amount}`
        : `You have §e0§r claims.\n§6Claim blocks: §e${pd.claimBlocks.amount}\n\n§7To create a claim, hold a golden shovel and break a block in the first corner, then crouch and break a block in the opposite corner`;

      DS.ui.action(title)
        .body(emptyMsg)
        .show(player).then(res => {
          if (res.canceled && targetData) this.openOpPlayerManageMenu(player, targetData);
        });
      return;
    }

    const hourly = ClaimManager.settings.hourlyClaimBlockPayment;
    let desc = `§6Claim blocks: §e${pd.claimBlocks.amount}`;

    if (hourly > 0) {
      // Time Remaining
      const now = Date.now();
      const diff = now - pd.lastClaimBlockPayment;
      const remainingMs = 3600000 - diff;
      const remainingMins = Math.ceil(remainingMs / 60000);

      if (remainingMins > 0) {
        desc += `\n§7Next payment in: §e${remainingMins}m`;
      } else {
        desc += `\n§aPayment due soon`;
      }
    }

    const form = DS.ui.action(title, desc);

    for (const claim of pd.claims) {
      if (!claim || !claim.start || !claim.end) continue;
      const dx = Math.abs(claim.start.x - claim.end.x) + 1;
      const dz = Math.abs(claim.start.z - claim.end.z) + 1;
      const area = dx * dz;

      form.button(`${claim.name}§r\n${area} blocks`, () => {
        this.openClaimDetails(player, claim, targetData);
      });
    }

    form.show(player).then(res => {
      if (res.canceled && targetData) this.openOpPlayerManageMenu(player, targetData);
    });
  }

  // Dashboard
  static openClaimDetails(player, claim, targetData = null) {
    const dx = Math.abs(claim.start.x - claim.end.x) + 1;
    const dz = Math.abs(claim.start.z - claim.end.z) + 1;
    const area = dx * dz;

    DS.ui.action(claim.name, `§6Area: §e${area} §6blocks §7(${dx}x${dz})`)
      .button('Config', () => this.openConfig(player, claim, targetData))
      .button('Global permissions', () => this.openGlobalPermissions(player, claim, targetData))
      .button('Player permissions', () => this.openPlayerList(player, claim, targetData))
      .button('Reset permissions', () => this.resetPermissions(player, claim, targetData))
      .button('Delete claim', () => this.deleteClaim(player, claim, targetData))
      .show(player).then(res => {
        if (res.canceled) this.openMainMenu(player, targetData);
      });
  }

  // Config
  static openConfig(player, claim, targetData = null) {
    DS.ui.modal('Config')
      .textField('Claim name', 'Enter claim name', claim.name)
      .toggle('Show particles', claim.particlesEnabled)
      .submit(response => {
        if (response.canceled) {
          this.openClaimDetails(player, claim, targetData);
          return;
        }
        const [newName, showParticles] = response.formValues;

        if (claim.name !== newName && newName.trim() !== '') {
          claim.name = newName;
          player.sendMessage(`§aRenamed to §f${claim.name}`);
        }
        claim.particlesEnabled = showParticles;
        ClaimManager.save();
        player.sendMessage('§aConfig updated');
        this.openClaimDetails(player, claim, targetData);
      })
      .show(player);
  }

  // Global Permissions
  static openGlobalPermissions(player, claim, targetData = null) {
    const form = DS.ui.modal('Global permissions');

    const permissions = PermissionRegistry.getAll();
    for (const perm of permissions) {
      form.toggle(perm.label, claim.permissions.get(perm.key));
    }

    form.submit(response => {
      if (response.canceled) {
        this.openClaimDetails(player, claim, targetData);
        return;
      }

      const formValues = response.formValues;
      for (let i = 0; i < permissions.length; i++) {
        const perm = permissions[i];
        claim.permissions.set(perm.key, formValues[i]);
      }

      ClaimManager.save();
      player.sendMessage('§aGlobal permissions updated');
      this.openClaimDetails(player, claim, targetData);
    });

    form.show(player);
  }

  // Player Permissions List
  static openPlayerList(player, claim, targetData = null) {
    const form = DS.ui.action('Player permissions');

    // Get All Known Players
    let rawPlayers = ClaimManager.database;

    // Strict Deduplication by Name (Prioritizing lastSeen)
    const nameMap = new Map();
    for (const p of rawPlayers) {
      const existing = nameMap.get(p.name);
      if (!existing) {
        nameMap.set(p.name, p);
      } else {
        // If current p is newer, replace
        if ((p.lastSeen || 0) > (existing.lastSeen || 0)) {
          nameMap.set(p.name, p);
        }
      }
    }
    let allPlayers = Array.from(nameMap.values());

    const ownerId = targetData ? targetData.id : player.id;
    allPlayers = allPlayers.filter(p => p.id !== ownerId);

    // Sort Alphabetical
    allPlayers.sort((a, b) => a.name.localeCompare(b.name));

    for (const pData of allPlayers) {
      form.button(pData.name, () => {
        let pp = claim.playerPermissionsList.find(pp => pp.id === pData.id);
        if (!pp) {
          pp = new PlayerPermissions(pData.id, pData.name);
          claim.addPlayerPermissions(pp);
          ClaimManager.save();
        }
        this.openPlayerSpecificPermissions(player, claim, pp, targetData);
      });
    }

    form.show(player).then(res => {
      if (res.canceled) this.openClaimDetails(player, claim, targetData);
    });
  }

  // Specific Player Permissions
  static openPlayerSpecificPermissions(player, claim, pp, targetData = null) {
    const form = DS.ui.modal(pp.name + ' permissions');

    const permissions = PermissionRegistry.getAll();
    for (const perm of permissions) {
      if (perm.globalOnly) continue;
      form.toggle(perm.label, pp.get(perm.key));
    }

    // Add "Remove player" toggle at bottom
    const isTrusted = claim.playerPermissionsList.some(p => p.id === pp.id);
    form.toggle('Remove player', !isTrusted);

    form.submit(response => {
      if (response.canceled) {
        this.openPlayerList(player, claim, targetData);
        return;
      }

      const formValues = response.formValues;

      // Check Remove
      const isRemove = formValues[formValues.length - 1]; // Last toggle
      if (isRemove) {
        claim.removePlayerPermissions(pp.id);
        ClaimManager.save();
        player.sendMessage(`§aRemoved §f${pp.name}`);
        this.openPlayerList(player, claim, targetData);
        return;
      }

      // Update Values
      for (let i = 0; i < permissions.length; i++) {
        const perm = permissions[i];
        pp.set(perm.key, formValues[i]);
      }

      ClaimManager.save();
      player.sendMessage(`§aUpdated §f${pp.name}`);
      this.openPlayerList(player, claim, targetData);
    });

    form.show(player);
  }


  static resetPermissions(player, claim, targetData = null) {
    DS.ui.message('Reset permissions?', 'This will reset global permissions to defaults AND remove all trusted players.')
      .button('Confirm', () => {
        // Reset Global
        const permissions = PermissionRegistry.getAll();
        for (const perm of permissions) {
          claim.permissions.set(perm.key, perm.defaultValue);
        }
        // Clear Trusted Players
        claim.playerPermissionsList = [];

        ClaimManager.save();
        player.sendMessage('§aPermissions reset');
        this.openClaimDetails(player, claim, targetData);
      })
      .button('Cancel', () => this.openClaimDetails(player, claim, targetData))
      .show(player).then(res => {
         if (res.canceled) this.openClaimDetails(player, claim, targetData);
      });
  }

  static deleteClaim(player, claim, targetData = null) {
    DS.ui.message('Delete ' + claim.name + '?', 'This action cannot be undone')
      .button('Confirm delete', () => {
        // Use targetData if provided, otherwise viewer's data
        const pd = targetData || ClaimManager.getOrCreatePlayer(player);
        pd.removeClaim(claim);

        const dx = Math.abs(claim.start.x - claim.end.x) + 1;
        const dz = Math.abs(claim.start.z - claim.end.z) + 1;
        pd.claimBlocks.amount += (dx * dz);

        ClaimManager.save();
        player.sendMessage('§cClaim deleted');
        this.openMainMenu(player, targetData);
      })
      .button('Cancel', () => {
        this.openClaimDetails(player, claim, targetData);
      })
      .show(player).then(res => {
        if (res.canceled) this.openClaimDetails(player, claim, targetData);
      });
  }

  static openAdminMenu(player) {
    DS.ui.action('Land claim settings')
      .button('General settings', () => this.openAdminConfigMenu(player))
      .button('Disallowed blocks', () => this.openDisallowedBlocksMenu(player))
      .show(player).then(res => {
        if (res.canceled) DS.events.emit('ds:admin_open', { player });
      });
  }

  static openOpPlayerList(player) {
    const form = DS.ui.action('Manage players');

    // Get all known players
    const allPlayers = ClaimManager.database;
    allPlayers.sort((a, b) => a.name.localeCompare(b.name));

    for (const pData of allPlayers) {
      form.button(pData.name, () => {
        this.openOpPlayerManageMenu(player, pData);
      });
    }

    form.show(player).then(res => {
      if (res.canceled) DS.events.emit('ds:admin_open', { player });
    });
  }

  static openOpPlayerManageMenu(player, targetData) {
    let body = `ID: ${targetData.id}\n§6Claims: §e${targetData.claims.length}`;

    // Outlaw Info
    if (targetData.outlawStatus && targetData.outlawStatus.stage > 0) {
      body += `\n§cOutlaw: §f${targetData.outlawStatus.stage} stars (${targetData.outlawStatus.timeRemaining}m)`;
    }

    const form = DS.ui.action(`Manage: §e${targetData.name}`, body)
      .button('Manage claims', () => {
        this.openMainMenu(player, targetData);
      });

    // Outlaw Controls
    if (targetData.outlawStatus && targetData.outlawStatus.stage > 0) {
      form.button('Remove 1 Star', () => {
        targetData.outlawStatus.stage--;
        if (targetData.outlawStatus.stage <= 0) {
          targetData.outlawStatus.stage = 0;
          targetData.outlawStatus.timeRemaining = 0;
        } else {
          targetData.outlawStatus.timeRemaining = 60;
        }
        ClaimManager.save();

        // Feedback to victim
        const victim = world.getAllPlayers().find(p => p.id === targetData.id);
        if (victim) {
          const stars = targetData.outlawStatus.stage;
          if (stars > 0) {
            const starText = stars === 1 ? 'star' : 'stars';
            victim.sendMessage(`§aYou are at ${stars} ${starText}`);
            if (!victim.nameTag.startsWith('\u00A7c')) {
              victim.nameTag = '\u00A7c' + victim.name.replace(/\u00A7c/g, '');
            }
          } else {
            victim.sendMessage('§aYou are at 0 stars');
            victim.nameTag = victim.name;
          }
        }

        this.openOpPlayerManageMenu(player, targetData);
      });
    }

    form.button('Delete data', () => {
      DS.ui.message('Delete all data?', `This will remove all claims and permissions for ${targetData.name}.`)
        .button('Confirm delete', () => {
          // Remove from manager
          ClaimManager.deletePlayer(targetData.id);
          player.sendMessage(`§aDeleted data for §f${targetData.name}`);
          this.openOpPlayerList(player);
        })
        .button('Cancel', () => this.openOpPlayerManageMenu(player, targetData))
        .show(player);
    })
      .show(player).then(res => {
        if (res.canceled) this.openOpPlayerList(player);
      });
  }

  static openAdminConfigMenu(player) {
    const settings = ClaimManager.settings;
    DS.ui.modal('General settings')
      .textField('Min claim size', 'Default: 8', settings.claimMinimumWidth.toString())
      .textField('Max claims per player', 'Default: 3', settings.maxClaimAmount.toString())
      .textField('Hourly claim blocks', 'Default: 100', settings.hourlyClaimBlockPayment.toString())
      .submit(response => {
        if (response.canceled) {
          this.openAdminMenu(player);
          return;
        }

        const [minSizeStr, maxClaimsStr, hourlyStr] = response.formValues;

        // Validate Integers
        const minSize = parseInt(minSizeStr);
        const maxClaims = parseInt(maxClaimsStr);
        const hourly = parseInt(hourlyStr);

        if (isNaN(minSize) || isNaN(maxClaims) || isNaN(hourly)) {
          player.sendMessage('§cInvalid values entered');
          return;
        }

        settings.claimMinimumWidth = minSize;
        settings.maxClaimAmount = maxClaims;
        settings.hourlyClaimBlockPayment = hourly;

        ClaimManager.save();
        player.sendMessage('§aSettings updated');
        this.openAdminMenu(player);
      })
      .show(player);
  }

  static openDisallowedBlocksMenu(player) {
    const settings = ClaimManager.settings;
    const list = settings.disallowedBlocks || [];

    const form = DS.ui.action('Disallowed blocks', 'Items/blocks that cannot be used in claims');

    form.button('Add block/item', () => this.openAddDisallowedBlockMenu(player));

    for (const id of list) {
      form.button(`${id}`, () => {
        DS.ui.message(`Remove ${id}?`, 'Allow this block/item in claims again?')
          .button('Remove', () => {
            settings.disallowedBlocks = list.filter(i => i !== id);
            ClaimManager.save();
            player.sendMessage(`§aRemoved §f${id}§a from disallowed list`);
            this.openDisallowedBlocksMenu(player);
          })
          .button('Cancel', () => this.openDisallowedBlocksMenu(player))
          .show(player);
      });
    }

    form.show(player).then(res => {
      if (res.canceled) this.openAdminMenu(player);
    });
  }

  static openAddDisallowedBlockMenu(player) {
    DS.ui.modal('Add disallowed block')
      .textField('Block/item ID', 'Ex: minecraft:tnt', '')
      .submit(response => {
        if (response.canceled) {
          this.openDisallowedBlocksMenu(player);
          return;
        }
        const [id] = response.formValues;

        if (!id || id.trim() === '') {
          player.sendMessage('§cInvalid ID');
          return;
        }

        // Check Duplicate
        if (!ClaimManager.settings.disallowedBlocks) ClaimManager.settings.disallowedBlocks = [];
        if (ClaimManager.settings.disallowedBlocks.includes(id)) {
          player.sendMessage('§cAlready allowed');
          return;
        }

        ClaimManager.settings.disallowedBlocks.push(id.trim());
        ClaimManager.save();
        player.sendMessage(`§aAdded §f${id}§a to disallowed list`);
        this.openDisallowedBlocksMenu(player);
      })
      .show(player);
  }
  static openNewClaimMenu(player, start, end, area) {
    DS.ui.modal('Name your claim')
      .textField('', 'Claim name', '')
      .toggle('Particles', true)
      .toggle('§cCreate as TestUser', false) 
      .submit(response => {
        if (response.canceled) {
          player.sendMessage('§7Claim creation canceled');
          return;
        }
        let [name, particles, isDebug] = response.formValues;

        if (isDebug) {
          // --- TestUser Logic ---
          const dummyName = 'TestUser';
          let dummyPD = ClaimManager.database.find(p => p.name === dummyName);
          
          if (!dummyPD) {
             dummyPD = {
                id: 'test_user_id',
                name: dummyName,
                claims: [],
                claimBlocks: { amount: 10000 },
                settings: {}
             };
             ClaimManager.database.push(dummyPD);
          }

          if (!name || name.trim().length === 0) name = 'TestZone';

          const newClaim = new Claim(name, start, end);
          newClaim.particlesEnabled = particles;
          
          dummyPD.claims.push(newClaim);
          ClaimManager.save();
          player.sendMessage(`§aClaim '§f${name}§a' created for TestUser`);
          player.playSound('random.orb');
          return;
        }

        // Default name if empty
        if (!name || name.trim().length === 0) name = `${player.name}'s Claim`;

        // Final Creation Logic
        const pd = ClaimManager.getOrCreatePlayer(player);

        // Re-validate cost just in case
        if (pd.claimBlocks.amount < area) {
          player.sendMessage(`§cNot enough claim blocks. Cost: §6${area}`);
          return;
        }

        const newClaim = new Claim(name, start, end);
        newClaim.particlesEnabled = particles;
        pd.claims.push(newClaim);
        pd.claimBlocks.amount -= area;
        ClaimManager.save();

        player.sendMessage(`§aClaim '§f${name}§a' created (§6${area}§a blocks)`);
        player.playSound('random.levelup');
      })
      .show(player);
  }

  static openResizeConfirmMenu(player, claimName, start, end, newArea, costDiff) {
    const pd = ClaimManager.getOrCreatePlayer(player);
    const costMsg = (costDiff > 0) ? `\n§6Cost: §c${costDiff} blocks` : `\n§6Refund: §a${Math.abs(costDiff)} blocks`;

    DS.ui.message(`Resize '§f${claimName}'?`, `§6New Area: §e${newArea} blocks${costMsg}`)
      .button('Confirm resize', () => {
        const claim = pd.claims.find(c => c.name === claimName);
        if (!claim) {
          player.sendMessage('§cClaim not found (deleted?)');
          return;
        }
        // Update Coords
        claim.start = start;
        claim.end = end;

        // Update Balance
        pd.claimBlocks.amount -= costDiff; // If negative (refund), it adds.

        ClaimManager.save();
        player.sendMessage('§aClaim resized successfully');
        player.playSound('random.levelup');
      })
      .button('Cancel', () => {
        player.sendMessage('§7Resize canceled');
      })
      .show(player);
  }
}