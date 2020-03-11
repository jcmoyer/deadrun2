import { vec3, mat4 } from 'gl-matrix';
import { Camera } from "./camera";
import { buildProgram, loadTexture } from './glutil';
import { AssetManager } from './assetmanager';
import { Death } from './death';
import BillboardRenderer, { BillboardRenderable } from './billboardrenderer';
import { Player } from './player';
import { DEATH } from './tilemap';
import ExitEmitter from './exitemitter';
import { TILE_SIZE, toMapX, toMapY, Level } from './level';
import LevelRenderer from './levelrenderer';
import ViewWeaponRenderer from './viewweaponrenderer';
import { collideSS, lerp } from './math';
import SkydomeRenderer from './skydome';
import WorldItem from './worlditem';
import Timer from './timer';
import DebrisManager, { DEBRIS_BONE, DEBRIS_EMBER } from './debris';
import { TileSet } from './levelrenderer2';

import leveldata from "./leveldata";
import ScreenQuadShader from './shaders/screenquad';
import Projectile from './projectile';
import Weapon from './weapon';
import { sword, spellbook } from './weaponinfo';
import LevelRenderer2 from './levelrenderer2';
import LightList from './light';

class WhisperPlayer {
  private am: AssetManager;

  constructor(am: AssetManager) {
    this.am = am;
  }

  playRandomWhisper(soundX: number, soundY: number, soundZ: number) {
    const i = Math.floor(Math.random() * 3);
    this.am.tryPlayAudio3D(`whisper${i}`, soundX, soundY, soundZ);
  }
}

class GLTextureCache {
  private gl: WebGLRenderingContext;
  private am: AssetManager;
  private textures: Map<string, WebGLTexture>;

  constructor(gl: WebGLRenderingContext, am: AssetManager) {
    this.gl = gl;
    this.am = am;
    this.textures = new Map();
  }

  getTexture(name: string) {
    if (this.textures.has(name)) {
      return this.textures.get(name);
    } else {
      const texture = loadTexture(this.gl, this.am.getImage(name));
      this.textures.set(name, texture);
      return texture;
    }
  }
}

export default class Game {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private renderClosure: typeof Game.prototype.render; 

  private projMatrix: mat4;
  private player: Player = new Player();
  private enemies: Death[];

  private keyboard = new Map<string, boolean>();
  private havePointerLock = false;

  private lastUpdate = Date.now();
  private pendingUpdateTime = 0;

  private yawQueue = 0;
  private pitchQueue = 0;

  private level: Level;
  private levelID: number = 0;

  private music: HTMLAudioElement;
  private bbRenderer: BillboardRenderer;

  private assetMan: AssetManager;
  private exitEmitter: ExitEmitter;

  private gameFinished = false;
  private gameFinishedCallback: () => void;

  private fb: WebGLFramebuffer;
  private fbTexture: WebGLTexture;
  private fbDepthBuffer: WebGLRenderbuffer;

  private orthoProj: mat4;
  private orthoShader: ScreenQuadShader;
  private orthoBuffer: WebGLBuffer;

  private fadeTimer: number = 2000;
  private fadeColor = [0, 0, 0, 1];
  private fadeDirection = 'in';
  private paused = false;

  private textureCache: GLTextureCache;

  private levelRenderer: LevelRenderer2;
  private viewWeaponRenderer: ViewWeaponRenderer;

  private bbRenderables: BillboardRenderable[] = [];
  private projectiles: Projectile[] = [];
  private worldItems: WorldItem[] = [];

  private skydomeRenderer: SkydomeRenderer;
  private time: number = 0;

  private musicFadeTimer: Timer = null;
  private debrisMan: DebrisManager;
  private whisperPlayer: WhisperPlayer;

  private tileset: TileSet;
  private lightList: LightList = new LightList(16);

  private camera: Camera;

