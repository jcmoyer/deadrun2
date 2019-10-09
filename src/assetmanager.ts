import { loadObj, Mesh } from './objloader';

interface AssetReference {
  name: string;
  path: string;
  type: 'image' | 'audio' | 'music' | 'model';
}

type AssetData = HTMLImageElement | HTMLAudioElement | Mesh;

class Asset {
  name: string;
  path: string;
  type: 'image' | 'audio' | 'music' | 'model';
  data: HTMLImageElement | HTMLAudioElement | Mesh;
}

export class AssetManager {
  private assets: Map<string, Asset>;
  private pending: number = 0;
  private onReadyCallback: () => void;
  private onProgressCallback: (remain: number, total: number) => void;
  private assetsToLoadCount: number = 0;

  constructor() {
    this.assets = new Map();
  }

  defineAssets(refs: AssetReference[]) {
    for (let ref of refs) {
      this.handleAsset(ref);
    }
  }

  handleAsset(ref: AssetReference) {
    let rawAsset: AssetData;
    const asset = new Asset();

    if (ref.type === 'audio' || ref.type === 'music') {
      rawAsset = new Audio();
      if (ref.type === 'music') {
        rawAsset.loop = true;
      } else {
        // load entire audio file so it's ready
        rawAsset.preload = 'auto';
      }
      // TODO audio loading is async but we may want to preload some small sfx later?
      rawAsset.addEventListener('load', this.onAssetLoaded.bind(this));
      asset.data = rawAsset;
    } else if (ref.type === 'image') {
      rawAsset = new Image();
      ++this.pending;
      ++this.assetsToLoadCount;
      rawAsset.addEventListener('load', this.onAssetLoaded.bind(this));
      asset.data = rawAsset;
    } else if (ref.type === 'model') {
      fetch(ref.path).then(resp => resp.text()).then(text => loadObj(text)).then(m => {
        asset.data = m;
        this.onAssetLoaded();
      });
    }
    asset.name = ref.name;
    asset.path = ref.path;
    asset.type = ref.type;
    this.assets.set(ref.name, asset);
  }

  preload() {
    for (let asset of this.assets.values()) {
      // initiates a browser request to actually load the asset
      if (asset.data instanceof HTMLImageElement || asset.data instanceof HTMLAudioElement) {
        asset.data.src = asset.path;
      }
    }
  }

  onProgress(f: typeof AssetManager.prototype.onProgressCallback) {
    this.onProgressCallback = f;
  }

  onReady(f: typeof AssetManager.prototype.onReadyCallback) {
    this.onReadyCallback = f;
  }

  getImage(name: string) {
    const asset = this.assets.get(name);
    if (asset.type !== 'image') {
      throw new Error('expected image');
    }
    return asset.data as HTMLImageElement;
  }

  getAudio(name: string) {
    const asset = this.assets.get(name);
    if (asset.type !== 'audio' && asset.type !== 'music') {
      throw new Error('expected audio');
    }
    return asset.data as HTMLAudioElement;
  }

  private onAssetLoaded() {
    --this.pending;
    this.onProgressCallback(this.assetsToLoadCount - this.pending, this.assetsToLoadCount);
    if (this.pending === 0) {
      this.onReadyCallback();
    }
  }

  tryPlayAudio(name: string) {
    const audio = this.getAudio(name);
    try {
      audio.currentTime = 0;
      audio.play();
    } catch {

    }
  }

  getModel(name: string) {
    const asset = this.assets.get(name);
    if (asset.type !== 'model') {
      throw new Error('expected model');
    }
    return asset.data as Mesh;
  }
}
