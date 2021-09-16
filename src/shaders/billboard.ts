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
  uRotation: WebGLUniformLocation;
  uFogColor: WebGLUniformLocation;
  uFogDensity: WebGLUniformLocation;
  uLights: WebGLUniformLocation;
  uDeathTexture: WebGLUniformLocation;
  uBillboardFlash: WebGLUniformLocation;
  uBillboardAlpha: WebGLUniformLocation;

  
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
uniform highp float rotation;

varying highp vec2 f_texcoord;
varying highp vec4 f_position;

void main() {
  highp vec4 rotated_pos = position;
  highp float p_angle = atan(position.y, position.x);
  rotated_pos.x = cos(p_angle + rotation);
  rotated_pos.y = sin(p_angle + rotation);

  mat4 mv = view * model;
  mv[0] = vec4(scale.x, 0, 0, 0);
  mv[1] = vec4(0, scale.y, 0, 0);
  mv[2] = vec4(0, 0, 1, 0);
  gl_Position = projection * mv * rotated_pos;
  f_texcoord = texcoord;

  f_position = model * rotated_pos;
}

`;
  static fsSource = `
uniform highp vec4  fogColor;
uniform highp float fogDensity;

highp vec4 mix_fog(highp vec4 base_color) {
  highp float dist = gl_FragCoord.z / gl_FragCoord.w;
  highp float fog  = 1.0 / exp(dist * fogDensity);
  fog = clamp(fog, 0.0, 1.0);
  return mix(fogColor, base_color, fog);
}

uniform highp vec4 lights[16];

highp vec3 mixLight(highp vec3 fragment, highp vec3 position) {
  for (int i = 0; i < 16; ++i) {
    highp float d = distance(lights[i].xyz, position);
    highp float a = (lights[i].w - d) / (lights[i].w + 0.001);
    a = clamp(a, 0.0, 1.0);
    fragment = mix(fragment, vec3(0.85, 0.55, 0.18), a);
  }
  return fragment;
}


uniform sampler2D deathTexture;

varying highp vec2 f_texcoord;
varying highp vec4 f_position;

uniform highp float billboardFlash;
uniform highp float billboardAlpha;

void main() {
  highp vec4 base_color = texture2D(deathTexture, f_texcoord);

  highp vec4 with_flash = mix(base_color, vec4(1, 1, 1, 1), billboardFlash);

  gl_FragColor = mix_fog(with_flash);
  gl_FragColor.rgb = mixLight(gl_FragColor.rgb, f_position.xyz);
  gl_FragColor.a = base_color.a;
  gl_FragColor.a *= billboardAlpha;
}

`;
}
