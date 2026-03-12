// Baked in post processing.
import ai from './shaders/ai.glsl'
import crt from './shaders/crt.glsl'
import pixelate from './shaders/pixelate.glsl'
import snow from './shaders/snow.glsl'
import sobel from './shaders/sobel.glsl'
import toon from './shaders/toon.glsl'
import flash from './shaders/flash.glsl'
import drunk from './shaders/drunk.glsl'
import vignette from './shaders/vignette.glsl'
import fisheye from './shaders/fisheye.glsl'
import water from './shaders/water.glsl'
import bloom from './shaders/bloom.glsl'
import minFilter from './shaders/min.glsl'
import scramble from './shaders/scramble.glsl'
import motionBlur from './shaders/motion_blur.glsl'

import ContentAndBackgroundMessageBroker from 'messaging/content_to_background_broker'
import { StorageUpdatableUniform, Uniform, UniformType } from './uniform'
import { ChromeStorage } from 'storage/chrome_storage'
import { inject, injectable } from 'inversify'
import config from '../../inversify.config'
import { ChromeContentToInjectedBroker } from 'messaging/content_to_injected_broker'
import { CombinePasses, ShaderInfo, ShaderError, ShaderPass, StorageToggleableShaderPass, ToggleableShaderPass } from './shader_pass'
import CSSEffectMaterialHandler from './css_effect_material_handler'
import DebugMaterialHandler from './debug_material_handler'
import { SettingsKeys } from 'storage/storage'

declare const DEBUGGING: boolean

@injectable()
export class MaterialHandler {
    updatableUniforms: Map<string, StorageUpdatableUniform> = new Map()
    updatablePasses: StorageToggleableShaderPass[] = []

    otherUniforms: Map<string, Uniform> = new Map()
    otherPasses: Map<string, ToggleableShaderPass> = new Map()

    innerBroker: ChromeContentToInjectedBroker

