import * as glm from 'gl-matrix';
import * as glutil from './glutil';
import {Player} from './player';

const deathVS = `
attribute vec4 position;
attribute vec4 prev_position;

uniform mat4 view;
uniform mat4 projection;

uniform highp float interpolation;
uniform highp float sprite_scale;

void main() {
  vec4 interp_pos = mix(prev_position, position, interpolation);
  gl_Position = projection * view * interp_pos;
  gl_PointSize = sprite_scale / gl_Position.w;
}
`;

const deathFS = `
uniform sampler2D death_texture;

uniform highp vec4  fog_color;

void main() {
  highp float dist = gl_FragCoord.z / gl_FragCoord.w;
  highp float fog  = 1.0 / exp(dist * 0.03) * 2.0;
  fog              = clamp(fog, 0.0, 1.0);

  highp vec2 texcoord   = gl_PointCoord;
  highp vec4 base_color = texture2D(death_texture, texcoord);

  gl_FragColor = mix(fog_color, base_color, fog);
  gl_FragColor.a = base_color.a;
}
`;

export class Death {
  public prevWorldPos: glm.vec3;
  public worldPos: glm.vec3;
  private velocity: glm.vec3;

  constructor() {
    this.worldPos = glm.vec3.create();
    this.velocity = glm.vec3.create();
    this.prevWorldPos = glm.vec3.create();
  }

  beginUpdate() {
    glm.vec3.copy(this.prevWorldPos, this.worldPos);
  }

  update(player: Player) {
    this.beginUpdate();
    const dx = player.getWorldX();
    const dy = player.getWorldZ();
    glm.vec3.set(this.velocity, dx - this.worldPos[0], 0, dy - this.worldPos[2]);
    glm.vec3.normalize(this.velocity, this.velocity);
    glm.vec3.scale(this.velocity, this.velocity, 0.2);
    glm.vec3.add(this.worldPos, this.worldPos, this.velocity);

    this.worldPos[1] = 16 + Math.sin(Date.now() / 1000) * 2;
  }

  setWorldPos(x, z) {
    this.worldPos[0] = x;
    this.worldPos[1] = 16;
    this.worldPos[2] = z;
  }

  getWorldX() {
    return this.worldPos[0];
  }

  getWorldZ() {
    return this.worldPos[2];
  }
}

export class DeathRenderer {
  private gl: WebGLRenderingContext;
  private texture: WebGLTexture;
  private program: WebGLProgram;
  private pointBuffer: WebGLBuffer;

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.pointBuffer = gl.createBuffer();
    this.program = glutil.buildProgram(gl, deathVS, deathFS);
  }

  setTexture(t: WebGLTexture) {
    this.texture = t;
  }

  render(death: Death, view: glm.mat4, proj: glm.mat4, fogColor: number[], alpha: number) {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pointBuffer);

    const pointData = new Float32Array([
      // TODO previous position (also change pointers below)
      death.prevWorldPos[0], death.prevWorldPos[1], death.prevWorldPos[2],
      // latest position
      death.worldPos[0], death.worldPos[1], death.worldPos[2]
    ]);

    gl.bufferData(gl.ARRAY_BUFFER, pointData, gl.STREAM_DRAW);

    const positionAttrib = gl.getAttribLocation(this.program, 'position');
    const prevPositionAttrib = gl.getAttribLocation(this.program, 'prev_position');

    const viewUni = gl.getUniformLocation(this.program, 'view');
    const projUni = gl.getUniformLocation(this.program, 'projection');
    const interpolationUni = gl.getUniformLocation(this.program, 'interpolation');
    const fogColorUni = gl.getUniformLocation(this.program, 'fog_color');
    const spriteScaleUni = gl.getUniformLocation(this.program, 'sprite_scale');

    gl.enableVertexAttribArray(positionAttrib);
    gl.vertexAttribPointer(positionAttrib, 3, gl.FLOAT, false, 0, 12);
    gl.enableVertexAttribArray(prevPositionAttrib);
    gl.vertexAttribPointer(prevPositionAttrib, 3, gl.FLOAT, false, 0, 0);

    gl.uniformMatrix4fv(viewUni, false, view);
    gl.uniformMatrix4fv(projUni, false, proj);
    gl.uniform1f(interpolationUni, alpha);
    gl.uniform4f(fogColorUni,
      fogColor[0],
      fogColor[1],
      fogColor[2],
      fogColor[3]
    );
    // don't ask
    gl.uniform1f(spriteScaleUni, 14096);
    
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.drawArrays(gl.POINTS, 0, 1);
  }
}
