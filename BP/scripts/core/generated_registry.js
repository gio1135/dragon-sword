import { BedrockBorderUI as BedrockBorderUI_bedrock_border_0 } from '../modules/bedrock_border/ui.js';
import { ClaimUI as ClaimUI_land_claims_0 } from '../modules/land_claims/ui.js';
import { ClaimUI as ClaimUI_land_claims_1 } from '../modules/land_claims/ui.js';

export const MODULES = [
  {
    id: 'world_border',
    name: 'World border',
    featureToggle: { defaultEnabled: true },
    adminUI: [
      {
        label: 'World border',
        method: (player) => BedrockBorderUI_bedrock_border_0.openMenu(player),
      },
    ],
  },
  {
    id: 'land_claims',
    name: 'Land claims',
    featureToggle: { defaultEnabled: true },
    adminUI: [
      {
        label: 'Manage players',
        method: (player) => ClaimUI_land_claims_0.openOpPlayerList(player),
      },
      {
        label: 'Land claim settings',
        method: (player) => ClaimUI_land_claims_1.openAdminMenu(player),
      },
    ],
  },
  {
    id: 'outlaw',
    name: 'Outlaw system',
    featureToggle: { defaultEnabled: true },
    adminUI: null,
  },
  {
    id: 'vein_mining',
    name: 'Vein mining',
    featureToggle: { defaultEnabled: true },
    adminUI: null,
  },
  {
    id: 'saturation',
    name: 'Saturation',
    featureToggle: { defaultEnabled: true },
    adminUI: null,
  },
  {
    id: 'tpa',
    name: 'TPA',
    featureToggle: { defaultEnabled: true },
    adminUI: null,
  },
  {
    id: 'anti_dupe',
    name: 'Anti-dupe',
    featureToggle: { defaultEnabled: true },
    adminUI: null,
  },
  {
    id: 'dimension_lock',
    name: 'Dimension lock',
    featureToggle: { defaultEnabled: true },
    adminUI: null,
  },
  {
    id: 'auto_totem',
    name: 'Auto totem',
    featureToggle: { defaultEnabled: true },
    adminUI: null,
  }
];
