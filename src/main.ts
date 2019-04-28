import { AssetManager } from './assetmanager';
import Game from './game';

const mainMenu = document.getElementById('main-menu-container') as HTMLDivElement;
const playGameButton = document.getElementById('play-game') as HTMLButtonElement;
const loadingText = document.getElementById('loading');
const mainCanvas = document.getElementById('canvas') as HTMLCanvasElement;

const assetMan = new AssetManager();

assetMan.defineAssets([
  {name: 'wall', path: 'assets/wall.png', type: 'image'},
  {name: 'floor', path: 'assets/floor.png', type: 'image'},
  {name: 'death', path: 'assets/skull_front.png', type: 'image'},
  {name: 'music', path: 'assets/WorldOfDeath.ogg', type: 'audio'},
  {name: 'levelcomplete', path: 'assets/levelcomplete.ogg', type: 'audio'},
  {name: 'playerdeath', path: 'assets/death.ogg', type: 'audio'},
  {name: 'exitfloor', path: 'assets/exit.png', type: 'image'},
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
