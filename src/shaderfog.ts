export const fogFragmentShader = `
uniform highp vec4  fog_color;
uniform highp float fog_density;

highp vec4 mix_fog(highp vec4 base_color) {
  highp float dist = gl_FragCoord.z / gl_FragCoord.w;
  highp float fog  = 1.0 / exp(dist * fog_density) * 2.0;
  fog = clamp(fog, 0.0, 1.0);
  return mix(fog_color, base_color, fog);
}
`;