  constructor(canvas: HTMLCanvasElement, am: AssetManager) {
    this.assetMan = am;

    this.canvas = canvas;
    this.gl = this.canvas.getContext('webgl', {
      alpha: false
    });

    const gl = this.gl;

    this.textureCache = new GLTextureCache(gl, am);

    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    this.levelRenderer = new LevelRenderer2(this.gl);

    this.bbRenderer = new BillboardRenderer(gl);
    
    this.music = null;

    this.exitEmitter = new ExitEmitter(gl);

    this.fb = gl.createFramebuffer();
    this.createFBTexture();

    this.orthoShader = new ScreenQuadShader(gl);

    this.orthoBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.orthoBuffer);
    const orthoVerts = [
      -1, 1, 0, 0, 1,
      -1, -1, 0, 0, 0,
      1, -1, 0, 1, 0,

      1, -1, 0, 1, 0,
      1, 1, 0, 1, 1,
      -1, 1, 0, 0, 1,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(orthoVerts), gl.STATIC_DRAW);

    this.skydomeRenderer = new SkydomeRenderer(gl, this.assetMan.getModel('skydome'));

    this.viewWeaponRenderer = new ViewWeaponRenderer(gl);
    this.debrisMan = new DebrisManager(this.textureCache);
    this.whisperPlayer = new WhisperPlayer(this.assetMan);
    
    this.tileset = new TileSet();
    this.tileset.setMeshTexture('_', this.assetMan.getModel('tile5'), this.textureCache.getTexture('overgrown_dirt'));
    this.tileset.setMeshTexture('#', this.assetMan.getModel('tile0'), this.textureCache.getTexture('overgrown_wall'));
    this.tileset.setMeshTexture('T', this.assetMan.getModel('tree'), this.textureCache.getTexture('ashenwood'));
    this.tileset.setMeshTexture('W', this.assetMan.getModel('postwall_m'), this.textureCache.getTexture('postwall_t'));
    this.tileset.setMeshTexture('B', this.assetMan.getModel('gravehouse'), this.textureCache.getTexture('postwall_t'));
    this.setLevel(new Level(leveldata[this.levelID]));

