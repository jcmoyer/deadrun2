attribute vec4 basePosition;
attribute highp float yOffset0;
attribute highp float yOffset1;
attribute highp float rotation;

uniform mat4 model;
uniform mat4 view;
uniform mat4 projection;

uniform highp float interpolation;

void main() {
  vec4 interp_pos = basePosition;
  interp_pos.y += mix(yOffset0, yOffset1, interpolation);

  // translate the model matrix relative to this vertex instead of the emitter so that
  // rotations are about the particle center rather than the emitter center
  vec4 model_offset = vec4(
    cos(rotation) * 8.0,
    0,
    sin(rotation) * 8.0,
    0
  );

  mat4 model_t = model;
  model_t[3] += model_offset;

  // compute the model-view matrix using the offset model matrix and discard the rotation submatrix
  mat4 mv = view * model_t;
  mv[0] = vec4(1, 0, 0, 0);
  mv[1] = vec4(0, 1, 0, 0);
  mv[2] = vec4(0, 0, 1, 0);

  gl_Position = projection * mv * interp_pos;
}
