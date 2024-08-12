import { atom } from "jotai"
import History from "./History"
import Media from "./Media"
import { mediaDB, historyDB, tagDB } from "./Database"

export const mediasAtom = atom<Media[]>([])
export const mediaListAtom = atom<string[]>([])
export const tagsAtom = atom<{ tag: string }[]>([])
export const historiesAtom = atom<History[]>([])
export const currentAtom = atom<string>("")

export const sortMediaListAtom = atom(null, (get, set, mediaList: string[]) => {
    set(mediaListAtom, [...mediaList])
})

export const addMediaAtom = atom(null, (get, set, media: Media) => {
    mediaDB.add(media)
    set(mediasAtom, [...get(mediasAtom), media])
    set(mediaListAtom, [...get(mediaListAtom), media.title])
})

export const updateMediaAtom = atom(null, (get, set, media: Media) => {
    mediaDB.update({ title: media.title }, media)
    const medias = get(mediasAtom)
    const i = medias.findIndex(m => m.title === media.title)
    medias[i] = media
    set(mediasAtom, medias)
})

export const addTagAtom = atom(null, (get, set, tag: string) => {
    tagDB.add({ tag: tag })
    set(tagsAtom, [...get(tagsAtom), { tag: tag }])
})

export const removeTagAtom = atom(null, (get, set, tag: string) => {
    tagDB.remove({ tag: tag })
    set(tagsAtom, get(tagsAtom).filter(t => t.tag !== tag))
})

export const addHistoryAtom = atom(null, (get, set, history: History) => {
    historyDB.add(history)
    set(historiesAtom, [...get(historiesAtom), history])
})
