const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo preserving default watch folders
config.watchFolders = Array.from(new Set([...(config.watchFolders || []), monorepoRoot]));

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules/.pnpm/node_modules'),
];

let assetsRegistryPath;
try {
  assetsRegistryPath = path.dirname(
    require.resolve('@react-native/assets-registry/package.json', {
      paths: [
        projectRoot,
        monorepoRoot,
        path.resolve(monorepoRoot, 'node_modules/.pnpm/node_modules'),
      ],
    }),
  );
} catch {
  // fallback if needed
}

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  ...(assetsRegistryPath ? { '@react-native/assets-registry': assetsRegistryPath } : {}),
};

module.exports = config;
