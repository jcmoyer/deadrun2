// Autogenerated file
import ShaderProgram from '../shaderprogram';

export default class Shader extends ShaderProgram {
  aPosition: number;
  aTexcoord: number;

  uView: WebGLUniformLocation;
  uProjection: WebGLUniformLocation;
  uModel: WebGLUniformLocation;
  uScale: WebGLUniformLocation;
  uInterpolation: WebGLUniformLocation;
  uFogColor: WebGLUniformLocation;
  uFogDensity: WebGLUniformLocation;
  uDeathTexture: WebGLUniformLocation;
  uBillboardFlash: WebGLUniformLocation;

  
  constructor(gl: WebGLRenderingContext) {
    super(gl, Shader.vsSource, Shader.fsSource);
  }
  

  static vsSource = `
attribute vec4 position;
attribute vec2 texcoord;

uniform mat4 view;
uniform mat4 projection;
uniform mat4 model;
uniform vec2 scale;

uniform highp float interpolation;

varying highp vec2 f_texcoord;

void main() {
  mat4 mv = view * model;
  mv[0] = vec4(scale.x, 0, 0, 0);
  mv[1] = vec4(0, scale.y, 0, 0);
  mv[2] = vec4(0, 0, 1, 0);
  gl_Position = projection * mv * position;
  f_texcoord = texcoord;
}

`;
  static fsSource = `
uniform highp vec4  fogColor;
uniform highp float fogDensity;

highp vec4 mix_fog(highp vec4 base_color) {
  highp float dist = gl_FragCoord.z / gl_FragCoord.w;
  highp float fog  = 1.0 / exp(dist * fogDensity) * 2.0;
  fog = clamp(fog, 0.0, 1.0);
  return mix(fogColor, base_color, fog);
}


uniform sampler2D deathTexture;

varying highp vec2 f_texcoord;

uniform highp float billboardFlash;

void main() {
  highp vec4 base_color = texture2D(deathTexture, f_texcoord);

  if (base_color.a < 0.05)
    discard;

  base_color = mix(base_color, vec4(1, 1, 1, 1), billboardFlash);

  gl_FragColor = mix_fog(base_color);
  gl_FragColor.a = base_color.a;
}

`;
}
