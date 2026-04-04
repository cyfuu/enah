import Phaser from 'phaser';
import { Game } from './scenes/Game';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#9bd4c3',
    pixelArt: true,
    
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1024, 
        height: 768,
    },
    
    physics: {
        default: 'arcade',
        arcade: {
            debug: false 
        }
    },
    scene: [Game] 
};

export default new Phaser.Game(config);