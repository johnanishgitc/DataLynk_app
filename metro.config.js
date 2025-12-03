// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Remove 'wasm' from assetExts so it can be processed as a source file
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'wasm');

// Add 'wasm' to sourceExts so Metro can resolve it
if (!config.resolver.sourceExts.includes('wasm')) {
  config.resolver.sourceExts.push('wasm');
}

module.exports = config;

