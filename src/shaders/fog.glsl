uniform highp vec4  fogColor;
uniform highp float fogDensity;

highp vec4 mix_fog(highp vec4 base_color) {
  highp float dist = gl_FragCoord.z / gl_FragCoord.w;
  highp float fog  = 1.0 / exp(dist * fogDensity);
  fog = clamp(fog, 0.0, 1.0);
  return mix(fogColor, base_color, fog);
}
