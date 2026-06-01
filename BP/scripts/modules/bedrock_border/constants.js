/**
 * Constants and configuration defaults for BedrockWorldBorder
 * @module constants
 */

/**
 * World constants
 */
export const CHUNK_SIZE = 16;

/**
 * Default configuration values
 */
export const DEFAULTS = {
    // Border settings (in chunks)
    MIN_BORDER_SIZE_CHUNKS: 1,
    DEFAULT_BORDER_SIZE_CHUNKS: 64,
    
    // Wall particle settings
    WALL_VISIBILITY_CHUNKS: 6,      // Show wall when within 6 chunks (96 blocks)
    WALL_SEGMENT_CHUNKS: 8,         // Render 8 chunks in each direction from player
    PARTICLE_SPAWN_Y: 128,          // Y level for particle spawn
    PARTICLE_SPAWN_INTERVAL: 60,    // Ticks between spawns (3 seconds)
    
    // Player monitoring
    WARNING_CHECK_INTERVAL: 10,
    INIT_DELAY: 20,
    
    // Border enforcement
    SAFE_Y_SEARCH_RANGE: 128,
};

/**
 * Color codes for messages
 */
export const COLORS = {
    SUCCESS: '§a',
    ERROR: '§c',
    WARNING: '§e',
    INFO: '§b',
    NEUTRAL: '§7',
    HIGHLIGHT: '§6',
    DARK_GRAY: '§8',
};

/**
 * Localized messages
 */
export const MESSAGES = {
    // Validation errors
    INVALID_SIZE: `${COLORS.ERROR}Size must be a positive number of chunks.`,
    BORDER_TOO_SMALL: `${COLORS.ERROR}World border size must be at least ${DEFAULTS.MIN_BORDER_SIZE_CHUNKS} chunk(s).`,
    INVALID_CENTER_COORDS: `${COLORS.ERROR}Center coordinates must be valid numbers.`,
    INVALID_DIMENSION: `${COLORS.ERROR}Invalid dimension. Use: all, overworld, nether, or end.`,
    
    // Player feedback
    AT_BORDER: `${COLORS.ERROR}You have reached the world border!`,
    BEYOND_BORDER: (distance) =>
        `${COLORS.ERROR}Beyond border: ${COLORS.INFO}${distance} ${COLORS.ERROR}blocks`,
    
    // Admin feedback - Size
    SIZE_SET_ALL: (chunks) => `${COLORS.SUCCESS}Set world border size to ${COLORS.INFO}${chunks} chunks ${COLORS.NEUTRAL}(${chunks * CHUNK_SIZE} blocks) ${COLORS.SUCCESS}for all dimensions.`,
    SIZE_SET_DIM: (chunks, dim) => `${COLORS.SUCCESS}Set world border size to ${COLORS.INFO}${chunks} chunks ${COLORS.NEUTRAL}(${chunks * CHUNK_SIZE} blocks) ${COLORS.SUCCESS}for ${dim}.`,
    
    // Admin feedback - Toggle
    BORDER_ENABLED_ALL: `${COLORS.SUCCESS}World border ${COLORS.SUCCESS}enabled ${COLORS.SUCCESS}for all dimensions.`,
    BORDER_DISABLED_ALL: `${COLORS.SUCCESS}World border ${COLORS.ERROR}disabled ${COLORS.SUCCESS}for all dimensions.`,
    BORDER_ENABLED_DIM: (dim) => `${COLORS.SUCCESS}World border ${COLORS.SUCCESS}enabled ${COLORS.SUCCESS}for ${dim}.`,
    BORDER_DISABLED_DIM: (dim) => `${COLORS.SUCCESS}World border ${COLORS.ERROR}disabled ${COLORS.SUCCESS}for ${dim}.`,
    
    // Admin feedback - Center
    CENTER_SET_ALL: (x, z) => `${COLORS.SUCCESS}Set center coordinates to ${COLORS.INFO}${x}, ${z} ${COLORS.SUCCESS}for all dimensions.`,
    CENTER_SET_DIM: (x, z, dim) => `${COLORS.SUCCESS}Set center coordinates to ${COLORS.INFO}${x}, ${z} ${COLORS.SUCCESS}for ${dim}.`,
    
    // Admin feedback - Bypass
    BYPASS_GRANTED: (name) => `${COLORS.SUCCESS}Gave border bypass to ${name}.`,
    BYPASS_REVOKED: (name) => `${COLORS.SUCCESS}Removed border bypass from ${name}.`,
    BYPASS_GRANTED_SELF: `${COLORS.SUCCESS}You can now bypass the world border.`,
    BYPASS_REVOKED_SELF: `${COLORS.ERROR}You can no longer bypass the world border.`,
    PLAYER_NOT_FOUND: (name) => `${COLORS.ERROR}Player '${name}' not found.`,
    
    // Form messages
    FORM_ERROR: `${COLORS.ERROR}Error opening settings form. Please try again.`,
    INVALID_FORM_SIZE: `${COLORS.ERROR}Invalid size. Must be at least ${DEFAULTS.MIN_BORDER_SIZE_CHUNKS} chunk(s).`,
};

/**
 * Default dimension configurations
 */
export const DEFAULT_DIMENSION_CONFIG = {
    overworld: {
        enabled: false,
        sizeChunks: 635,
        centerX: 0,
        centerZ: 0,
        particlesEnabled: true,
    },
    nether: {
        enabled: false,
        sizeChunks: 78,
        centerX: 0,
        centerZ: 0,
        particlesEnabled: true,
    },
    end: {
        enabled: false,
        sizeChunks: 635,
        centerX: 0,
        centerZ: 0,
        particlesEnabled: true,
    }
};

/**
 * Sound effects
 */
export const SOUNDS = {
    BORDER_HIT: 'random.orb',
};

/**
 * Permission levels
 */
export const PERMISSION_LEVELS = {
    GAME_DIRECTOR: 2,
    ANY: 0,
};