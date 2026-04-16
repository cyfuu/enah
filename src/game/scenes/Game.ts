import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { supabase } from '../../supabaseClient';

export class Game extends Scene {
    private multiplayerChannel: any = null;
    private lastTrackTime: number = 0;
    
    private lastSentX: number = 0;
    private lastSentY: number = 0;
    private lastSentAnim: string = '';
    
    private player: Phaser.Physics.Arcade.Sprite;
    private otherPlayer: Phaser.Physics.Arcade.Sprite | null = null;
    private targetOtherPlayerPos: { x: number, y: number } | null = null;
    private userRole: 'boy' | 'girl';
    
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    private popupText: Phaser.GameObjects.Text;
    private interactKey: Phaser.Input.Keyboard.Key;
    private interactGroup: Phaser.Physics.Arcade.StaticGroup;
    private activeInteractName: string | null = null;
    private isInteracting: boolean = false;

    constructor() {
        super('Game');
    }

    preload() {
        this.load.setBaseURL('/enah/');

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        const progressBox = this.add.graphics();
        const progressBar = this.add.graphics();
        
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 50,
            text: 'Loading...',
            style: { font: '20px "Georgia", serif', color: '#ffffff' }
        }).setOrigin(0.5, 0.5);

        this.load.on('progress', (value: number) => {
            progressBar.clear();
            progressBar.fillStyle(0xaf9b60, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
        });

        this.load.tilemapTiledJSON('galleryMap', 'assets/map/gallery-map.json');
        this.load.image('floorImage', 'assets/map/floor.png');
        this.load.image('hillsImage', 'assets/map/hills.png');
        this.load.image('waterImage', 'assets/map/water.png');
        this.load.image('thingsImage', 'assets/map/Basic_Grass_Biome_things.png');
        this.load.image('interiorsImage', 'assets/map/Interiors.png');

        this.load.spritesheet('boy', 'assets/character/boy.png', { frameWidth: 114, frameHeight: 114 });
        this.load.spritesheet('girl', 'assets/character/girl.png', { frameWidth: 114, frameHeight: 114 });

        this.load.audio('bg-music', 'assets/audio/background-music.mp3');
    }

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

        map.createLayer('Water', [waterTiles!], 0, 0)?.setDepth(0);
        map.createLayer('Grass', [grassTiles!], 0, 0)?.setDepth(1);
        const hillsLayer = map.createLayer('Hills', allTilesets, 0, 0); 
        const objectsBase = map.createLayer('Objects-Base', allTilesets, 0, 0);
        const collisionLayer = map.createLayer('Collision', allTilesets, 0, 0);
        
        if (collisionLayer) {
            collisionLayer.setVisible(false);
            collisionLayer.setCollisionByProperty({ collides: true });
        }

        const centerX = map.widthInPixels / 2;
        const centerY = map.heightInPixels / 2;
        
        this.player = this.physics.add.sprite(centerX, centerY, 'boy');
        this.player.setScale(0.2).setDepth(10).setFrame(1); 

        if (this.player.body) {
            this.player.body.setSize(50, 20);
            this.player.body.setOffset(32, 85);
        }

        EventBus.on('set-user-role', (role: 'boy' | 'girl') => {
            this.userRole = role;
            this.player.setTexture(role);
            this.createPlayerAnims();
            this.player.setFrame(1);
            this.setupMultiplayer();

            const welcomeMsg = this.add.text(this.player.x, this.player.y - 30, 'Check the paper!', { 
                fontSize: '32px', 
                color: '#fff', 
                backgroundColor: '#000b',
                padding: { x: 8, y: 4 }
            }).setOrigin(0.5).setScale(0.15).setDepth(1000);

            this.tweens.add({
                targets: welcomeMsg,
                y: welcomeMsg.y - 20,
                alpha: 0,
                duration: 2000,
                delay: 2000,
                onComplete: () => welcomeMsg.destroy() 
            });
        });

        EventBus.emit('game-ready');

        this.interactGroup = this.physics.add.staticGroup();
        const interactLayer = map.getObjectLayer('Interactables');
        if (interactLayer?.objects) {
            interactLayer.objects.forEach(obj => {
                const zone = this.add.zone(obj.x! + (obj.width! / 2), obj.y! + (obj.height! / 2), obj.width!, obj.height!);
                this.physics.add.existing(zone, true);
                zone.setData('name', obj.name);
                this.interactGroup.add(zone);
            });
        }

        this.popupText = this.add.text(0, 0, 'Press E', { fontSize: '32px', color: '#fff', backgroundColor: '#000b' })
            .setOrigin(0.5).setScale(0.15).setDepth(1000).setVisible(false);

        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.interactKey = this.input.keyboard.addKey('E', false);

            this.input.keyboard.removeCapture('SPACE,SHIFT,UP,DOWN,LEFT,RIGHT');
        }

        const objectsTop = map.createLayer('Objects-Top', allTilesets, 0, 0);
        objectsTop?.setDepth(20);

        if (hillsLayer) {
            hillsLayer.setDepth(2).setCollisionByProperty({ collides: true });
            this.physics.add.collider(this.player, hillsLayer);
        }
        if (objectsBase) {
            objectsBase.setDepth(2).setCollisionByProperty({ collides: true });
            this.physics.add.collider(this.player, objectsBase);
        }
        if (collisionLayer) this.physics.add.collider(this.player, collisionLayer);

        this.cameras.main.setZoom(3).startFollow(this.player, true, 0.08, 0.08);

        EventBus.on('interaction-start', () => { 
            this.isInteracting = true; 
            this.player.setVelocity(0); 
            this.player.anims.stop(); 
            if (this.input.keyboard) {
                this.input.keyboard.resetKeys();
                this.input.keyboard.enabled = false;
            }
        });

        EventBus.on('interaction-end', () => { 
            this.isInteracting = false; 
            if (this.input.keyboard) this.input.keyboard.enabled = true;
        });

        this.sound.add('bg-music', { volume: 0.3, loop: true }).play();

        window.addEventListener('beforeunload', this.handleDisconnect);
        this.events.on('destroy', () => {
            window.removeEventListener('beforeunload', this.handleDisconnect);
            this.handleDisconnect();
        });
    }

    private handleDisconnect = () => {
        if (this.multiplayerChannel && this.userRole) {
            this.multiplayerChannel.send({
                type: 'broadcast',
                event: 'leave',
                payload: { role: this.userRole }
            });
        }
    }

    private createPlayerAnims() {
        const roles = ['boy', 'girl'];
        const directions = ['down', 'left', 'right', 'up', 'down-left', 'down-right', 'up-left', 'up-right'];
        
        roles.forEach(role => {
            if (!this.anims.exists(`${role}-walk-down`)) { 
                directions.forEach((dir, index) => {
                    this.anims.create({
                        key: `${role}-walk-${dir}`, 
                        frames: this.anims.generateFrameNumbers(role, { start: index * 3, end: index * 3 + 2 }),
                        frameRate: 10,
                        repeat: -1
                    });
                });
            }
        });
    }

    private setupMultiplayer() {
        if (this.multiplayerChannel) return;

        this.multiplayerChannel = supabase.channel('public:island_room', {
            config: {
                broadcast: { self: true, ack: false }
            }
        });

        this.multiplayerChannel
            .on('broadcast', { event: 'move' }, (payload: any) => {
                const data = payload.payload;
                
                if (data.role !== this.userRole) {
                    if (!this.otherPlayer) {
                        const otherRole = this.userRole === 'boy' ? 'girl' : 'boy';
                        this.otherPlayer = this.physics.add.sprite(data.x, data.y, otherRole).setScale(0.2).setDepth(9);
                        this.targetOtherPlayerPos = { x: data.x, y: data.y };
                    }
                    
                    this.targetOtherPlayerPos = { x: data.x, y: data.y };
                    
                    if (data.isMoving && data.anim) {
                        this.otherPlayer.play(data.anim, true);
                    } else {
                        this.otherPlayer.anims.stop();
                        if (data.frame !== undefined) {
                            this.otherPlayer.setFrame(data.frame);
                        }
                    }
                }
            })
            .on('broadcast', { event: 'join' }, (payload: any) => {
                if (payload.payload.role !== this.userRole) {
                    this.lastSentX = -999; 
                }
            })
            .on('broadcast', { event: 'leave' }, (payload: any) => {
                if (payload.payload.role !== this.userRole && this.otherPlayer) {
                    this.otherPlayer.destroy();
                    this.otherPlayer = null;
                    this.targetOtherPlayerPos = null;
                }
            })
            .subscribe((status: string) => {
                if (status === 'SUBSCRIBED') {
                    this.multiplayerChannel.send({
                        type: 'broadcast',
                        event: 'join',
                        payload: { role: this.userRole }
                    });
                }
            });
    }

    update() {
        if (!this.cursors || !this.player || this.isInteracting || !this.userRole) return;

        this.activeInteractName = null;
        this.physics.overlap(this.player, this.interactGroup, (_, zone) => {
            this.activeInteractName = (zone as Phaser.GameObjects.Zone).getData('name');
            this.popupText.setPosition(this.player.x, this.player.y - 25).setVisible(true);
        });

        if (!this.activeInteractName) this.popupText.setVisible(false);

        if (this.activeInteractName && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
            const eventMap: any = { 'readPaper': 'open-paper', 'openDiary': 'open-diary', 'openGallery': 'open-gallery' };
            if (eventMap[this.activeInteractName]) EventBus.emit(eventMap[this.activeInteractName]);
        }

        const speed = 80;
        let vx = 0, vy = 0;
        const keys = this.input.keyboard!;
        if (this.cursors.left.isDown || keys.addKey('A', false).isDown) vx = -speed;
        else if (this.cursors.right.isDown || keys.addKey('D', false).isDown) vx = speed;
        if (this.cursors.up.isDown || keys.addKey('W', false).isDown) vy = -speed;
        else if (this.cursors.down.isDown || keys.addKey('S', false).isDown) vy = speed;

        this.player.setVelocity(vx, vy);
        if (vx !== 0 && vy !== 0) this.player.body?.velocity.normalize().scale(speed);

        if (vx === 0 && vy === 0) {
            const current = this.player.anims.currentAnim?.key; 
            this.player.anims.stop();
            const frames: any = { 
                'walk-down': 1, 
                'walk-left': 4, 
                'walk-right': 7, 
                'walk-up': 10,
                'walk-down-left': 13,
                'walk-down-right': 16,
                'walk-up-left': 19,
                'walk-up-right': 22
            };
            
            const dirOnly = current ? current.replace(`${this.userRole}-`, '') : '';

            if (current && frames[dirOnly] !== undefined) {
                this.player.setFrame(frames[dirOnly]);
            } else if (!current) {
                this.player.setFrame(1);
            }
        } else {
            let dirKey = 'walk-down';
            if (vy > 0) dirKey = vx < 0 ? 'walk-down-left' : vx > 0 ? 'walk-down-right' : 'walk-down';
            else if (vy < 0) dirKey = vx < 0 ? 'walk-up-left' : vx > 0 ? 'walk-up-right' : 'walk-up';
            else dirKey = vx < 0 ? 'walk-left' : 'walk-right';
            
            this.player.anims.play(`${this.userRole}-${dirKey}`, true);
        }

        if (this.otherPlayer && this.targetOtherPlayerPos) {
            this.otherPlayer.x = Phaser.Math.Linear(this.otherPlayer.x, this.targetOtherPlayerPos.x, 0.15);
            this.otherPlayer.y = Phaser.Math.Linear(this.otherPlayer.y, this.targetOtherPlayerPos.y, 0.15);
        }

        if (this.otherPlayer) {
            if (this.player.y > this.otherPlayer.y) {
                this.player.setDepth(10);
                this.otherPlayer.setDepth(9);
            } else {
                this.player.setDepth(9);
                this.otherPlayer.setDepth(10);
            }
        }

        if (this.multiplayerChannel) {
            const now = Date.now();
            if (now - this.lastTrackTime > 80) { 
                
                const isMoving = vx !== 0 || vy !== 0;
                const currentAnimKey = isMoving ? (this.player.anims.currentAnim?.key || '') : '';
                const currentX = Math.round(this.player.x);
                const currentY = Math.round(this.player.y);
                const currentFrame = this.player.frame.name;

                if (this.lastSentX !== currentX || 
                    this.lastSentY !== currentY || 
                    this.lastSentAnim !== currentAnimKey) {

                    this.multiplayerChannel.send({
                        type: 'broadcast',
                        event: 'move',
                        payload: { 
                            role: this.userRole,
                            x: currentX, 
                            y: currentY, 
                            anim: currentAnimKey,
                            isMoving: isMoving,
                            frame: currentFrame
                        }
                    });

                    this.lastSentX = currentX;
                    this.lastSentY = currentY;
                    this.lastSentAnim = currentAnimKey;
                }
                
                this.lastTrackTime = now;
            }
        }
    }
}