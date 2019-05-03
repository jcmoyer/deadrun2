interface AssetReference {
  name: string;
  path: string;
  type: 'image' | 'audio' | 'music';
}

type AssetData = HTMLImageElement | HTMLAudioElement;

class Asset {
  name: string;
  path: string;
  loaded: boolean;
  type: 'image' | 'audio' | 'music';
  data: HTMLImageElement | HTMLAudioElement;
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
    if (ref.type === 'audio' || ref.type === 'music') {
      rawAsset = new Audio();
      if (ref.type === 'music') {
        rawAsset.loop = true;
      } else {
        // load entire audio file so it's ready
        rawAsset.preload = 'auto';
      }
      // TODO audio loading is async but we may want to preload some small sfx later?
    } else if (ref.type === 'image') {
      rawAsset = new Image();
      ++this.pending;
      ++this.assetsToLoadCount;
    }
    rawAsset.addEventListener('load', this.onAssetLoaded.bind(this));
    const asset = new Asset();
    asset.name = ref.name;
    asset.path = ref.path;
    asset.loaded = false;
    asset.data = rawAsset;
    asset.type = ref.type;
    this.assets.set(ref.name, asset);
  }

  preload() {
    for (let asset of this.assets.values()) {
      // initiates a browser request to actually load the asset
      asset.data.src = asset.path;
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
      audio.play();
    } catch {

    }
  }
}
