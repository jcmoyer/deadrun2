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
