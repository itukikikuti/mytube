import { exec } from "child_process"
import React, { useState, useEffect, useRef, useCallback, MouseEvent, ChangeEvent } from "react"
import ReactDOM from "react-dom"
import { useAtomValue, useSetAtom } from "jotai"
import { addHistoryAtom, addTagAtom, mediasAtom, removeTagAtom, tagsAtom, updateMediaAtom } from "./State"
import History from "./History"

export default function Details(props: any) {
    const [loopBegin, setLoopBegin] = useState(0)
    const [loopEnd, setLoopEnd] = useState(0)
    const [inputTag, setInputTag] = useState("")
    const medias = useAtomValue(mediasAtom)
    const tags = useAtomValue(tagsAtom)
    const updateMedia = useSetAtom(updateMediaAtom)
    const addTagDB = useSetAtom(addTagAtom)
    const removeTagDB = useSetAtom(removeTagAtom)
    const addHistory = useSetAtom(addHistoryAtom)

    const media = medias.find(media => media.title === props.title)!

    const videoRef = useRef<HTMLVideoElement>()
    const setVideoRef = useCallback((node: HTMLVideoElement) => videoRef.current = node, [])

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
            props.onClose()
        }
    }

    const onClickOverlay = (e: MouseEvent<HTMLDivElement>) => {
        if (e.currentTarget === e.target) {
            props.onClose()
        }
    }

    const play = () => {
        addHistory(new History(media.title, new Date()))

        let command = "\"" + media.path + "\""
        console.log(`exec ${command}`)
        exec(command)
    }

    const addThumb = () => {
        if (videoRef.current === null) {
            return
        }

        const video = videoRef.current!
        
        const canvas = document.createElement("canvas")
        canvas.width = (video.videoWidth / video.videoHeight) * 180
        canvas.height = 180

        const ctx = canvas.getContext("2d")
        if (ctx !== null) {
            ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, 0, 0, canvas.width, canvas.height)
        }

        const thumb = canvas.toDataURL("image/jpeg", 50)
        console.log("%c ", `background:url(${thumb});background-size:100% 100%;padding:90px 160px;`)

        const temp = { ...media }
        temp.thumbs.push(thumb)
        updateMedia(temp)
    }

    const removeThumb = (i: number) => {
        const temp = { ...media }
        temp.thumbs.splice(i, 1)
        updateMedia(temp)
    }

    const loadThumb = async (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length === 0) return

        const reader = new FileReader()
        reader.readAsDataURL(e.target.files![0])

        await waitEvent(reader, "load")

        const image = document.createElement("img")
        image.src = reader.result as string

        await waitEvent(image, "load")

        const canvas = document.createElement("canvas")
        canvas.width = (image.naturalWidth / image.naturalHeight) * 180
        canvas.height = 180

        const ctx = canvas.getContext("2d")
        if (ctx !== null) {
            ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight, 0, 0, canvas.width, canvas.height)
        }

        const thumb = canvas.toDataURL("image/jpeg", 50)
        console.log("%c ", `background:url(${thumb});background-size:100% 100%;padding:90px 160px;`)

        const temp = { ...media }
        temp.thumbs.push(thumb)
        updateMedia(temp)
    }

    const waitEvent = (element: EventTarget, type: string): Promise<void> => {
        return new Promise((resolve) => {
            element.addEventListener(type, () => { resolve() }, { once: true })
        })
    }

    const setRate = (e: MouseEvent<HTMLLabelElement>, rate: number) => {
        const contol = e.currentTarget.control as HTMLInputElement
        if (contol.checked) {
            rate = 0
        }

        const temp = { ...media }
        temp.rate = rate
        updateMedia(temp)
    }

    const onChange = (e: ChangeEvent<HTMLInputElement>) => {
        setInputTag(e.target.value)
    }

    const addTag = () => {
        console.log("add tag " + inputTag)

        const temp = { ...media }

        if (!temp.tags.includes(inputTag)) {
            temp.tags = [...temp.tags, inputTag]
            updateMedia(temp)
    
            if (tags.find(tag => tag.tag === inputTag) == null) {
                addTagDB(inputTag)
            }
        }
    }

    const removeTag = (tag: string) => {
        console.log("remove tag " + tag)

        const temp = { ...media }

        temp.tags = temp.tags.filter(t => t !== tag)
        updateMedia(temp)

        if (medias.filter(media => media.tags.includes(tag)).length === 0) {
            removeTagDB(tag);
        }
    }

    const timeUpdate = () => {
        if (videoRef.current!.currentTime >= loopEnd) {
            videoRef.current!.currentTime = loopBegin
        }
    }

    const initLoopEnd = () => {
        setLoopEnd(videoRef.current!.duration)
    }

    useEffect(() => {
        document.addEventListener("keydown", handleKeyDown, false)
    }, [])

    console.log(media)

    const isVideo = media.type === "video"

    return (
        ReactDOM.createPortal(
            <div className="overlay" onClick={onClickOverlay}>
                <div className="details">
                    <button className="close" onClick={props.onClose}>×</button>
                    <div className="media">
                        {isVideo ? <video src={media.path} controls loop onTimeUpdate={timeUpdate} onLoadedData={initLoopEnd} ref={setVideoRef} /> : <img src={media.path} />}
                    </div>
                    <div className="info">
                        <p className="title">{media.title}</p>
                        <div className="review">
                            <input id="review5" type="radio" name="review" checked={media.rate == 5} onChange={() => {}} /><label htmlFor="review5" onClick={e => setRate(e, 5)}>♥</label>
                            <input id="review4" type="radio" name="review" checked={media.rate == 4} onChange={() => {}} /><label htmlFor="review4" onClick={e => setRate(e, 4)}>♥</label>
                            <input id="review3" type="radio" name="review" checked={media.rate == 3} onChange={() => {}} /><label htmlFor="review3" onClick={e => setRate(e, 3)}>♥</label>
                            <input id="review2" type="radio" name="review" checked={media.rate == 2} onChange={() => {}} /><label htmlFor="review2" onClick={e => setRate(e, 2)}>♥</label>
                            <input id="review1" type="radio" name="review" checked={media.rate == 1} onChange={() => {}} /><label htmlFor="review1" onClick={e => setRate(e, 1)}>♥</label>
                        </div>
                        {
                            isVideo && <>
                                <button onClick={play}>play</button>
                                <button onClick={() => setLoopBegin(videoRef.current!.currentTime)}>{Math.floor(Math.floor(loopBegin) / 60).toString()}:{("00" + (Math.floor(loopBegin) % 60).toString()).slice(-2)}</button>
                                <button onClick={() => setLoopEnd(videoRef.current!.currentTime)}>{Math.floor(Math.floor(loopEnd) / 60).toString()}:{("00" + (Math.floor(loopEnd) % 60).toString()).slice(-2)}</button>
                                <button onClick={addThumb}>add thumb</button>
                                <label className="load"><input type="file" accept="image/*" onChange={loadThumb} />load thumb</label>
                                {media.thumbs.map((thumb, i) => <button key={i} onClick={() => removeThumb(i)}><img style={{height:"50px"}} src={thumb} /></button>)}
                            </>
                        }
                        <div>
                            <p className="date">{media.date.toLocaleString()}</p>
                        </div>
                        <div>
                            <input type="text" onChange={onChange} onKeyDown={e => { if (e.key === "Enter") addTag() }} />
                            <button onClick={addTag}>Add</button>
                            <div className="tags">{media.tags.map(tag => <button key={tag} className="tag" onClick={() => removeTag(tag)}>{tag}</button>)}</div>
                        </div>
                    </div>
                </div>
            </div>,
            document.getElementById("window")!
        )
    )
}
