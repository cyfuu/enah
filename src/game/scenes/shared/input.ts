import { MovementKeys, MovementVector } from './types';

interface InputSetup {
    cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    interactKey: Phaser.Input.Keyboard.Key;
    movementKeys: MovementKeys;
}

export function initializeInput(keyboard: Phaser.Input.Keyboard.KeyboardPlugin | null | undefined): InputSetup | null {
    if (!keyboard) return null;

    const cursors = keyboard.createCursorKeys();
    const interactKey = keyboard.addKey('E', false);
    const movementKeys: MovementKeys = {
        up: keyboard.addKey('W', false),
        down: keyboard.addKey('S', false),
        left: keyboard.addKey('A', false),
        right: keyboard.addKey('D', false)
    };

    keyboard.removeCapture('SPACE,SHIFT,UP,DOWN,LEFT,RIGHT');

    return {
        cursors,
        interactKey,
        movementKeys
    };
}

export function getMovement(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    movementKeys: MovementKeys | null,
    speed: number
): MovementVector {
    let vx = 0;
    let vy = 0;

    if (cursors.left.isDown || movementKeys?.left.isDown) vx = -speed;
    else if (cursors.right.isDown || movementKeys?.right.isDown) vx = speed;

    if (cursors.up.isDown || movementKeys?.up.isDown) vy = -speed;
    else if (cursors.down.isDown || movementKeys?.down.isDown) vy = speed;

    return { vx, vy };
}
