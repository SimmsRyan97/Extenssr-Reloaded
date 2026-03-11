import path from 'path'
import { Configuration, DefinePlugin, WebpackPluginInstance } from 'webpack'
import CopyWebpackPlugin from 'copy-webpack-plugin'
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin'
import generateManifest, { ManifestVersion } from './manifest_gen'
import DebuggerPlugin from './debugger_plugin'
import ZipPlugin from 'zip-webpack-plugin'

export default function genConfig(distDir: string, clientId: string, manifestVersion: ManifestVersion, key?: string, guid?: string, forceDebug = false): Configuration {
    const rootDir: string = path.resolve(__dirname, 'src')
    const contentPath = path.join(rootDir, 'content_main.ts')
    const workerPath = path.join(rootDir, 'worker_main.ts')
    const aiWorkerPath = path.join(rootDir, 'injected_scripts','ai_worker.ts')
    const popupPath = path.join(rootDir, 'popup_main.tsx')
    const injectMainPath = path.join(rootDir, 'inject_main.ts')
    const distZip = distDir + '.zip'
    const config: Configuration = {
        performance: {
            maxAssetSize: 24 * 1024 * 1024,
            maxEntrypointSize: 2 * 1024 * 1024,
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'ts-loader',
                        options: { configFile: 'tsconfig.bundle.json' },
                    }
                },
                {
                    test: /\.glsl/,
                    type: 'asset/source'
                },
            ],
        },
        resolve: {
            extensions: ['.ts', '.js', '.tsx', '.glsl'],
            plugins: [new TsconfigPathsPlugin()],
            alias: {
                '@mui/styled-engine': '@mui/styled-engine-sc'
            }
        },
        entry: {
            'content': contentPath,
            'worker': workerPath,
            'popup': popupPath,
            'inject_main': injectMainPath,
            'ai_worker': aiWorkerPath,
        },
        node: {
            global: false,
        },
        output: {
            path: distDir,
            filename: '[name].bundle.js'
        },
        devtool: 'source-map',
        plugins: [
            new DefinePlugin({
                __CLIENT_ID__: `'${clientId}'`,
                DEBUGGING: process.argv.includes('--mode=development') || forceDebug,
                DEBUG_PORT: parseInt(process.env.DEBUG_PORT || '8888'),
            }),
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: 'package.json',
                        to: path.join(distDir, 'manifest.json'),
                        transform: (content) => {
                            const pkg = JSON.parse(content.toString())
                            const manifest = generateManifest(manifestVersion, pkg)
                            if (key) {
                                manifest['key'] = key
                            }
                            if (manifestVersion === 2) {
                                const geckoSettings: any = {
                                    data_collection_permissions: {
                                        required: ['none'],
                                        optional: [],
                                    }
                                }
                                if (guid) {
                                    geckoSettings.id = guid
                                }
                                manifest['browser_specific_settings'] = { gecko: geckoSettings } as any
                            }
                            return JSON.stringify(manifest)
                        }
                    },
                    {
                        from: 'html',
                        to: distDir,
                    },
                    {
                        from: 'icons',
                        to: path.join(distDir, 'icons'),
                    },
                    {
                        from: 'geojson_data',
                        to: path.join(distDir, 'geojson_data'),
                    },
                    {
                        from: 'css',
                        to: path.join(distDir, 'css'),
                    },
                    {
                        from: 'node_modules/xterm/css/xterm.css',
                        to: path.join(distDir, 'css'),
                    },
                    {
                        from: 'node_modules/onnxruntime-web/dist',
                        filter: (pathString) => pathString.endsWith('.wasm'),
                        to: path.join(distDir, 'wasm')
                    },
                    {
                        from: 'models',
                        filter: (pathString) => pathString.endsWith('.onnx'),
                        to: path.join(distDir, 'models')
                    }
                ],
            }),
            // type conversions are because this plugin's typings only support webpack 4
            new ZipPlugin({
                path: '../',
                filename: distZip
            }) as unknown as WebpackPluginInstance,
        ],
        cache: {
            type: 'filesystem',
        },
        experiments: {
            topLevelAwait: true,
        },
    }
    if (process.argv.includes('--mode=development')) {
        config['devtool'] = 'inline-source-map'
        config.plugins.push(new DebuggerPlugin())
    }
    return config
}
