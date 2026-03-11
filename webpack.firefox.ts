import genConfig from './webpack.common'
import {config as DotenvConfigLoad} from 'dotenv'
import path from 'path'

DotenvConfigLoad()

const distDir: string = path.resolve(__dirname, 'extenssr_firefox')

const config = genConfig(distDir, process.env.CLIENT_ID, 2, null, process.env.GUID)
config.optimization ||= {}
config.optimization.minimize = false
export default config