import fs from "fs"
import path from "path"
import React, { useState, useEffect } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { addMediaAtom, historiesAtom, mediaListAtom, mediasAtom, sortMediaListAtom, tagsAtom } from "./State"
import Item from "./Item"
import Media from "./Media"
import History from "./History"
import ChangeTitleDialog from "./Dialog/ChangeTitleDialog"

export default function List(props: any) {
    const [rateFlags, setRateFlags] = useState([0, 1, 2, 3, 4, 5])
    const [typeFlags, setTypeFlags] = useState(["video"])
    const [tagFlags, setTagFlags] = useState<{ flag: boolean, tag: string }[]>([])
    const [thumbFlags, setThumbFlags] = useState([false, false])
    const [sort, setSort] = useState("date")
    const [tagMode, setTagMode] = useState("filter")
    const medias = useAtomValue(mediasAtom)
    const mediaList = useAtomValue(mediaListAtom)
    const histories = useAtomValue(historiesAtom)
    const tags = useAtomValue(tagsAtom)
    const addMedia = useSetAtom(addMediaAtom)
    const sortMediaList = useSetAtom(sortMediaListAtom)

    useEffect(() => { load() }, []) // 空の配列を指定すると一回だけ実行される

    const load = async () => {
        const queue = (await fs.promises.readdir(props.path, { withFileTypes: true }))
            .filter(dirent => dirent.isFile())
            .map(dirent => dirent.name)

        const videoElement = document.createElement("video")

        for (const title of queue) {
            if (medias.filter(media => media.title === title).length > 0) {
                continue
            }

            const ext = path.extname(title)
            const fullPath = props.path + title
            console.log(title + " not found")
            if (ext == ".mp4" || ext == ".MP4" || ext == ".mkv") {
                    videoElement.src = fullPath
                    await new Promise(resolve => {
                        const listener = resolve
                        videoElement.addEventListener("canplay", listener, { once: true })
                    })

                    const stat = await fs.promises.stat(fullPath)
                    const duration = Math.floor(videoElement.duration)

                    addMedia(new Media(title, fullPath, stat.birthtime, "video", 0, duration))
            } else if (ext == ".png" || ext == ".jpg" || ext == ".jpeg" || ext == ".jfif" || ext == ".webp") {
                    const stat = await fs.promises.stat(fullPath)

                    addMedia(new Media(title, fullPath, stat.birthtime, "image", 0, 0))
            } else if (ext == ".gif") {
                    const stat = await fs.promises.stat(fullPath)

                    addMedia(new Media(title, fullPath, stat.birthtime, "anime", 0, 0))
            } else {
                continue
            }
        }

        filter()
    }

    const filter = () => {
        const findRates = rateFlags
        const findTypes = typeFlags
        const findTags = tagFlags.filter(flag => flag.flag).map(flag => flag.tag)
        const ignore = tagMode === "ignore"

        const _medias = medias.filter(media => {
            if (!findRates.includes(media.rate)) {
                return false
            }

            if (!findTypes.includes(media.type)) {
                return false
            }

            if (thumbFlags[0] !== thumbFlags[1]) {
                if (thumbFlags[0] && (media.thumbs.length === 0) === !ignore) {
                    return false
                }
                if (thumbFlags[1] && (media.thumbs.length > 0) === !ignore) {
                    return false
                }
            }

            if (findTags.length === 0) {
                return true
            }

            for (const tag of media.tags) {
                if (findTags.includes(tag)) {
                    return !ignore
                }
            }

            return ignore
        })

        const hash:{ [key: string]: any } = {}
        switch  (sort)
        {
            case "date":
                _medias.sort((a, b) => b.date.getTime() - a.date.getTime())
                break

            case "shuffle":
                for (let i = _medias.length - 1; i >= 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1))
                    const temp = _medias[i]
                    _medias[i] = _medias[j]
                    _medias[j] = temp
                }
                break

            case "recent":
                for (const media of _medias) {
                    let temp = histories
                        .filter(history => history.title === media.title)
                        .sort((a, b) => b.date.getTime() - a.date.getTime())
                    
                    if (temp.length === 0) {
                        temp = [new History(media.title, new Date(0))]
                    }
                    hash[media.title] = temp[0]
                }
                _medias.sort((a, b) => hash[b.title].date.getTime() - hash[a.title].date.getTime())
                break

            case "mostview":
                for (const media of _medias) {
                    let temp = histories
                        .filter(history => history.title === media.title)
                    
                    hash[media.title] = temp.length
                }
                _medias.sort((a, b) => hash[b.title] - hash[a.title])
                break

            case "duration":
                _medias.sort((a, b) => b.duration - a.duration)
                break
        }

        sortMediaList(_medias.map(media => media.title))
    }

    const setRateFlag = (rate: number) => {
        if (rateFlags.includes(rate)) {
            setRateFlags(rateFlags.filter(item => item !== rate))
        } else {
            setRateFlags([...rateFlags, rate])
        }
    }

    const setTypeFlag = (type: string) => {
        if (typeFlags.includes(type)) {
            setTypeFlags(typeFlags.filter(item => item !== type))
        } else {
            setTypeFlags([...typeFlags, type])
        }
    }

    const setTagFlag = (tagFlag: { flag: boolean, tag: string }) => {
        const i = tagFlags.indexOf(tagFlag)

        if (i < 0) throw "error"

        const copy = [...tagFlags]
        copy[i].flag = !copy[i].flag
        setTagFlags(copy)
    }

    const setThumbFlag = (i: number, flag: boolean) => {
        const copy = [...thumbFlags]
        copy[i] = flag
        setThumbFlags(copy)
    }

    if (tags.length !== tagFlags.length) {
        const temp = tags
            .map(tag => {
                const tagFlag = tagFlags.find(tagFlag => tagFlag.tag === tag.tag)
                return { ...tag, flag: tagFlag != null ? tagFlag.flag : false }
            })
            .sort((a, b) => (a.tag.codePointAt(0) ?? 0) - (b.tag.codePointAt(0) ?? 0))

        console.log(temp)
        setTagFlags(temp)
    }
    
    console.log(mediaList)

    return <>
        <nav className="menu">
            <ul>
                <li>
                    <button>編集</button>
                    <ul>
                        <li><button onClick={() => ChangeTitleDialog()}>タイトル変更</button></li>
                    </ul>
                </li>
            </ul>
        </nav>
        <div className="filter">
            <ul>
                <li><label><input type="checkbox" checked={rateFlags.includes(5)} onChange={() => setRateFlag(5)} /><div className="rating" data-rate="5" /></label></li>
                <li><label><input type="checkbox" checked={rateFlags.includes(4)} onChange={() => setRateFlag(4)} /><div className="rating" data-rate="4" /></label></li>
                <li><label><input type="checkbox" checked={rateFlags.includes(3)} onChange={() => setRateFlag(3)} /><div className="rating" data-rate="3" /></label></li>
                <li><label><input type="checkbox" checked={rateFlags.includes(2)} onChange={() => setRateFlag(2)} /><div className="rating" data-rate="2" /></label></li>
                <li><label><input type="checkbox" checked={rateFlags.includes(1)} onChange={() => setRateFlag(1)} /><div className="rating" data-rate="1" /></label></li>
                <li><label><input type="checkbox" checked={rateFlags.includes(0)} onChange={() => setRateFlag(0)} /><div className="rating" data-rate="0" /></label></li>
            </ul>
            <ul>
                <li><label><input type="checkbox" checked={typeFlags.includes("video")} onChange={() => setTypeFlag("video")} />動画</label></li>
                <li><label><input type="checkbox" checked={typeFlags.includes("image")} onChange={() => setTypeFlag("image")} />画像</label></li>
                <li><label><input type="checkbox" checked={typeFlags.includes("anime")} onChange={() => setTypeFlag("anime")} />GIF</label></li>
            </ul>
            <div>
                <label className="tag" key="サムネあり"><input type="checkbox" checked={thumbFlags[0]} onChange={() => setThumbFlag(0, !thumbFlags[0])} />サムネあり</label>
                <label className="tag" key="サムネなし"><input type="checkbox" checked={thumbFlags[1]} onChange={() => setThumbFlag(1, !thumbFlags[1])} />サムネなし</label>
                {tagFlags.map(tagFlag => <label className="tag" key={tagFlag.tag}><input type="checkbox" checked={tagFlag.flag} onChange={() => setTagFlag(tagFlag)} />{tagFlag.tag}</label>)}
                <select value={tagMode} onChange={e => setTagMode(e.target.value)}>
                    <option value="filter">含む</option>
                    <option value="ignore">除く</option>
                </select>
            </div>
            <div>
                <select value={sort} onChange={e => setSort(e.target.value)}>
                    <option value="date">日付順</option>
                    <option value="shuffle">シャッフル</option>
                    <option value="recent">最近再生した</option>
                    <option value="mostview">再生数</option>
                    <option value="duration">長さ</option>
                </select>
            </div>
            <button onClick={filter}>フィルタ</button>
            <p>{mediaList.length}</p>
        </div>
        <div className="list">{mediaList.map(title => <Item title={title} key={title} />)}</div>
    </>
}
