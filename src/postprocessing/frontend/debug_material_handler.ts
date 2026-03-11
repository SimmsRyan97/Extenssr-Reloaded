import ContentAndBackgroundMessageBroker from 'messaging/content_to_background_broker'
import { ChromeContentToInjectedBroker } from 'messaging/content_to_injected_broker'
import { CombinePasses, ShaderInfo, Shader, ShaderError, ShaderPass } from './shader_pass'
import { Uniform } from './uniform'

export default class DebugMaterialHandler {
    broker: ContentAndBackgroundMessageBroker
    innerBroker: ChromeContentToInjectedBroker
    finalShader: ShaderInfo
    passes: ShaderPass[] = []
    enabled = false
    // TODO: this isn't used yet
    extraUniforms: Map<string, Uniform> = new Map()
    constructor(broker: ContentAndBackgroundMessageBroker, innerBroker: ChromeContentToInjectedBroker) {
        this.broker = broker
        this.innerBroker = innerBroker
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('webgl')
        this.init()
        broker.createListener('compileShader', '', (code) => {
            if (!this.enabled) {
                return
            }
            const pass = ShaderPass.fromString(code)
            if (pass instanceof ShaderError) {
                return JSON.stringify(pass)
            }
            const possibleFinal = CombinePasses([pass], this.extraUniforms)
            if (possibleFinal instanceof ShaderError) {
                return JSON.stringify(possibleFinal)
            }
            this.finalShader = possibleFinal
            const program = Shader.createProgram(context, new Shader(this.finalShader))
            if (program instanceof ShaderError) {
                return JSON.stringify(program)
            }
            this.updateMaterial()
            return ''
        })
        broker.createListener('toggleShader', '', (enabled) => {
            this.enabled = enabled
            if (!enabled) {
                this.init()
            }
            this.innerBroker.sendInternalMessage('requestMaterial', null)
        })
    }
    init() {
        this.passes = []
        this.finalShader = CombinePasses(this.passes, this.extraUniforms) as ShaderInfo
    }
    updateMaterial() {
        this.innerBroker.sendExternalMessage('updateMaterial', this.finalShader)
    }
}