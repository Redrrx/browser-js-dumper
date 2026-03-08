const GPU_FP_BIAS  = 8.0;
const GPU_FP_RANGE = 16.0;

const GPU_FP_TESTS = [
  // [name, glsl_expr_using_u_a_and_u_b,  a_val,              b_val]
  ["sin",          "sin(u_a)",                        0.5,              0.0],
  ["cos",          "cos(u_a)",                        0.5,              0.0],
  ["tan",          "tan(u_a)",                        0.5,              0.0],
  ["asin",         "asin(u_a)",                       0.5,              0.0],
  ["acos",         "acos(u_a)",                       0.5,              0.0],
  ["atan1",        "atan(u_a)",                       1.0,              0.0],
  ["atan2",        "atan(u_a, u_b)",                  1.0,              2.0],
  ["exp",          "exp(u_a)",                        1.0,              0.0],
  ["log",          "log(u_a)",                        2.718281828,      0.0],
  ["exp2",         "exp2(u_a)",                       2.5,              0.0],
  ["log2",         "log2(u_a)",                       5.0,              0.0],
  ["sqrt",         "sqrt(u_a)",                       2.0,              0.0],
  ["inversesqrt",  "inversesqrt(u_a)",                2.0,              0.0],
  ["pow",          "pow(u_a, u_b)",                   2.0,              0.333333343],
  ["fma",          "u_a * u_b + u_a",                 1.0000001,        2.0000002],
  ["sum_fp",       "u_a + u_b",                       0.1,              0.2],
  ["fract",        "fract(u_a)",                      3.14159265358979, 0.0],
  ["mod",          "mod(u_a, u_b)",                   10.5,             3.0],
  ["smoothstep",   "smoothstep(0.0, u_b, u_a)",       0.5,              1.0],
  ["mix",          "mix(u_a, u_b, 0.3)",              1.0,              4.0],
  ["normalize_x",  "normalize(vec2(u_a, u_b)).x",     3.0,              4.0],
  ["length_2d",    "length(vec2(u_a, u_b))",          3.0,              4.0],
  ["dot_2d",       "dot(vec2(u_a,u_a),vec2(u_b,u_b))", 0.5,            0.7],
  ["reflect_x",    "reflect(vec2(u_a,0.0),normalize(vec2(u_b,u_b))).x", 1.0, 1.0],
  ["cross_z",      "cross(vec3(u_a,u_b,0.0),vec3(u_b,u_a,0.0)).z",     0.6, 0.8],
];
