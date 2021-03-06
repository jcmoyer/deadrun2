// Autogenerated file
import ShaderProgram from '../shaderprogram';

export default class Shader extends ShaderProgram {
  aPosition: number;
  aTexcoord: number;

  uProjection: WebGLUniformLocation;
  uScreenTexture: WebGLUniformLocation;
  uColor: WebGLUniformLocation;
  uColorMix: WebGLUniformLocation;

  
  constructor(gl: WebGLRenderingContext) {
    super(gl, Shader.vsSource, Shader.fsSource);
  }
  

  static vsSource = `
attribute vec4 position;
attribute vec2 texcoord;

uniform mat4 projection;

varying highp vec2 f_texcoord;

void main() {
  gl_Position = projection * position;
  f_texcoord = texcoord;
}

`;
  static fsSource = `
varying highp vec2 f_texcoord;
uniform sampler2D screenTexture;

uniform highp vec4  color;
uniform highp float colorMix;

void main() {
  gl_FragColor = mix(texture2D(screenTexture, f_texcoord), color, colorMix);
}

`;
}
