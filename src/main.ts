import { AssetManager } from './assetmanager';
import Game from './game';

const mainMenu = document.getElementById('main-menu-container') as HTMLDivElement;
const playGameButton = document.getElementById('play-game') as HTMLButtonElement;
const loadingText = document.getElementById('loading');
const mainCanvas = document.getElementById('canvas') as HTMLCanvasElement;

const assetMan = new AssetManager();

assetMan.defineAssets([
  {name: 'placeholder', path: 'assets/dr2/placeholder.png', type: 'image'},
  {name: 'exitfloor', path: 'assets/dr2/overgrown_dirt.png', type: 'image'},
  {name: 'levelcomplete', path: 'assets/dr2/levelcomplete.ogg', type: 'audio'},
  {name: 'playerdeath', path: 'assets/dr2/playerdeath.ogg', type: 'audio'},
  {name: 'track0', path: 'assets/dr2/Track1_0.ogg', type: 'music'},
  {name: 'track1', path: 'assets/dr2/Track1_1.ogg', type: 'music'},
  {name: 'track2', path: 'assets/dr2/Track1_2.ogg', type: 'music'},
  {name: 'track3', path: 'assets/dr2/Track1_3.ogg', type: 'music'},
  {name: 'spellbook_v_idle', path: 'assets/dr2/hand1.png', type: 'image'},
  {name: 'spellbook_v_action', path: 'assets/dr2/hand3.png', type: 'image'},
  {name: 'fireball', path: 'assets/dr2/fireball.png', type: 'image'},
  {name: 'shoot', path: 'assets/dr2/shoot.ogg', type: 'audio'},
  {name: 'sky0', path: 'assets/dr2/sky0.png', type: 'image'},
  {name: 'sky1', path: 'assets/dr2/sky1.png', type: 'image'},
  {name: 'sword', path: 'assets/dr2/sword_world.png', type: 'image'},
  {name: 'spellbook', path: 'assets/dr2/spellbook_world.png', type: 'image'},
  {name: 'mana', path: 'assets/dr2/mana_world.png', type: 'image'},
  {name: 'pickup', path: 'assets/dr2/pickup.ogg', type: 'audio'},
  {name: 'sword_v_idle', path: 'assets/dr2/sword1.png', type: 'image'},
  {name: 'sword_v_action', path: 'assets/dr2/sword2.png', type: 'image'},
  {name: 'swing', path: 'assets/dr2/swing3.ogg', type: 'audio'},
  {name: 'bonethud', path: 'assets/dr2/bonethud.ogg', type: 'audio'},
  {name: 'fireball_launch', path: 'assets/dr2/fireball_launch.ogg', type: 'audio'},
  {name: 'fireball_channel', path: 'assets/dr2/fireball_channel.ogg', type: 'audio'},
  {name: 'fireball_hit', path: 'assets/dr2/fireball_hit.ogg', type: 'audio'},
  {name: 'bone', path: 'assets/dr2/bone.png', type: 'image'},
  {name: 'ember', path: 'assets/dr2/ember.png', type: 'image'},
  {name: 'death', path: 'assets/dr2/death2.png', type: 'image'},
  {name: 'overgrown_wall', path: 'assets/dr2/overgrown_wall.png', type: 'image'},
  {name: 'overgrown_dirt', path: 'assets/dr2/overgrown_dirt.png', type: 'image'},
  // must be 0 indexed
  {name: 'whisper0', path: 'assets/dr2/whisper1.ogg', type: 'audio'},
  {name: 'whisper1', path: 'assets/dr2/whisper2.ogg', type: 'audio'},
  {name: 'whisper2', path: 'assets/dr2/whisper3.ogg', type: 'audio'},
]);

assetMan.onReady(function() {
  playGameButton.style.display = 'block';
  loadingText.style.display = 'none';
});

assetMan.onProgress(function(current, total) {
  loadingText.textContent = `Loading...(${current}/${total})`;
});

assetMan.preload();

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
