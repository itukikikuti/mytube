import fs from "fs"
import NEDB from "nedb"
import Media from "./Media"
import History from "./History"

class Database<T> {
    nedb: NEDB<T>

    constructor(path: string) {
        this.nedb = new NEDB({ filename: path })
        this.nedb.loadDatabase()
    }

    has(query: any): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.nedb.count(query, (error, count) => {
                if (error !== null) {
                    reject(error)
                    return
                }

                if (count > 1) {
                    throw "error"
                }

                resolve(count === 1)
            })
        })
    }

    count(query: any): Promise<number> {
        return new Promise((resolve, reject) => {
            this.nedb.count(query, (error, count) => {
                if (error !== null) {
                    reject(error)
                    return
                }

                resolve(count)
            })
        })
    }

    find(query: any): Promise<T[]> {
        return new Promise((resolve, reject) => {
            this.nedb.find(query, (error: any, documents: T[]) => {
                if (error !== null) {
                    reject(error)
                    return
                }

                resolve(documents)
            })
        })
    }

    update(query: any, document: T) {
        this.nedb.update(query, document)
    }

    add(document: T) {
        this.nedb.insert(document)
    }

    remove(query: any) {
        this.nedb.remove(query)
    }
}

const path = fs.readFileSync("./config.dat")

export const mediaDB = new Database<Media>(`${path}/data/media.db`)
export const tagDB = new Database<{ tag: string }>(`${path}/data/tag.db`)
export const historyDB = new Database<History>(`${path}/data/history.db`)
