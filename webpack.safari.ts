import genConfig from './webpack.common'
import {config as DotenvConfigLoad} from 'dotenv'
import path from 'path'

DotenvConfigLoad()

const distDir: string = path.resolve(__dirname, 'extenssr_safari')

const config = genConfig(distDir, process.env.CLIENT_ID, 2)

export default config