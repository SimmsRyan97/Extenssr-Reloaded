import { ChromeStorage } from 'storage/chrome_storage'
import { SettingsKeys } from 'storage/storage'

function keyToCss(id: string): string {
    return `${id}_css`
}
export function addCss(id: string, data: string): void {
    removeCss(id)
    const fullId = keyToCss(id)
    const el = document.createElement('style')
    el.setAttribute('id', fullId)
    el.textContent = data
    const newParent = document.head || document.body || document.documentElement
    newParent.appendChild(el)
}

function removeCss(id: string): void {
    const fullId = keyToCss(id)
    const el = document.getElementById(fullId)
    if (el && el.parentElement) {
        el.parentElement.removeChild(el)
    }
}

// Only settings with boolean values can be used with `addStaticCSSWhenProperty`.
type BooleanSettings = {
    [K in keyof SettingsKeys]: SettingsKeys[K] extends boolean ? boolean : never
}

export function addStaticCSSWhenProperty<TKey extends keyof BooleanSettings>(key: TKey, storage: ChromeStorage, css: { true?: string, false?: string }): void {
    let oldVal: boolean | undefined = undefined
    storage.createListener(key, (val: SettingsKeys[TKey]) => {
        if (oldVal === val || typeof val !== 'boolean') {
            return
        }

        removeCss(key)
        const match = val.toString()
        if (match in css) {
            addCss(key, css[match])
        }
        oldVal = val
    })
}

export function addStaticCSSWhenPropertyTrue<TKey extends keyof BooleanSettings>(key: TKey, storage: ChromeStorage, cssData: string): void {
    addStaticCSSWhenProperty(key, storage, { true: cssData })
}

export function addStaticCSSWhenPropertyFalse<TKey extends keyof BooleanSettings>(key: TKey, storage: ChromeStorage, cssData: string): void {
    addStaticCSSWhenProperty(key, storage, { false: cssData })
}
