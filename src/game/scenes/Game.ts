import { Scene } from 'phaser';
import { EventBus } from '../EventBus';

export class Game extends Scene {
    constructor() {
        super('Game');
    }

    preload() {
        this.load.tilemapTiledJSON('galleryMap', 'assets/map/gallery-map.json');
        this.load.image('floorImage', 'assets/map/floor.png');
        this.load.image('hillsImage', 'assets/map/hills.png');
        this.load.image('waterImage', 'assets/map/water.png');
        this.load.image('thingsImage', 'assets/map/Basic_Grass_Biome_things.png');
        this.load.image('interiorsImage', 'assets/map/Interiors.png');

        this.load.spritesheet('player', 'assets/character/character.png', {
            frameWidth: 114,
            frameHeight: 114
        });
    }

    private player: Phaser.Physics.Arcade.Sprite;
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    private popupText: Phaser.GameObjects.Text;
    private interactKey: Phaser.Input.Keyboard.Key;
    private interactGroup: Phaser.Physics.Arcade.StaticGroup;
    private activeInteractName: string | null = null;
    private isInteracting: boolean = false;

    create() {
        const map = this.make.tilemap({ key: 'galleryMap' });
        const grassTiles = map.addTilesetImage('Grass', 'floorImage');
        const hillTiles = map.addTilesetImage('Hills', 'hillsImage');
        const waterTiles = map.addTilesetImage('Water', 'waterImage');
        const thingTiles = map.addTilesetImage('Basic_Grass_Biome_things', 'thingsImage');
        const interiorTiles = map.addTilesetImage('Interiors', 'interiorsImage');
        const allTilesets = [grassTiles, hillTiles, waterTiles, thingTiles, interiorTiles].filter(
            (tileset): tileset is Phaser.Tilemaps.Tileset => tileset !== null
        );

        const waterLayer = waterTiles ? map.createLayer('Water', [waterTiles], 0, 0) : null;
        const grassLayer = grassTiles ? map.createLayer('Grass', [grassTiles], 0, 0) : null;
        const hillsLayer = map.createLayer('Hills', allTilesets, 0, 0); 
        const objectsBase = map.createLayer('Objects-Base', allTilesets, 0, 0);
        const collisionLayer = map.createLayer('Collision', allTilesets, 0, 0);
        
        if (collisionLayer) {
            collisionLayer.setVisible(false);
            collisionLayer.setCollisionByProperty({ collides: true });
        }

        const centerX = map.widthInPixels / 2;
        const centerY = map.heightInPixels / 2;
        
        this.player = this.physics.add.sprite(centerX, centerY, 'player');
        this.player.setScale(0.2);
        this.player.setFrame(1); 

        if (this.player.body) {
            this.player.body.setSize(50, 20);
            this.player.body.setOffset(32, 85);
        }

        const hasPlayed = localStorage.getItem('hasPlayed');
        if (!hasPlayed) {
            const tutorialText = this.add.text(this.player.x, this.player.y - 25, 
                "Hey! Check the paper on the floor first... ❤️", {
                fontSize: '32px',
                fontFamily: 'Arial',
                color: '#ffffff',
                backgroundColor: '#000000aa',
                padding: { x: 10, y: 5 }
            }).setOrigin(0.5).setScale(0.15).setDepth(100);

            this.tweens.add({
                targets: tutorialText,
                alpha: 0,
                duration: 5000,
                delay: 3000,
                onComplete: () => {
                    tutorialText.destroy();
                    localStorage.setItem('hasPlayed', 'true');
                }
            });
        }

        this.interactGroup = this.physics.add.staticGroup();
        const interactLayer = map.getObjectLayer('Interactables');
        
        if (interactLayer && interactLayer.objects) {
            interactLayer.objects.forEach(obj => {
                const x = obj.x! + (obj.width! / 2);
                const y = obj.y! + (obj.height! / 2);
                const zone = this.add.zone(x, y, obj.width!, obj.height!);
                this.physics.add.existing(zone, true);
                zone.setData('name', obj.name);
                this.interactGroup.add(zone);
            });
        }

        this.popupText = this.add.text(0, 0, 'Press E to interact', {
            fontSize: '48px',
            fontFamily: 'Arial',
            color: '#ffffff',
            backgroundColor: '#000000bb',
            padding: { x: 15, y: 10 }
        });
        this.popupText.setOrigin(0.5).setScale(0.15).setDepth(1000).setVisible(false);

        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.interactKey = this.input.keyboard.addKey('E');
        }

