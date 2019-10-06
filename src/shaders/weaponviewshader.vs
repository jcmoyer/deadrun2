attribute vec4 position;
attribute vec2 texcoord;

uniform mat4 projection;

varying highp vec2 f_texcoord;

uniform mediump float swingProgress;

void main() {
  mediump vec4 swingPosition = position;
  swingPosition.x -= swingProgress;
  swingPosition.y -= swingProgress;

  gl_Position = projection * swingPosition;
  f_texcoord = texcoord;
}
