export type GoogleOverrider = (g: typeof google) => void


export default class GoogleNotifier {
    overriders: GoogleOverrider[] = []
    addOverrider(overrider: GoogleOverrider): void {
        this.overriders.push(overrider)
    }
    notifyAll(g: typeof google) {
        this.overriders.forEach(override => override(g))
    }
    startObserving(): void {
        new MutationObserver((mutations) => {
            const googleScript = grabGoogleScript(mutations)
            if (googleScript) {
                const oldOnload = googleScript.onload
                googleScript.onload = (event) => {
                    const g = window.google
                    if (g) {
                        // observer.disconnect()
                    }
                    this.notifyAll(g)
                    if (oldOnload) {
                        oldOnload.call(googleScript, event)
                    }
                }
            }
        }).observe(document.documentElement, { childList: true, subtree: true })
    }
}

function grabGoogleScript(mutations: MutationRecord[]): HTMLScriptElement | null {
    for (const mutation of mutations) {
        for (const newNode of mutation.addedNodes) {
            const asScript = newNode as HTMLScriptElement
            if (asScript && asScript.src && asScript.src.startsWith('https://maps.googleapis.com/')) {
                return asScript
            }
        }
    }
    return null
}
