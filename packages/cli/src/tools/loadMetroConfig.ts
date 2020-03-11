/**
 * Configuration file of Metro.
 */
import path from 'path';
// @ts-ignore - no typed definition for the package
import {loadConfig} from 'metro-config';
import {Config} from '@react-native-community/cli-types';
import findSymlinkedModules from './findSymlinkedModules';

function resolveSymlinksForRoots(roots: string[]): string[] {
  return roots.reduce<string[]>(
    (arr, rootPath) => arr.concat(findSymlinkedModules(rootPath, roots)),
    [...roots],
  );
}

function getWatchFolders(): string[] {
  const root = process.env.REACT_NATIVE_APP_ROOT;
  return root ? resolveSymlinksForRoots([path.resolve(root)]) : [];
}

const INTERNAL_CALLSITES_REGEX = new RegExp(
  [
    '/Libraries/Renderer/implementations/.+\\.js$',
    '/Libraries/BatchedBridge/MessageQueue\\.js$',
    '/Libraries/YellowBox/.+\\.js$',
    '/Libraries/LogBox/.+\\.js$',
    '/Libraries/Core/Timers/.+\\.js$',
    '/node_modules/react-devtools-core/.+\\.js$',
    '/node_modules/react-refresh/.+\\.js$',
    '/node_modules/scheduler/.+\\.js$',
  ].join('|'),
);

export interface MetroConfig {
  resolver: {
    resolverMainFields: string[];
    platforms: string[];
  };
  serializer: {
    getModulesRunBeforeMainModule: () => string[];
    getPolyfills: () => any;
  };
  server: {
    port: number;
    enhanceMiddleware?: Function;
  };
  symbolicator: {
    customizeFrame: (frame: {file: string | null}) => {collapse: boolean};
  };
  transformer: {
    babelTransformerPath: string;
    assetRegistryPath: string;
    assetPlugins?: Array<string>;
  };
  watchFolders: string[];
  reporter?: any;
}

/**
 * Default configuration
 */
export const getDefaultConfig = (ctx: Config): MetroConfig => {
  return {
    resolver: {
      resolverMainFields: ['react-native', 'browser', 'main'],
      platforms: [...Object.keys(ctx.platforms), 'native'],
    },
    serializer: {
      getModulesRunBeforeMainModule: () => [
        require.resolve(
          path.join(ctx.reactNativePath, 'Libraries/Core/InitializeCore'),
        ),
      ],
      getPolyfills: () =>
        require(path.join(ctx.reactNativePath, 'rn-get-polyfills'))(),
    },
    server: {
      port: Number(process.env.RCT_METRO_PORT) || 8081,
    },
    symbolicator: {
      customizeFrame: (frame: {file: string | null}) => {
        const collapse = Boolean(
          frame.file && INTERNAL_CALLSITES_REGEX.test(frame.file),
        );
        return {collapse};
      },
    },
    transformer: {
      babelTransformerPath: require.resolve(
        'metro-react-native-babel-transformer',
      ),
      assetRegistryPath: path.join(
        ctx.reactNativePath,
        'Libraries/Image/AssetRegistry',
      ),
    },
    watchFolders: getWatchFolders(),
  };
};

export interface ConfigOptionsT {
  maxWorkers?: number;
  port?: number;
  projectRoot?: string;
  resetCache?: boolean;
  watchFolders?: string[];
  sourceExts?: string[];
  reporter?: any;
  config?: string;
}

/**
 * Loads Metro Config and applies `options` on top of the resolved config.
 *
 * This allows the CLI to always overwrite the file settings.
 */
export default function load(
  ctx: Config,
  options?: ConfigOptionsT,
): Promise<MetroConfig> {
  const defaultConfig = getDefaultConfig(ctx);
  if (options && options.reporter) {
    defaultConfig.reporter = options.reporter;
  }
  return loadConfig({cwd: ctx.root, ...options}, defaultConfig);
}
