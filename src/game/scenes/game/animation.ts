import { ANIMATION_DIRECTIONS, IDLE_FRAME_BY_ANIM, OTHER_PLAYER_LERP_FACTOR } from './constants';
import { UserRole } from './types';

export function createPlayerAnims(anims: Phaser.Animations.AnimationManager) {
    const roles: UserRole[] = ['boy', 'girl'];

    roles.forEach(role => {
        if (!anims.exists(`${role}-walk-down`)) {
            ANIMATION_DIRECTIONS.forEach((dir, index) => {
                anims.create({
                    key: `${role}-walk-${dir}`,
                    frames: anims.generateFrameNumbers(role, { start: index * 3, end: index * 3 + 2 }),
                    frameRate: 10,
                    repeat: -1
                });
            });
        }
    });
}

export function getMovementDirectionKey(vx: number, vy: number): string {
    if (vy > 0) return vx < 0 ? 'walk-down-left' : vx > 0 ? 'walk-down-right' : 'walk-down';
    if (vy < 0) return vx < 0 ? 'walk-up-left' : vx > 0 ? 'walk-up-right' : 'walk-up';
    return vx < 0 ? 'walk-left' : 'walk-right';
}

export function getIdleFrame(currentAnimKey: string | undefined, userRole: UserRole): number | null {
    if (!currentAnimKey) return null;
    const dirOnly = currentAnimKey.replace(`${userRole}-`, '');
    return IDLE_FRAME_BY_ANIM[dirOnly] ?? null;
}

export function interpolateOtherPlayer(
    otherPlayer: Phaser.Physics.Arcade.Sprite | null,
    target: { x: number; y: number } | null
) {
    if (!otherPlayer || !target) return;

    otherPlayer.x = Phaser.Math.Linear(otherPlayer.x, target.x, OTHER_PLAYER_LERP_FACTOR);
    otherPlayer.y = Phaser.Math.Linear(otherPlayer.y, target.y, OTHER_PLAYER_LERP_FACTOR);
}

export function syncPlayerDepthByY(player: Phaser.Physics.Arcade.Sprite, otherPlayer: Phaser.Physics.Arcade.Sprite | null) {
    if (!otherPlayer) return;

    if (player.y > otherPlayer.y) {
        player.setDepth(10);
        otherPlayer.setDepth(9);
    } else {
        player.setDepth(9);
        otherPlayer.setDepth(10);
    }
}
