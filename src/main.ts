import { AssetManager } from './assetmanager';
import Game from './game';
import { loadResourceIndexFromArray } from './core/resource';

const mainMenu = document.getElementById('main-menu-container') as HTMLDivElement;
const playGameButton = document.getElementById('play-game') as HTMLButtonElement;
const loadingText = document.getElementById('loading');
const mainCanvas = document.getElementById('canvas') as HTMLCanvasElement;

const resources = loadResourceIndexFromArray([
  {name: 'placeholder', path: 'assets/dr2/placeholder.png'},
  {name: 'exitfloor', path: 'assets/dr2/overgrown_dirt.png'},
  {name: 'levelcomplete', path: 'assets/dr2/levelcomplete.ogg'},
  {name: 'playerdeath', path: 'assets/dr2/playerdeath.ogg'},
  {name: 'MUS_track0', path: 'assets/dr2/Track1_0.ogg'},
  {name: 'MUS_track1', path: 'assets/dr2/Track1_1.ogg'},
  {name: 'MUS_track2', path: 'assets/dr2/Track1_2.ogg'},
  {name: 'MUS_track3', path: 'assets/dr2/Track1_3.ogg'},
  {name: 'spellbook_v_idle', path: 'assets/dr2/hand1.png'},
  {name: 'spellbook_v_action', path: 'assets/dr2/hand3.png'},
  {name: 'fireball', path: 'assets/dr2/fireball.png'},
  {name: 'shoot', path: 'assets/dr2/shoot.ogg'},
  {name: 'sky0', path: 'assets/dr2/sky0.png'},
  {name: 'sky1', path: 'assets/dr2/sky1.png'},
  {name: 'sword', path: 'assets/dr2/sword_world.png'},
  {name: 'spellbook', path: 'assets/dr2/spellbook_world.png'},
  {name: 'mana', path: 'assets/dr2/mana_world.png'},
  {name: 'pickup', path: 'assets/dr2/pickup.ogg'},
  {name: 'sword_v_idle', path: 'assets/dr2/sword1.png'},
  {name: 'sword_v_action', path: 'assets/dr2/sword2.png'},
  {name: 'swing', path: 'assets/dr2/swing3.ogg'},
  {name: 'bonethud', path: 'assets/dr2/bonethud.ogg'},
  {name: 'fireball_launch', path: 'assets/dr2/fireball_launch.ogg'},
  {name: 'fireball_channel', path: 'assets/dr2/fireball_channel.ogg'},
  {name: 'fireball_hit', path: 'assets/dr2/fireball_hit.ogg'},
  {name: 'bone', path: 'assets/dr2/bone2.png'},
  {name: 'ember', path: 'assets/dr2/ember.png'},
  {name: 'death', path: 'assets/dr2/death2.png'},
  {name: 'overgrown_wall', path: 'assets/dr2/overgrown_wall.png'},
  {name: 'overgrown_dirt', path: 'assets/dr2/overgrown_dirt.png'},
  // must be 0 indexed
  {name: 'whisper0', path: 'assets/dr2/whisper1.ogg'},
  {name: 'whisper1', path: 'assets/dr2/whisper2.ogg'},
  {name: 'whisper2', path: 'assets/dr2/whisper3.ogg'},
  {name: 'smoke', path: 'assets/dr2/smoke.png'},
  {name: 'tile', path: 'assets/dr2/tower.obj'},
  {name: 'tile5', path: 'assets/dr2/meshes/tile5.obj'},
  {name: 'tile0', path: 'assets/dr2/meshes/tile0.obj'},

  {name: 'ashenwood', path: 'assets/dr2/ashenwood512.png'},
  {name: 'tree', path: 'assets/dr2/meshes/tree.obj'},

  {name: 'postwall_t', path: 'assets/dr2/meshes/postwall.png'},
  {name: 'postwall_m', path: 'assets/dr2/meshes/postwall.obj'},

  {name: 'gravehouse', path: 'assets/dr2/meshes/gravehouse.obj'},

  {name: 'skydome', path: 'assets/dr2/meshes/skydome.obj'},
]);

const assetMan = new AssetManager(resources);

assetMan.preload().then(() => {
  playGameButton.style.display = 'block';
  loadingText.style.display = 'none';
});

function onWinGame() {
  const winContainer = document.getElementById('game-win-container') as HTMLDivElement;
  mainCanvas.style.display = 'none';
  winContainer.style.display = 'flex';
}

function startGame() {
  mainMenu.style.display = 'none';
  mainCanvas.style.display = 'block';
  mainCanvas.focus();
  const g = new Game(mainCanvas, assetMan);
  g.onGameFinished(onWinGame);
  g.run();
}

playGameButton.addEventListener('click', startGame);
