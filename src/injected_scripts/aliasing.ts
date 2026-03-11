/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
export function aliasCall(target, methodName, newWrapper) {
    target[methodName] = newWrapper(target[methodName])
}

export function aliasConfig(target, config): void {
    for (const methodName in config) {
        const wrapper = config[methodName]
        if (typeof wrapper === 'function') {
            aliasCall(target, methodName, wrapper)
        }
    }
}
