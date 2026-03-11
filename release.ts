import { readFile } from 'fs/promises'
import { createReadStream, statSync } from 'fs'
import { sign } from 'jsonwebtoken'
import axios from 'axios'
import { config as DotenvConfigLoad } from 'dotenv'
import FormData from 'form-data'

DotenvConfigLoad()
type Item = {
    id: string
    itemError: string[]
    kind: string
    publicKey: string
    crxVersion: string,
    uploadState: 'FAILURE' | 'IN_PROGRESS' | 'NOT_FOUND' | 'SUCCESS'
}
type PublishResponse = {
    kind: string
    item_id: string
    status: string[]
    statusDetail: string[]
}
type TokenResponse = {
    access_token: string,
    expires_in: number,
    scope: string,
    token_type: string
}

type Details = {
    current_version: { version: string }
    latest_unlisted_version: string | null
}

const googleClient = axios.create({ baseURL: 'https://www.googleapis.com' })
const mozillaClient = axios.create({ baseURL: 'https://addons.mozilla.org' })

const ffToken = () => {
    const issuedAt = Math.floor(Date.now() / 1000)
    const payload = {
        iss: process.env.JWT_ISSUER,
        jti: Math.random().toString(),
        iat: issuedAt,
        exp: issuedAt + 60
    }
    const secret = process.env.JWT_SECRET
    return sign(payload, secret, { algorithm: 'HS256' })
}

const chromeToken = async () => {
    const { data } = await axios.post<TokenResponse>('https://accounts.google.com/o/oauth2/token', {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        refresh_token: process.env.REFRESH_TOKEN,
        redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
        grant_type: 'refresh_token'
    })
    return {
        Authorization: `${data.token_type} ${data.access_token}`
    }
}

const getLatestChromeVersion = async () => {
    const { data } = await googleClient.get<Item>(
        `/chromewebstore/v1.1/items/${process.env.EXTENSION_ID}`,
        {
            params: {
                projection: 'draft'
            },
            headers: await chromeToken()
        })
    return data.crxVersion
}

const getLatestFirefoxVersion = async () => {
    const { data } = await mozillaClient.get<Details>(`/api/v5/addons/addon/${process.env.GUID}`, { headers: { Authorization: `JWT ${ffToken()}` } })
    return data.latest_unlisted_version ?? data.current_version.version
}

const getNextVersion = async () => {
    const { version } = JSON.parse(await readFile('package.json', { encoding: 'utf-8' }))
    return version as string
}

const submitChrome = async () => {
    const latest = await getLatestChromeVersion()
    console.log(`Latest Chrome extension version: ${latest}`)
    const nextVersion = await getNextVersion()
    if (latest === nextVersion) {
        console.log('Chrome already at latest version!')
        return
    }
    const data = await readFile('extenssr_chrome.zip')
    await googleClient.put<Item>(`/upload/chromewebstore/v1.1/items/${process.env.EXTENSION_ID}`, data,
        { params: { uploadType: 'media'}, headers: await chromeToken() })
    const { data: publishResponse } = await googleClient.post<PublishResponse>(`/chromewebstore/v1.1/items/${process.env.EXTENSION_ID}/publish`,
        { publishTarget: 'default' }, { headers: await chromeToken() })
    console.log(`Status of Chrome extension publish : ${publishResponse.status.join('\n')}`)
    console.log(`Detailed status of Chrome extension: ${publishResponse.statusDetail.join('\n')}`)
}

const submitFirefox = async () => {
    const latest = await getLatestFirefoxVersion()
    console.log(`Latest Firefox extension version: ${latest}`)
    const nextVersion = await getNextVersion()
    if (latest === nextVersion) {
        console.log('Firefox already at latest version!')
        return
    }
    // https://github.com/axios/axios/issues/789#issuecomment-508114703
    const formData = new FormData()
    formData.append('upload', createReadStream('extenssr_firefox.zip'), { knownLength: statSync('extenssr_firefox.zip').size })
    // https://addons-server.readthedocs.io/en/latest/topics/api/signing.html#upload-version
    const response = await mozillaClient.put(`/api/v5/addons/${process.env.GUID}/versions/${nextVersion}/`, formData, {
        headers: {
            ...formData.getHeaders(),
            'Authorization': `JWT ${ffToken()}`,
            'Content-Length': `${formData.getLengthSync()}`
        }
    })
    if (response.status === 202) {
        console.log('New Firefox add-on version created!')
    } else {
        console.log('Failed to create new Firefox version :(')
    }
}

Promise.all([
    getNextVersion().then(nextVersion => console.log(`Updating to ${nextVersion}`)),
    submitChrome(),
    submitFirefox()
]).then(() => console.log('Finished all release steps.'))