    cssEffectMaterialHandler: CSSEffectMaterialHandler
    debugMaterialHandler: DebugMaterialHandler | null
    constructor(
        @inject(config.ChromeStorage) storage: ChromeStorage,
        @inject(config.ContentAndBackgroundMessageBroker) broker: ContentAndBackgroundMessageBroker,
        @inject(config.ChromeContentToInjectedBroker) innerBroker: ChromeContentToInjectedBroker,
        @inject(CSSEffectMaterialHandler) cssEffectMaterialHandler: CSSEffectMaterialHandler
    ) {
        this.innerBroker = innerBroker
        this.cssEffectMaterialHandler = cssEffectMaterialHandler
        if (DEBUGGING) {
            this.debugMaterialHandler = new DebugMaterialHandler(broker, this.innerBroker)
        }
        innerBroker.createListener('requestExtBaseUrl', 'Material handler for ext base url', async () => {
            return chrome.runtime.getURL('')
        })
        innerBroker.createListener('requestMaterial', '', async() => {
            this.#updateMaterials()
            this.innerBroker.sendExternalMessage('hideCar', await storage.getValue('aiOverlay'))
        })
        const listener = broker.createListener('frameEnd', 'Material handler', () => {
            this.#updateMaterials()
            listener.deregister()
        })

        broker.createListener('triggerFlash', 'Trigger flash handler', () => {
            this.otherUniforms.set('flashStart', {name: 'flashStart', type: UniformType.FLOAT, value: [Date.now() / 1000.0]})
            this.otherPasses.get('flash').setEnabled(true)
            this.#updateMaterials()
            setTimeout(() => {
                this.otherPasses.get('flash').setEnabled(false)
                this.#updateMaterials()
            }, 1200)

        })
        broker.createListener('startTextOnlyMode', 'Trigger text only handler', (enabled) => {
            if (enabled) {
                Array.from(this.updatablePasses.values()).forEach(pass => {
                    pass.setOverrideStorage(true)
                    pass.enabled = false
                })
                Array.from(this.updatableUniforms.values()).forEach(uniform => {
                    uniform.pause(true)
                })
                this.updatablePasses.forEach(pass => {
                    if (['pixelate', 'toon'].includes(pass.pass.functionName)) {
                        pass.setEnabled(true)
                    }
                })
                this.updatableUniforms.get('scaling').uniform.value = [420.616]
                this.updatableUniforms.get('toonScale').uniform.value = [16.0]
                this.#updateMaterials()
            } else {
                Array.from(this.updatablePasses.values()).forEach(pass => {
                    pass.setOverrideStorage(false)
                })
                Array.from(this.updatableUniforms.values()).forEach(uniform => {
                    uniform.pause(false)
                })
                this.#updateMaterials()
            }
        })
        storage.createListener('aiOverlay', (enabled) => {
            this.innerBroker.sendExternalMessage('hideCar', enabled)
        })

        this.updatableUniforms.set('scaling', StorageUpdatableUniform.fromKey(storage, 'scaling', 'pixelateScale', () => this.#updateMaterials()))
        this.updatableUniforms.set('toonScale', StorageUpdatableUniform.fromKey(storage, 'toonScale', 'toonScale', () => this.#updateMaterials()))
        
        const addStorageToggleableShaderPass = (shader, key: keyof SettingsKeys) => {
            this.updatablePasses.push(StorageToggleableShaderPass.fromKey(storage, shader, key, (pass) => this.#onToggleShaderPass(pass)))    
        }

        const randomScramble = (): Uniform => {
            const randomInt = (min, max) => Math.floor((Math.random() * (max - min + 1))) + min
            const vals = new Set<number>()
            const scramble = []
            while (vals.size != 16) {
                const val = randomInt(0, 15)
                if (!vals.has(val)) {
                    vals.add(val)
                    scramble.push(val)
                }
            }
            return {name: 'scrambled', type: UniformType.INTVEC, vecSize: 16, value: scramble}
        }

        this.otherUniforms.set('scrambled', randomScramble())
        storage.createListener('scramble', (enabled) => {
            if (enabled) {
                this.otherUniforms.set('scrambled', randomScramble())
                this.#updateMaterials()
            }
        })
        broker.createListener('newRound', '', () => {
            this.otherUniforms.set('scrambled', randomScramble())
            this.#updateMaterials()
        })

        addStorageToggleableShaderPass(ai, 'aiOverlay')
        addStorageToggleableShaderPass(crt, 'chromaticAberration')
        addStorageToggleableShaderPass(drunk, 'drunk')
        addStorageToggleableShaderPass(fisheye, 'fisheye')
        addStorageToggleableShaderPass(pixelate, 'pixelateMap')
        addStorageToggleableShaderPass(snow, 'snowing')
        addStorageToggleableShaderPass(sobel, 'sobel')
        addStorageToggleableShaderPass(toon, 'toon')
        addStorageToggleableShaderPass(vignette, 'vignette')
        addStorageToggleableShaderPass(water, 'water')
        addStorageToggleableShaderPass(bloom, 'bloom')
        addStorageToggleableShaderPass(minFilter, 'min')
        addStorageToggleableShaderPass(scramble, 'scramble')
        addStorageToggleableShaderPass(motionBlur, 'motionBlur')

        this.otherPasses.set('flash', new ToggleableShaderPass(ShaderPass.fromString(flash) as ShaderPass))
    }

    #onToggleShaderPass(pass: StorageToggleableShaderPass) {
        if (pass.overrideStorage) {
            return
        }
        if (pass.enabled && !pass.pass.takesInput) {
            this.updatablePasses.forEach((otherPass) => {
                if (otherPass.enabled && !otherPass.pass.takesInput && otherPass.pass.functionName !== pass.pass.functionName) {
                    otherPass.forceDisable()
                }
            })
        }
        this.#updateMaterials()
    }

    #updateMaterials(): void {
        if (this.debugMaterialHandler?.enabled) {
            this.debugMaterialHandler.updateMaterial()
            return
        }
        const passes = this.updatablePasses.filter(pass => pass.enabled).map(pass => pass.pass)
        const uniforms = new Map(Array.from(this.updatableUniforms.entries()).map(([key, val]) => [key, val.uniform]))
        this.otherUniforms.forEach(uniform => uniforms.set(uniform.name, uniform))
        for (const pass of this.otherPasses.values()) {
            if (pass.enabled) {
                passes.push(pass.pass)
            }
        }
        const multiPassOrError = CombinePasses(passes, uniforms)
        if (!(multiPassOrError instanceof ShaderError)) {
            const multiPass = multiPassOrError as ShaderInfo
            this.innerBroker.sendExternalMessage('updateMaterial', multiPass)
        } else {
            console.log(multiPassOrError)
        }
    }
}
