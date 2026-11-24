import {
  system,
  Player,
  CommandPermissionLevel,
  CustomCommandStatus,
  CustomCommandParamType
} from '@minecraft/server';
import { ClaimUI } from '../modules/land_claims/ui.js';
import { handleShovelInteraction } from '../modules/land_claims/main.js';
import { showStatsMenu } from '../modules/stats/ui/StatsMenu.js';
import { highlightManager } from '../modules/vein_mining/highlight.js';
import { DS } from './ds.js';

system.beforeEvents.startup.subscribe(({ customCommandRegistry }) => {
  const registerPlayerCommand = (name, description, callback, optionalParams = []) => {
    customCommandRegistry.registerCommand(
      {
        name,
        description,
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false,
        optionalParameters: optionalParams
      },
      (origin, ...args) => {
        const source = origin.initiator ?? origin.sourceEntity;
        if (!(source instanceof Player)) {
          return {
            status: CustomCommandStatus.Failure,
            message: 'This command can only be executed by players'
          };
        }
        system.run(() => {
          callback(source, ...args);
        });
        return {
          status: CustomCommandStatus.Success
        };
      }
    );
  };

  const handleClaim = (player, action) => {
    if (action === 'corner' || action === '1' || action === '2' || action === 'set') {
      const loc = {
        x: Math.floor(player.location.x),
        y: Math.floor(player.location.y),
        z: Math.floor(player.location.z)
      };
      handleShovelInteraction(player, loc);
      return;
    }
    ClaimUI.openMainMenu(player);
  };

  const claimOptional = [
    {
      name: 'action',
      type: CustomCommandParamType.String
    }
  ];

  registerPlayerCommand('32k:claim', 'Open the land claims menu or set a claim corner', handleClaim, claimOptional);
  registerPlayerCommand('32k:claims', 'Open the land claims menu or set a claim corner', handleClaim, claimOptional);
  registerPlayerCommand('32k:c', 'Open the land claims menu or set a claim corner', handleClaim, claimOptional);

  const handleStats = (player) => {
    showStatsMenu(player);
  };

  registerPlayerCommand('32k:stats', 'Open the player statistics menu', handleStats);
  registerPlayerCommand('32k:st', 'Open the player statistics menu', handleStats);

  const handleAdmin = (player) => {
    if (player.commandPermissionLevel < 1) {
      player.sendMessage('§cYou do not have permission to access the admin menu');
      return;
    }
    DS.events.emit('32k:admin_open', { player });
  };

  customCommandRegistry.registerCommand(
    {
      name: '32k:admin',
      description: 'Open the admin menu',
      permissionLevel: CommandPermissionLevel.GameDirectors,
      cheatsRequired: false
    },
    (origin) => {
      const source = origin.initiator ?? origin.sourceEntity;
      if (!(source instanceof Player)) {
        return {
          status: CustomCommandStatus.Failure,
          message: 'This command can only be executed by players'
        };
      }
      system.run(() => {
        handleAdmin(source);
      });
      return {
        status: CustomCommandStatus.Success
      };
    }
  );

  customCommandRegistry.registerCommand(
    {
      name: '32k:a',
      description: 'Open the admin menu',
      permissionLevel: CommandPermissionLevel.GameDirectors,
      cheatsRequired: false
    },
    (origin) => {
      const source = origin.initiator ?? origin.sourceEntity;
      if (!(source instanceof Player)) {
        return {
          status: CustomCommandStatus.Failure,
          message: 'This command can only be executed by players'
        };
      }
      system.run(() => {
        handleAdmin(source);
      });
      return {
        status: CustomCommandStatus.Success
      };
    }
  );

  const handleVein = (player, action) => {
    const act = action?.toLowerCase?.();
    if (act === 'off' || act === 'disable') {
      player.addTag('32k:disable_veinminer');
      highlightManager.clearHighlights(player);
      player.sendMessage('§cVein miner disabled');
    } else if (act === 'on' || act === 'enable') {
      player.removeTag('32k:disable_veinminer');
      player.sendMessage('§aVein miner enabled');
    } else {
      if (player.hasTag('32k:disable_veinminer')) {
        player.removeTag('32k:disable_veinminer');
        player.sendMessage('§aVein miner enabled');
      } else {
        player.addTag('32k:disable_veinminer');
        highlightManager.clearHighlights(player);
        player.sendMessage('§cVein miner disabled');
      }
    }
  };

  const veinOptional = [
    {
      name: 'action',
      type: CustomCommandParamType.String
    }
  ];

  registerPlayerCommand('32k:vein', 'Toggle vein mining on or off', handleVein, veinOptional);
  registerPlayerCommand('32k:veinminer', 'Toggle vein mining on or off', handleVein, veinOptional);
  registerPlayerCommand('32k:vm', 'Toggle vein mining on or off', handleVein, veinOptional);
  registerPlayerCommand('32k:v', 'Toggle vein mining on or off', handleVein, veinOptional);
});