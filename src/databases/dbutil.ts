import dbconf from './dbconf.json'
import Dexie from 'dexie'

export default function importDbSettings(dbName: string, db: Dexie): void {
    if (!(dbName in dbconf)) {
        throw `Database ${dbName} is not in the config: ${JSON.stringify(dbconf)}`
    }
    const {version, tables} = dbconf[dbName]
    db.version(version).stores(tables)
}