const DRM_KEY_SYSTEMS = [
  ["clearkey",    "org.w3.clearkey"],
  ["widevine",    "com.widevine.alpha"],
  ["playready",   "com.microsoft.playready"],
  ["playready30", "com.microsoft.playready.recommendation"],
  ["fairplay",    "com.apple.fps"],
  ["fairplay10",  "com.apple.fps.1_0"],
  ["primetime",   "com.adobe.primetime"],
];

const DRM_BASE_CONFIGS = [{
  initDataTypes: ["cenc", "keyids", "webm"],
  videoCapabilities: [
    { contentType: 'video/mp4; codecs="avc1.42E01E"' },
    { contentType: 'video/mp4; codecs="avc1.4d401e"' },
    { contentType: 'video/webm; codecs="vp8"' },
    { contentType: 'video/webm; codecs="vp9"' },
    { contentType: 'video/webm; codecs="vp09.00.10.08"' },
  ],
  audioCapabilities: [
    { contentType: 'audio/mp4; codecs="mp4a.40.2"' },
    { contentType: 'audio/webm; codecs="vorbis"' },
    { contentType: 'audio/webm; codecs="opus"' },
  ],
}];

const DRM_WIDEVINE_ROBUSTNESS = [
  ["HW_SECURE_ALL",    "HW_SECURE_ALL"],
  ["HW_SECURE_DECODE", "HW_SECURE_DECODE"],
  ["HW_SECURE_CRYPTO", "HW_SECURE_CRYPTO"],
  ["SW_SECURE_DECODE", "SW_SECURE_DECODE"],
  ["SW_SECURE_CRYPTO", "SW_SECURE_CRYPTO"],
];
