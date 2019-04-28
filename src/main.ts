import { AssetManager } from './assetmanager';
import Game from './game';

const mainMenu = document.getElementById('main-menu-container') as HTMLDivElement;
const playGameButton = document.getElementById('play-game') as HTMLButtonElement;
const loadingText = document.getElementById('loading');
const mainCanvas = document.getElementById('canvas') as HTMLCanvasElement;

const assetMan = new AssetManager();

assetMan.defineAssets([
  {name: 'wall', path: 'assets/wall.png', type: 'image'},
  {name: 'stones', path: 'assets/stones.png', type: 'image'},
  {name: 'floor', path: 'assets/floor.png', type: 'image'},
  {name: 'death', path: 'assets/skull_front.png', type: 'image'},
  {name: 'music', path: 'assets/WorldOfDeath.ogg', type: 'music'},
  {name: 'loop2', path: 'assets/loop2.ogg', type: 'music'},
  {name: 'levelcomplete', path: 'assets/levelcomplete.ogg', type: 'audio'},
  {name: 'playerdeath', path: 'assets/death.ogg', type: 'audio'},
  {name: 'exitfloor', path: 'assets/exit.png', type: 'image'},
  {name: 'pillar', path: 'assets/pillar.png', type: 'image'},
  {name: 'bloodpillar', path: 'assets/bloodpillar.png', type: 'image'},
  {name: 'neongrass', path: 'assets/neongrass.png', type: 'image'},
  {name: 'bloodfloor', path: 'assets/bloodfloor.png', type: 'image'},

  {name: 'chant0', path: 'assets/chant0.ogg', type: 'audio'},
  {name: 'chant1', path: 'assets/chant1.ogg', type: 'audio'},
  {name: 'chant2', path: 'assets/chant2.ogg', type: 'audio'},



  
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
