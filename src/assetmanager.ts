import { loadObj, Mesh } from './objloader';
import { ResourceManager, ResourceIndex } from './core/resource';
import { vec3 } from 'gl-matrix';

export class AssetManager extends ResourceManager {
  private ac = new AudioContext();

  constructor(index: ResourceIndex) {
    super(index);
  }

  getImage(name: string): HTMLImageElement {
    return this.image.get(name);
  }

  getAudio(name: string): AudioBuffer {
    return this.audio.get(name);
  }

  getMusic(name: string): HTMLAudioElement {
    return this.music.get(name);
  }

  tryPlayAudio(name: string) {
    const audio = this.getAudio(name);

    const source = this.ac.createBufferSource();
    source.buffer = audio;
    source.connect(this.ac.destination);
    source.start();
  }

  tryPlayAudio3D(name: string, soundX: number, soundY: number, soundZ: number) {
    const audio = this.getAudio(name);

    const soundPos = vec3.fromValues(soundX, soundY, soundZ);

    const source = this.ac.createBufferSource();
    const panner = this.ac.createPanner();
    panner.positionX.value = soundPos[0];
    panner.positionY.value = soundPos[1];
    panner.positionZ.value = soundPos[2];
    
    panner.distanceModel = 'linear';

    source.buffer = audio;

    source.connect(panner);
    panner.connect(this.ac.destination);
    source.start();
  }

  updateListener(pos: vec3, forward: vec3) {
    // these functions are deprecated but firefox has not implemented the more
    // modern variant
    this.ac.listener.setPosition(pos[0], pos[1], pos[2]);
    this.ac.listener.setOrientation(
      forward[0], forward[1], forward[2],
      0, 1, 0
    );
    /*
    this.ac.listener.positionX.value = pos[0];
    this.ac.listener.positionY.value = pos[1];
    this.ac.listener.positionZ.value = pos[2];
    this.ac.listener.forwardX.value = forward[0];
    this.ac.listener.forwardY.value = forward[1];
    this.ac.listener.forwardZ.value = forward[2];
    this.ac.listener.upX.value = 0;
    this.ac.listener.upY.value = 1;
    this.ac.listener.upZ.value = 0;
    */
  }

  getModel(name: string): Mesh {
    return this.model.get(name);
  }
}
