import { AssetManager } from './assetmanager';
import Game from './game';

const mainMenu = document.getElementById('main-menu-container') as HTMLDivElement;
const playGameButton = document.getElementById('play-game') as HTMLButtonElement;
const loadingText = document.getElementById('loading');
const mainCanvas = document.getElementById('canvas') as HTMLCanvasElement;

const assetMan = new AssetManager();

assetMan.defineAssets([
  {name: 'placeholder', path: 'assets/dr2/placeholder.png', type: 'image'},
  {name: 'exitfloor', path: 'assets/dr2/placeholder.png', type: 'image'},

  {name: 'wall', path: 'assets/wall.png', type: 'image'},
  {name: 'stones', path: 'assets/stones.png', type: 'image'},
  {name: 'floor', path: 'assets/floor.png', type: 'image'},
  {name: 'death', path: 'assets/skull_front.png', type: 'image'},
  {name: 'music', path: 'assets/WorldOfDeath.ogg', type: 'music'},
  {name: 'loop2', path: 'assets/loop2.ogg', type: 'music'},
  {name: 'levelcomplete', path: 'assets/levelcomplete.ogg', type: 'audio'},
  {name: 'playerdeath', path: 'assets/death.ogg', type: 'audio'},
  
  {name: 'pillar', path: 'assets/pillar.png', type: 'image'},
  {name: 'bloodpillar', path: 'assets/bloodpillar.png', type: 'image'},
  {name: 'neongrass', path: 'assets/neongrass.png', type: 'image'},
  {name: 'bloodfloor', path: 'assets/bloodfloor.png', type: 'image'},

  // DR2 assets - TODO: delete everything above this line
  {name: 'track0', path: 'assets/dr2/Track1_0.ogg', type: 'music'},
  {name: 'track1', path: 'assets/dr2/Track1_1.ogg', type: 'music'},
  {name: 'track2', path: 'assets/dr2/Track1_2.ogg', type: 'music'},
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
