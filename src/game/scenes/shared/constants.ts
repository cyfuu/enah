import { Direction } from './types';

export const INTERACTION_EVENT_MAP: Record<string, string> = {
    readPaper: 'open-paper',
    openDiary: 'open-diary',
    openGallery: 'open-gallery'
};

export const IDLE_FRAME_BY_ANIM: Record<string, number> = {
    'walk-down': 1,
    'walk-left': 4,
    'walk-right': 7,
    'walk-up': 10,
    'walk-down-left': 13,
    'walk-down-right': 16,
    'walk-up-left': 19,
    'walk-up-right': 22
};

export const ANIMATION_DIRECTIONS: Direction[] = [
    'down',
    'left',
    'right',
    'up',
    'down-left',
    'down-right',
    'up-left',
    'up-right'
];

export const PLAYER_SPEED = 80;
export const NETWORK_TRACK_INTERVAL_MS = 80;
export const OTHER_PLAYER_LERP_FACTOR = 0.15;