    this.camera = new Camera();
  }

  update(dt: number) {
    if (this.paused) {
      this.yawQueue = 0;
      this.pitchQueue = 0;
      this.player.beginUpdate();
      for (let death of this.enemies) {
        death.beginUpdate();
      }
      return;
    }
    this.time += dt;
    this.assetMan.updateListener(this.player.getWorldPos(), this.camera.getFront());
    this.player.beginUpdate();

    const old_px = this.player.getWorldX();
    const old_pz = this.player.getWorldZ();

    if (this.keyboard.get('w')) {
      this.player.move(1);
    }
    if (this.keyboard.get('s')) {
      this.player.move(-1);
    }
    if (this.keyboard.get('a')) {
      this.player.strafe(-1);
    }
    if (this.keyboard.get('d')) {
      this.player.strafe(1);
    }

    let new_px = this.player.getWorldX();
    let new_pz = this.player.getWorldZ();

    // step one axis at a time so the player can slide against walls
    // however this is super jank and will probably break
    // need to do aabb or something but didn't have time to read up on 3d
    // collisions so this is a poor adaptation of a 2d method

    const tilemap = this.level.tilemap;

    if (tilemap.isSolid(toMapX(new_px), toMapY(old_pz))) {
      new_px = old_px;
    }

    if (tilemap.isSolid(toMapX(new_px), toMapY(new_pz))) {
      new_pz = old_pz;
    }

    this.player.setWorldPos(new_px, new_pz);

    if (this.player.equippedWeapon) {
      this.player.equippedWeapon.update(dt);
    }

    this.pickupItems();

    // TODO: clean this up by converting player worldpos to vec3...
    const playerWorld = vec3.create();
    vec3.set(playerWorld, this.player.getWorldX(), 16, this.player.getWorldZ());

    const playerMapX = toMapX(this.player.getWorldX());
    const playerMapY = toMapY(this.player.getWorldZ());

    const exitTile = this.level.tilemap.getExitTile();

    for (let death of this.enemies) {
      if (vec3.dist(death.worldPos, playerWorld) <= 16) {
        this.killPlayer();
        return;
      }
    }

    if (playerMapX == exitTile.x && playerMapY == exitTile.y) {
      this.nextLevel();
      return;
    }

    this.bbRenderables = [];

    for (let item of this.worldItems) {
      item.update();
      this.bbRenderables.push(item);
    }

    for (let death of this.enemies) {
      death.update(this.player, this.level.tilemap, dt);
      this.bbRenderables.push(death);
    }

    this.updateProjectiles(dt);

    this.debrisMan.update(dt);
    this.debrisMan.submitToRenderList(this.bbRenderables);

    this.bbRenderables.sort((a, b) => {
      return vec3.dist(playerWorld, b.worldPos) - vec3.dist(playerWorld, a.worldPos);
    });

    this.exitEmitter.update();

    if (this.musicFadeTimer) {
      // sequencing important, update may invalidate this timer so eval first
      this.musicFadeTimer.evaluate((s) => {
        if (this.music)
          this.music.volume = 1 - s;
      });
      this.musicFadeTimer.update(dt);
    }

    // TODO does this also need to be interpolated?
    this.player.addYaw(this.yawQueue);
    this.player.addPitch(this.pitchQueue);
    this.yawQueue = 0;
    this.pitchQueue = 0;
  }

  render() {
    const gl = this.gl;

    const now = Date.now();
    const last = this.lastUpdate;
    const elapsed = now - last;
    this.pendingUpdateTime += elapsed;

    const UPDATE_HZ = 30;
    const UPDATE_FRAME_MS = 1000 / UPDATE_HZ;

    while (this.pendingUpdateTime >= UPDATE_FRAME_MS) {
      this.update(UPDATE_FRAME_MS);
      this.pendingUpdateTime -= UPDATE_FRAME_MS;
      this.fadeTimer -= UPDATE_FRAME_MS;
    }

    let alpha = this.pendingUpdateTime / UPDATE_FRAME_MS;
    if (this.paused) {
      alpha = 0;
    }

    this.lastUpdate = now;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // TODO: specify player height elsewhere
    const interpPos = vec3.lerp(vec3.create(), this.player.prevPos, this.player.pos, alpha);
    this.camera.setEye(interpPos[0], interpPos[1] + 16, interpPos[2]);
    this.camera.yaw = lerp(this.player.prevYaw, this.player.yaw, alpha);
    this.camera.pitch = lerp(this.player.prevPitch, this.player.pitch, alpha);
    const playerView = this.camera.getViewMatrix();

    this.skydomeRenderer.render(playerView, this.projMatrix,
      this.textureCache.getTexture('sky0'),
      this.textureCache.getTexture('sky1'),
      this.time, this.level.fogColor, this.level.fogDensity);

    this.lightList.clearLights();
    for (let i = 0; i < Math.min(16, this.projectiles.length); ++i) {
      const p = this.projectiles[i];
      this.lightList.setLight(0,
        lerp(p.prevWorldPos[0], p.worldPos[0], alpha),
        lerp(p.prevWorldPos[1], p.worldPos[1], alpha),
        lerp(p.prevWorldPos[2], p.worldPos[2], alpha),
        64 + Math.sin(Date.now() / 40) * 16);
    }

    this.levelRenderer.render(this.projMatrix, playerView, this.lightList);

    this.exitEmitter.render(playerView, this.projMatrix, this.level.fogColor, this.level.fogDensity, alpha);

    this.bbRenderer.render(this.bbRenderables, playerView, this.projMatrix, this.level.fogColor, this.level.fogDensity, alpha, this.lightList);

    if (this.player.equippedWeapon) {
      this.viewWeaponRenderer.render(this.player.equippedWeapon, this.textureCache);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this.orthoShader.use();
    gl.uniformMatrix4fv(this.orthoShader.uProjection, false, this.orthoProj);
    gl.uniform4fv(this.orthoShader.uColor, this.fadeColor);
    gl.uniform1f(this.orthoShader.uColorMix, this.getFadeAmount());

    gl.bindBuffer(gl.ARRAY_BUFFER, this.orthoBuffer);
    gl.enableVertexAttribArray(this.orthoShader.aPosition);
    gl.vertexAttribPointer(this.orthoShader.aPosition, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(this.orthoShader.aTexcoord);
    gl.vertexAttribPointer(this.orthoShader.aTexcoord, 2, gl.FLOAT, false, 20, 12);

    gl.bindTexture(gl.TEXTURE_2D, this.fbTexture);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (!this.gameFinished) {
      window.requestAnimationFrame(this.renderClosure);
    }
  }

  run() {
    window.addEventListener('resize', this.performLayout.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
    this.canvas.addEventListener('click', this.onCanvasClick.bind(this));
    this.canvas.addEventListener('mousemove', this.onCanvasMouseMove.bind(this));
    document.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this));

    // perform initial layout since canvas backbuffer dimensions are certainly incorrect
    this.performLayout();

    // store bound render function to avoid allocating every frame
    this.renderClosure = this.render.bind(this);

    // start the render loop
    window.requestAnimationFrame(this.renderClosure);
  }

  onKeyDown(e: KeyboardEvent) {
    this.keyboard.set(e.key, true);

    if (e.key === 'f') {
      this.canvas.requestFullscreen();
    } else if (e.key === '1') {
      if (this.player.hasWeapon(0)) {
        this.player.changeWeapon(0);
      }
    } else if (e.key === '2') {
      if (this.player.hasWeapon(1)) {
        this.player.changeWeapon(1);
      }
    }
  }

  onKeyUp(e: KeyboardEvent) {
    this.keyboard.set(e.key, false);
  }

  onCanvasClick() {
    if (!this.havePointerLock) {
      this.canvas.requestPointerLock();

      if (this.music && this.music.paused) {
        try {
          this.music.play();
        } catch {
          // TODO
          // this might fail to play if the context is one where the event is
          // not user-initiated, I don't have time to research workarounds now
        }
      }
    } else {
      if (this.player.equippedWeapon && this.player.equippedWeapon.canPerformAction()) {
        this.player.equippedWeapon.doAction();
        this.assetMan.tryPlayAudio(
          this.player.equippedWeapon.info.actionSoundName
        );
      }
    }
  }

  onCanvasMouseMove(e: MouseEvent) {
    if (this.havePointerLock) {
      this.yawQueue += e.movementX / 200;
      this.pitchQueue -= e.movementY / 200;
    }
  }

  onPointerLockChange() {
    this.havePointerLock = !this.havePointerLock;
  }

  performLayout() {
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.projMatrix = mat4.perspective(
      mat4.create(), Math.PI / 2, this.canvas.width / this.canvas.height, 0.1, 1000
    );
    this.orthoProj = mat4.ortho(
      mat4.create(),
      -1, 1, -1, 1, 0, 1
    );
    this.createFBTexture();
  }

  createFBTexture() {
    const gl = this.gl;
    gl.deleteTexture(this.fbTexture);
    this.fbTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.fbTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.canvas.width, this.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    gl.deleteRenderbuffer(this.fbDepthBuffer);
    this.fbDepthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.fbDepthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.canvas.width, this.canvas.height);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fbTexture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.fbDepthBuffer);
  }

  killPlayer() {
    this.assetMan.tryPlayAudio('playerdeath');
    this.player.dead = true;
    this.fadeTimer = 2000;
    this.fadeColor = [125 / 255, 0, 0, 1];
    this.paused = true;
    this.fadeDirection = 'out';
    setTimeout(() => {
      this.setLevel(new Level(leveldata[this.levelID]));
      this.fadeTimer = 2000;
      this.fadeDirection = 'in';
      setTimeout(() => {
        this.paused = false;
      }, 2000);
    }, 2000);
  }

  getFadeAmount() {
    const a = Math.max(this.fadeTimer / 2000, 0);

    if (this.fadeDirection === 'in') {
      return a;
    } else {
      return 1 - a;
    }
  }

  setLevel(level: Level) {
    const gl = this.gl;

    this.level = level;

    const spawn = this.level.tilemap.getSpawnTile();
    this.player.setWorldPos(
      spawn.x * TILE_SIZE,
      spawn.y * TILE_SIZE
    );
    // HACK this syncs prev and current pos
    this.player.beginUpdate();
    this.player.resetYaw();
    this.player.resetPitch();

    this.enemies = [];
    this.projectiles = [];
    this.bbRenderables = [];
    this.worldItems = [];

    for (let y = 0; y < this.level.tilemap.getHeight(); ++y) {
      for (let x = 0; x < this.level.tilemap.getWidth(); ++x) {
        if (this.level.tilemap.getFlag(x, y) & DEATH) {
          const death = new Death();
          death.texture = this.textureCache.getTexture('death');
          death.setWorldPos(
            x * TILE_SIZE,
            y * TILE_SIZE
          );
          death.onWake(() => {
            const playerPos = this.player.getWorldPos();
            this.whisperPlayer.playRandomWhisper(death.worldPos[0], death.worldPos[1], death.worldPos[2]);
          });
          this.enemies.push(death);
        }
      }
    }

    for (const item of this.level.items) {
      const i = new WorldItem(
        item.type, vec3.fromValues(item.x * TILE_SIZE, 0, item.y * TILE_SIZE)
      );
      i.texture = this.textureCache.getTexture(item.type);
      this.worldItems.push(i);
    }

    const exit = this.level.tilemap.getExitTile();
    this.exitEmitter.setWorldPos(exit.x * TILE_SIZE, exit.y * TILE_SIZE);

    gl.clearColor(
      this.level.fogColor[0],
      this.level.fogColor[1],
      this.level.fogColor[2],
      this.level.fogColor[3]
    );

    this.levelRenderer.setLevel(this.level, this.tileset);

    if (this.level.music) {
      this.stopMusic();
      this.music = this.assetMan.getMusic(this.level.music);
      try {
        this.music.play();
      } catch {
      }
    }
  }

  stopMusic() {
    if (this.music && !this.music.paused) {
      this.music.pause();
      this.music.currentTime = 0;
    }
  }

  nextLevel() {
    this.assetMan.tryPlayAudio('levelcomplete');

    this.fadeTimer = 2000;
    this.fadeColor = [0, 0, 0, 1];
    this.paused = true;
    this.fadeDirection = 'out';
    setTimeout(() => {
      ++this.levelID;
      if (this.levelID === leveldata.length) {
        this.win();
        return;
      }
      this.setLevel(new Level(leveldata[this.levelID]));
      this.fadeTimer = 2000;
      this.fadeDirection = 'in';
      setTimeout(() => {
        this.paused = false;
      }, 2000);
    }, 2000);
  }

  onGameFinished(f: typeof Game.prototype.gameFinishedCallback) {
    this.gameFinishedCallback = f;
  }

  win() {
    this.stopMusic();

    document.exitPointerLock();
    document.exitFullscreen();

    this.gameFinished = true;
    this.gameFinishedCallback();
  }

  spawnProjectile() {
    this.assetMan.tryPlayAudio('fireball_launch');
    const p = new Projectile(
      vec3.fromValues(this.player.getWorldX(), 16, this.player.getWorldZ()),
      vec3.clone(this.player.getFront()),
      5);
    p.texture = this.textureCache.getTexture('fireball');
    this.projectiles.push(p);
  }

  pickupItems() {
    let picked = false;
    let pickedName;

    for (let i = this.worldItems.length - 1; i >= 0; --i) {
      const item = this.worldItems[i];
      const collides = collideSS(
        this.player.getWorldX(), 16, this.player.getWorldZ(), this.player.pickupRadius,
        item.worldPos[0], item.worldPos[1], item.worldPos[2], this.player.pickupRadius
      );
      if (collides) {
        this.worldItems.splice(i, 1);   
        this.assetMan.tryPlayAudio('pickup');
        pickedName = item.itemName;
        picked = true;
      }
    }

    if (pickedName === 'sword') {
      this.playMusic('MUS_track1', 5000);

      const w = new Weapon(sword);
      w.on('activate', () => {
        this.doSword();
      });
      this.player.giveWeapon(
        w
      );
    } else if (pickedName === 'spellbook') {
      const w = new Weapon(spellbook);
      w.on('activate', () => {
        this.doSpellbook();
      });
      this.player.giveWeapon(
        w
      );
    }
  }

  playMusic(name: string, fadeTimeMS: number) {
    if (this.music) {
      this.musicFadeTimer = new Timer(fadeTimeMS);
      this.musicFadeTimer.on('expire', () => {
        this.stopMusic();
        this.music.volume = 1;
        this.music = this.assetMan.getMusic(name);
        try {
          this.music.play();
        } catch {}
        this.musicFadeTimer = null;
      });
    } else {
      this.music = this.assetMan.getMusic(name);
      try {
        this.music.play();
      } catch {}
    }
  }

  doSword() {
    const pos = vec3.fromValues(this.player.getWorldX(), 16, this.player.getWorldZ());
    const front = vec3.clone(this.player.getFront());
    vec3.normalize(front, front);
    vec3.scale(front, front, 8);
    const sword = vec3.add(pos, pos, front);
    for (let i = this.enemies.length - 1; i >= 0; --i) {
      const enemy = this.enemies[i];
      const collide = collideSS(
        sword[0], sword[1], sword[2], 20,
        enemy.getWorldX(), 16, enemy.getWorldZ(), 8);
      if (collide) {
        enemy.hurt(10);
        this.debrisMan.spawnMulti(DEBRIS_BONE, enemy.worldPos, 5);
        this.assetMan.tryPlayAudio('bonethud');
        if (!enemy.alive) this.enemies.splice(i, 1);
      }
    }
  }

  doSpellbook() {
    this.spawnProjectile();
  }

  updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; --i) {
      const proj = this.projectiles[i];
      let alive = true;
      proj.update();

      for (let j = this.enemies.length - 1; j >= 0; --j) {
        const enemy = this.enemies[j];
        if (collideSS(proj.worldPos[0], proj.worldPos[1], proj.worldPos[2], 4, enemy.worldPos[0], enemy.worldPos[1], enemy.worldPos[2], 10)) {
          this.projectiles.splice(i, 1);
          this.assetMan.tryPlayAudio('fireball_hit');
          this.damageEnemiesInRadius(proj.worldPos, 64, 100);
          

          break;
        }
      }

      if (alive) {
        this.bbRenderables.push(proj);
      }
    }
  }

  damageEnemiesInRadius(pos: vec3, radius: number, damage: number) {
    for (let j = this.enemies.length - 1; j >= 0; --j) {
      const enemy = this.enemies[j];
      if (collideSS(pos[0], pos[1], pos[2], radius, enemy.worldPos[0], enemy.worldPos[1], enemy.worldPos[2], 10)) {
        enemy.hurt(damage);
        this.debrisMan.spawnMulti(DEBRIS_BONE, enemy.worldPos, 10, 2);
        this.debrisMan.spawnMulti(DEBRIS_EMBER, enemy.worldPos, 10);
        if (!enemy.alive) {
          this.enemies.splice(j, 1);
        }
      }
    }
  }
}
