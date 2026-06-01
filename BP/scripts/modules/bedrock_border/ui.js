import { DS } from '../../core/ds.js';
import { BedrockBorderManager } from './manager.js';
import {
    COLORS,
    CHUNK_SIZE,
    DEFAULTS
} from './constants.js';

export const BedrockBorderUI = {
    openMenu: (player) => {
        if (player.commandPermissionLevel < 1) {
            player.playSound('random.pop');
            return;
        }

        player.runCommandAsync('damage @s 0');

        // Create main menu with dimension list
        const form = DS.ui.action('World border');
        
        const config = BedrockBorderManager.config;
        const overworldStatus = config.overworld.enabled ? '§aEnabled' : '§cDisabled';
        const netherStatus = config.nether.enabled ? '§aEnabled' : '§cDisabled';
        const endStatus = config.end.enabled ? '§aEnabled' : '§cDisabled';

        form.button(`§2Overworld\n${overworldStatus} §8• §b${config.overworld.sizeChunks} chunks`);
        form.button(`§4The Nether\n${netherStatus} §8• §b${config.nether.sizeChunks} chunks`);
        form.button(`§5The End\n${endStatus} §8• §b${config.end.sizeChunks} chunks`);

        form.show(player).then(response => {
            if (response.canceled) {
                DS.events.emit('ds:admin_open', { player });
                return;
            }
            // Adjusted Indices since 'All' (0) is removed
            const dimensions = ['overworld', 'nether', 'end'];
            BedrockBorderUI.openDimensionSettings(player, dimensions[response.selection]);
        });
    },

    openDimensionSettings: async (player, dimension) => {
        const config = BedrockBorderManager.config[dimension];
        const dimensionName = dimension.charAt(0).toUpperCase() + dimension.slice(1);

        const form = DS.ui.modal(`${dimensionName} settings`);
        
        form.toggle('Border enabled', config.enabled);

        form.textField('Distance from center (chunks)', `Min ${DEFAULTS.MIN_BORDER_SIZE_CHUNKS}`, config.sizeChunks.toString())
            .textField('Center X', 'X coordinate', config.centerX.toString())
            .textField('Center Z', 'Z coordinate', config.centerZ.toString());

        const response = await form.show(player);
        if (response.canceled) {
            BedrockBorderUI.openMenu(player);
            return;
        }

        // DS.ui.modal formValues match the order of elements added
        const [enabled, sizeText, centerXText, centerZText] = response.formValues;

        const sizeChunks = parseInt(sizeText);
        const centerX = parseInt(centerXText) || 0;
        const centerZ = parseInt(centerZText) || 0;
        const sizeBlocks = sizeChunks * CHUNK_SIZE;

        // Validation
        if (isNaN(sizeChunks) || sizeChunks < DEFAULTS.MIN_BORDER_SIZE_CHUNKS) {
            player.sendMessage(`${COLORS.ERROR}Invalid size. Must be at least ${DEFAULTS.MIN_BORDER_SIZE_CHUNKS} chunk(s).`);
            return;
        }

        // Apply settings
        BedrockBorderManager.config[dimension].enabled = enabled;
        BedrockBorderManager.config[dimension].sizeChunks = sizeChunks;
        BedrockBorderManager.config[dimension].centerX = centerX;
        BedrockBorderManager.config[dimension].centerZ = centerZ;
        
        BedrockBorderManager.saveConfig();

        const statusText = enabled ? `${COLORS.SUCCESS}enabled` : `${COLORS.ERROR}disabled`;
        
        player.sendMessage(`${COLORS.SUCCESS}Settings updated for ${dimensionName}:`);
        player.sendMessage(`${COLORS.WARNING}Border: ${statusText} ${COLORS.NEUTRAL}| Size: ${COLORS.INFO}${sizeChunks} chunks ${COLORS.NEUTRAL}(${sizeBlocks} blocks)`);
        player.sendMessage(`${COLORS.WARNING}Center: ${COLORS.INFO}${centerX}, ${centerZ}`);
    }
};
