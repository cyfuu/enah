export type UserRole = 'boy' | 'girl';

export type Direction =
    | 'down'
    | 'left'
    | 'right'
    | 'up'
    | 'down-left'
    | 'down-right'
    | 'up-left'
    | 'up-right';

export interface MovePayload {
    role: UserRole;
    x: number;
    y: number;
    anim: string;
    isMoving: boolean;
    frame: string | number;
}

export interface MovementKeys {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
}

export interface MovementVector {
    vx: number;
    vy: number;
}
