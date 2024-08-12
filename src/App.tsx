import fs from "fs"
import React, { useEffect } from "react"
import { createRoot } from "react-dom/client"
import { useSetAtom } from "jotai"
import { mediaDB, tagDB, historyDB } from "./Database"
import { historiesAtom, mediasAtom, tagsAtom } from "./State"
import List from "./List"

function App(props: any) {
    const path = fs.readFileSync("./config.dat");
    const setMedias = useSetAtom(mediasAtom)
    const setTags = useSetAtom(tagsAtom)
    const setHistories = useSetAtom(historiesAtom)

    useEffect(() => {
        setMedias(props.medias)
        setTags(props.tags)
        setHistories(props.histories)
    }, [])

    return <List path={path} />
}

async function init() {
    const state = {
        medias: await mediaDB.find({}),
        tags: await tagDB.find({}),
        histories: await historyDB.find({}),
    }
    const root = createRoot(document.getElementById("root"))
    root.render(<App initialState={state} />)   
}

init()