        this.anims.create({ key: 'walk-down', frames: this.anims.generateFrameNumbers('player', { start: 0, end: 2 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'walk-left', frames: this.anims.generateFrameNumbers('player', { start: 3, end: 5 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'walk-right', frames: this.anims.generateFrameNumbers('player', { start: 6, end: 8 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'walk-up', frames: this.anims.generateFrameNumbers('player', { start: 9, end: 11 }), frameRate: 10, repeat: -1 });

        this.anims.create({ key: 'walk-down-left', frames: this.anims.generateFrameNumbers('player', { start: 12, end: 14 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'walk-down-right', frames: this.anims.generateFrameNumbers('player', { start: 15, end: 17 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'walk-up-left', frames: this.anims.generateFrameNumbers('player', { start: 18, end: 20 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'walk-up-right', frames: this.anims.generateFrameNumbers('player', { start: 21, end: 23 }), frameRate: 10, repeat: -1 });

        const objectsTop = map.createLayer('Objects-Top', allTilesets, 0, 0);

        if (waterLayer) waterLayer.setDepth(0);
        if (grassLayer) grassLayer.setDepth(1);
        if (hillsLayer) hillsLayer.setDepth(2);
        if (objectsBase) objectsBase.setDepth(2);
        this.player.setDepth(10);
        if (objectsTop) objectsTop.setDepth(20);

        if (hillsLayer) hillsLayer.setCollisionByProperty({ collides: true });
        if (objectsBase) objectsBase.setCollisionByProperty({ collides: true });

        if (collisionLayer) this.physics.add.collider(this.player, collisionLayer);
        if (hillsLayer) this.physics.add.collider(this.player, hillsLayer);
        if (objectsBase) this.physics.add.collider(this.player, objectsBase);

        this.cameras.main.setZoom(3);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setBackgroundColor('#9bd4c3');

        EventBus.on('interaction-start', () => {
            this.isInteracting = true;
            if (this.player.body) this.player.setVelocity(0);
            this.player.anims.stop();
        });

        EventBus.on('interaction-end', () => {
            this.isInteracting = false;
        });
    }

    update() {
        if (!this.cursors || !this.player || this.isInteracting) return;

        this.activeInteractName = null;
        this.physics.overlap(this.player, this.interactGroup, (_player, zone) => {
            const z = zone as Phaser.GameObjects.Zone;
            this.activeInteractName = z.getData('name');
            this.popupText.setPosition(this.player.x, this.player.y - 25);
        });

        if (this.activeInteractName) {
            this.popupText.setVisible(true);
            if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
                if (this.activeInteractName === 'readPaper') {
                    this.popupText.setVisible(false); 
                    EventBus.emit('open-paper');
                } else if (this.activeInteractName === 'openGallery') {
                    this.popupText.setText("Press E to View Gallery");
                } else if (this.activeInteractName === 'openDiary') {
                    this.popupText.setText("Press E to Read Diary");
                }
            }
        } else {
            this.popupText.setVisible(false);
            this.popupText.setText("Press E to interact");
        }

        const speed = 80;
        let vx = 0;
        let vy = 0;

        const leftDown = this.cursors.left?.isDown || this.input.keyboard?.addKey('A').isDown;
        const rightDown = this.cursors.right?.isDown || this.input.keyboard?.addKey('D').isDown;
        const upDown = this.cursors.up?.isDown || this.input.keyboard?.addKey('W').isDown;
        const downDown = this.cursors.down?.isDown || this.input.keyboard?.addKey('S').isDown;

        if (leftDown) vx = -speed;
        else if (rightDown) vx = speed;

        if (upDown) vy = -speed;
        else if (downDown) vy = speed;

        this.player.setVelocity(vx, vy);

        if (vx !== 0 && vy !== 0) {
            this.player.body?.velocity.normalize().scale(speed);
        }

        let animKey = '';

        if (vx === 0 && vy === 0) {
            const current = this.player.anims.currentAnim?.key;
            this.player.anims.stop();
            if (current === 'walk-down') this.player.setFrame(1);
            else if (current === 'walk-left') this.player.setFrame(4);
            else if (current === 'walk-right') this.player.setFrame(7);
            else if (current === 'walk-up') this.player.setFrame(10);
            else if (current === 'walk-down-left') this.player.setFrame(13);
            else if (current === 'walk-down-right') this.player.setFrame(16);
            else if (current === 'walk-up-left') this.player.setFrame(19);
            else if (current === 'walk-up-right') this.player.setFrame(22);
        } else {
            if (vy > 0) {
                if (vx < 0) animKey = 'walk-down-left';
                else if (vx > 0) animKey = 'walk-down-right';
                else animKey = 'walk-down';
            } else if (vy < 0) {
                if (vx < 0) animKey = 'walk-up-left';
                else if (vx > 0) animKey = 'walk-up-right';
                else animKey = 'walk-up';
            } else {
                if (vx < 0) animKey = 'walk-left';
                else if (vx > 0) animKey = 'walk-right';
            }

            if (animKey) this.player.anims.play(animKey, true);
        }
    }
}