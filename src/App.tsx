import fs from "fs"
import React, { useReducer } from "react"
import { createRoot } from "react-dom/client"
import { mediaDB, tagDB, historyDB } from "./Database"
import State, { StateContext, StateDispatchContext } from "./State"
import List from "./List"

function reducer(state: State, action: any): State {
    console.log(action)

    switch (action.type) {
        case "sortMediaList":
            state.mediaList = [...action.mediaList]
            break

        case "addMedia":
            mediaDB.add(action.media)
            state.medias = [...state.medias, action.media]
            state.mediaList = [...state.mediaList, action.media.title]
            break
            
        case "updateMedia":
            mediaDB.update({ title: action.media.title }, action.media)
            const i = state.medias.findIndex(m => m.title === action.media.title)
            state.medias[i] = action.media
            break

        case "addTag":
            tagDB.add({ tag: action.tag })
            state.tags = [...state.tags, { tag: action.tag }]
            break

        case "removeTag":
            tagDB.remove({ tag: action.tag })
            state.tags = state.tags.filter(t => t.tag !== action.tag)
            break

        case "addHistory":
            historyDB.add(action.history)
            state.histories = [...state.histories, action.history]
            break
            
        case "currentMedia":
            state.current = action.title
            break
    }
    return { ...state }
}

function App(props: { initialState: State }) {
    const [state, dispatch] = useReducer(reducer, props.initialState)
    const path = fs.readFileSync("./config.dat")

    versions.chrome()

    return (
        <StateContext.Provider value={state}>
            <StateDispatchContext.Provider value={dispatch}>
                <List path={path.toString()} />
            </StateDispatchContext.Provider>
        </StateContext.Provider>
    )
}

async function init() {
    const initialState: State = {
        medias: await mediaDB.find({}),
        mediaList: [],
        tags: await tagDB.find({}),
        histories: await historyDB.find({}),
        current: null,
    }

    const root = createRoot(document.getElementById("root"))
    root.render(<App initialState={initialState} />)
}

init()
