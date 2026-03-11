// Injects a script directly into the DOM.
function injectScript(filename: string): void {
    const script = document.createElement('script')
    script.src = chrome.runtime.getURL(filename)
    const parent = document.head || document.body || document.documentElement
    if (parent.firstChild) {
        parent.insertBefore(script, parent.firstChild)
    } else {
        parent.appendChild(script)
    }
}

export default function injectAllScripts(): void {
    injectScript('inject_main.bundle.js')
}