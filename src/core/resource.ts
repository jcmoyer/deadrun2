import { loadObj, Mesh } from '../objloader';

/*

- must be able to preload resources
- must be able to unload resources
- must be able to load resources asynchronously

*/

export class ResourceIndex {
  private resources = new Map<string, string>();

  addResource(name: string, path: string) {
    if (this.resources.has(name)) {
      throw new Error(`duplicate resource ${name}`);
    }
    this.resources.set(name, path);
  }

  getResourcePath(name: string): string {
    return this.resources.get(name);
  }

  getResources() {
    return this.resources.entries();
  }

  get size() {
    return this.resources.size;
  }
}

export interface ResourceEntry {
  name: string;
  path: string;
}

export function loadResourceIndexFromArray(entries: ResourceEntry[]): ResourceIndex {
  const index = new ResourceIndex();
  for (const ent of entries) {
    index.addResource(ent.name, ent.path);
  }
  return index;
}

export function loadResourceIndexFromPath(path: string): Promise<ResourceIndex> {
  return fetch(path).then(resp => resp.json())
                    .then(loadResourceIndexFromArray);
}

export class ResourceManager {
  protected index: ResourceIndex;

  protected audio: Map<string, AudioBuffer>;
  protected image: Map<string, HTMLImageElement>;
  protected model: Map<string, Mesh>;
  protected music: Map<string, HTMLAudioElement>;
  
  constructor(index: ResourceIndex) {
    this.index = index;
    this.audio = new Map();
    this.image = new Map();
    this.model = new Map();
    this.music = new Map();
  }

  preload(): Promise<any> {
    let remaining = this.index.size;

    return new Promise<any>((resolve) => {
      const resolveOne = () => {
        --remaining;
        if (remaining === 0) {
          resolve(null);
        }
      };

      for (const [name, path] of this.index.getResources()) {
        if (path.match(/\.obj$/)) {
          loadModel(path).then(mesh => {
            this.model.set(name, mesh);
            resolveOne();
          });
        } else if (path.match(/\.ogg$/)) {
          if (name.match(/^MUS_/)) {
            loadMusic(path).then(au => {
              this.music.set(name, au);
              resolveOne();
            });
          } else {
            loadAudio(path).then(au => {
              this.audio.set(name, au);
              resolveOne();
            });
          }
        } else if (path.match(/\.png$/)) {
          loadImage(path).then(im => {
            this.image.set(name, im);
            resolveOne();
          });
        }
      }
    });
  }
}

async function loadModel(path: string): Promise<Mesh> {
  const resp = await fetch(path);
  const text = await resp.text();
  const mesh = loadObj(text);
  return mesh;
}

function loadMusic(path: string): Promise<HTMLAudioElement> {
  const au = new Audio();
  return new Promise((resolve, reject) => {
    au.loop = true;
    au.src = path;
    // TODO: we resolve immediately because canplaythrough isn't always
    // emitted on chrome; need to investigate
    resolve(au);
  });
}

async function loadAudio(path: string): Promise<AudioBuffer> {
  // TODO: Move AudioContext elsewhere
  const ac = new AudioContext();
  const resp = await fetch(path);
  const buf = await resp.arrayBuffer();
  const audioBuf = await ac.decodeAudioData(buf);
  return audioBuf;
}

function loadImage(path: string): Promise<HTMLImageElement> {
  const im = new Image();
  return new Promise((resolve) => {
    im.onload = () => {
      resolve(im);
    };
    im.src = path;
  });
}
