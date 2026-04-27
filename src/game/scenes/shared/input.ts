import { DirectionalInputState, MovementKeys, MovementVector } from './types';

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
    cursors: Phaser.Types.Input.Keyboard.CursorKeys | null,
    movementKeys: MovementKeys | null,
    speed: number,
    directionalInput: DirectionalInputState | null = null
): MovementVector {
    let vx = 0;
    let vy = 0;

    const moveLeft = !!(cursors?.left.isDown || movementKeys?.left.isDown || directionalInput?.left);
    const moveRight = !!(cursors?.right.isDown || movementKeys?.right.isDown || directionalInput?.right);
    const moveUp = !!(cursors?.up.isDown || movementKeys?.up.isDown || directionalInput?.up);
    const moveDown = !!(cursors?.down.isDown || movementKeys?.down.isDown || directionalInput?.down);

    if (moveLeft) vx = -speed;
    else if (moveRight) vx = speed;

    if (moveUp) vy = -speed;
    else if (moveDown) vy = speed;

    return { vx, vy };
}
