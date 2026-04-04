import { Scene } from 'phaser';

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

        this.popupText = this.add.text(0, 0, 'Press E to read', {
            fontSize: '12px',
            color: '#000000',
            backgroundColor: '#ffffff',
            padding: { x: 5, y: 5 }
        });
        this.popupText.setOrigin(0.5); 
        this.popupText.setDepth(1000);
        this.popupText.setVisible(false);

        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.interactKey = this.input.keyboard.addKey('E');
        }

        this.anims.create({ key: 'walk-down', frames: this.anims.generateFrameNumbers('player', { start: 0, end: 2 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'walk-left', frames: this.anims.generateFrameNumbers('player', { start: 3, end: 5 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'walk-right', frames: this.anims.generateFrameNumbers('player', { start: 6, end: 8 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'walk-up', frames: this.anims.generateFrameNumbers('player', { start: 9, end: 11 }), frameRate: 10, repeat: -1 });

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
    }

    update() {
        if (!this.cursors || !this.player) return;

        this.activeInteractName = null;

        this.physics.overlap(this.player, this.interactGroup, (_player, zone) => {
            const z = zone as Phaser.GameObjects.Zone;
            this.activeInteractName = z.getData('name');
            
            this.popupText.setPosition(this.player.x, this.player.y - 60);
        });

        if (this.activeInteractName) {
            this.popupText.setVisible(true);

            if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
                
                if (this.activeInteractName === 'readPaper') {
                    this.popupText.setText("Happy Anniversary! Read this to begin our journey...");
                    
                } else if (this.activeInteractName === 'openGallery') {
                    this.popupText.setText("Opening Photo Gallery...");
                    
                } else if (this.activeInteractName === 'openDiary') {
                    this.popupText.setText("Opening Diary...");
                }
            }
        } else {
            this.popupText.setVisible(false);
            this.popupText.setText("Press E to interact");
        }

        this.player.setDepth(10);
        const speed = 80;
        this.player.setVelocity(0);

        const leftDown = this.cursors.left?.isDown || this.input.keyboard?.addKey('A').isDown;
        const rightDown = this.cursors.right?.isDown || this.input.keyboard?.addKey('D').isDown;
        const upDown = this.cursors.up?.isDown || this.input.keyboard?.addKey('W').isDown;
        const downDown = this.cursors.down?.isDown || this.input.keyboard?.addKey('S').isDown;

        let isMoving = false;

        if (leftDown) {
            this.player.setVelocityX(-speed);
            this.player.anims.play('walk-left', true);
            isMoving = true;
        } else if (rightDown) {
            this.player.setVelocityX(speed);
            this.player.anims.play('walk-right', true);
            isMoving = true;
        }

        if (upDown) {
            this.player.setVelocityY(-speed);
            if (!leftDown && !rightDown) {
                this.player.anims.play('walk-up', true);
            }
            isMoving = true;
        } else if (downDown) {
            this.player.setVelocityY(speed);
            if (!leftDown && !rightDown) {
                this.player.anims.play('walk-down', true);
            }
            isMoving = true;
        }

        if (!isMoving) {
            this.player.anims.stop();
            const currentAnim = this.player.anims.currentAnim?.key;
            if (currentAnim === 'walk-down') this.player.setFrame(1);
            else if (currentAnim === 'walk-left') this.player.setFrame(4);
            else if (currentAnim === 'walk-right') this.player.setFrame(7);
            else if (currentAnim === 'walk-up') this.player.setFrame(10);
        }

        if (this.player.body) {
            this.player.body.velocity.normalize().scale(speed);
        }
    }
}