import h from "hyperapp-jsx-pragma";
import { WebSocketSend } from "hyperapp-fx";
import { socket_name, sync_movie_state } from "../cinema";
import { Http } from "hyperapp-fx";

function WebSocketCommand(state: State, command: object) {
    return WebSocketSend({
        url: socket_name(state),
        data: JSON.stringify(command),
    });
}

/**********************************************************************
 * Video
 */
const PauseAction = (state: State) => [
    { ...state } as State,
    WebSocketCommand(state, {
        pause: [
            (document.getElementById("movie_list") as HTMLFormElement).value,
            (document.getElementById("movie") as HTMLVideoElement).currentTime,
        ]
    })
];
const PlayAction = (state: State) => [
    { ...state } as State,
    WebSocketCommand(state, {
        play: [
            (document.getElementById("movie_list") as HTMLFormElement).value,
            ((new Date()).getTime() / 1000) - (document.getElementById("movie") as HTMLVideoElement).currentTime
        ],
    })
];
const SyncAction = function (state: State, event: Event) {
    sync_movie_state(state);
    return state;
}
function iOS() {
    return [
        'iPad Simulator',
        'iPhone Simulator',
        'iPod Simulator',
        'iPad',
        'iPhone',
        'iPod'
    ].includes(navigator.platform)
        // iPad on iOS 13 detection
        || (navigator.userAgent.includes("Mac") && "ontouchend" in document)
}
const MainVideo = ({ state, admin }: { state: RoomState, admin: boolean }) => (
    (state.playing || state.paused) ?
        <video
            id="movie"
            src={"/movies/" + (state.playing || state.paused)[0]}
            muted={iOS()} // iOS only allows auto-play if muted
            controls={admin || iOS()} // iOS needs the user to manually un-mute
            onplay={admin && PlayAction}
            onpause={admin && PauseAction}
            onseeked={admin && PauseAction}
            onloadeddata={SyncAction}
            playsinline={true}
        ></video> : <div class="blackout" />
);

/**********************************************************************
 * Movie List
 */
const LoadAction = function (state: State) {
    let movie = (document.getElementById("movie_list") as HTMLFormElement).value;
    let command = movie ? { pause: [movie, 0] } : { stop: null };
    return [
        { ...state } as State,
        WebSocketCommand(state, command)
    ];
};
const RefreshMovies = (state: State) => [
    state,
    Http({
        url: "/movies",
        action(state, movies) {
            return { ...state, movies };
        },
        error(state, error) {
            console.log(error);
            return state;
        }
    })
];
const NullSubmit = function (state: State, event: Event): State {
    event.preventDefault();
    return state;
}
const MovieList = ({ movies, state, admin }) => (
    <form class="movie_list" onsubmit={NullSubmit}>
        <select id="movie_list" onchange={LoadAction} readonly={!admin}>
            <option value="">Select Movie</option>
            {movies.map((p) => (
                <option selected={
                    (state.playing && state.playing[0] == p) ||
                    (state.paused && state.paused[0] == p)
                }>{p}</option>
            ))}
        </select>
        <button onclick={RefreshMovies}>&nbsp;<i class="fas fa-sync"></i>&nbsp;</button>
    </form>
);

/**********************************************************************
 * Viewers
 */
const AdminAction = (user: string) => function (state: State) {
    return [
        { ...state } as State,
        WebSocketCommand(state, { admin: user })
    ];
};
const UnadminAction = (user: string) => function (state: State) {
    return [
        { ...state } as State,
        WebSocketCommand(state, { unadmin: user })
    ];
};
const ViewerList = ({ viewers, admins }) => (
    <ul class="viewers">
        {viewers.map((p) => (
            <li
                class={admins.includes(p.name) ? "admin" : ""}
                onclick={admins.includes(p.name) ? UnadminAction(p.name) : AdminAction(p.name)}
            >{p.name}</li>
        ))}
    </ul>
);

/**********************************************************************
 * Chat
 */
const ChatAction = function (state: State, event: SubmitEvent) {
    let text = (document.getElementById("chat_input") as HTMLFormElement).value;
    (document.getElementById("chat_input") as HTMLFormElement).value = "";
    event.preventDefault();
    return [
        { ...state } as State,
        WebSocketCommand(state, {
            chat: text,
        })
    ];
};
function absolute_timestamp(ts: number): string {
    function convertUTCDateToLocalDate(date) {
        var newDate = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);

        var offset = date.getTimezoneOffset() / 60;
        var hours = date.getHours();

        newDate.setHours(hours - offset);

        return newDate;
    }
    return convertUTCDateToLocalDate(new Date(ts * 1e3)).toISOString().slice(-13, -8);
}
const Chat = ({ log }: { log: Array<ChatMessage> }) => (
    <div class="chat">
        <ul class="chat_log" id="chat_log">
            {log.map((p) => (<li class={p.user == "system" ? "system" : "user"}>
                <span class="absolute_timestamp">{absolute_timestamp(p.absolute_timestamp)}</span>
                <span class="user">{p.user}</span>
                <span class="message">{p.message}</span>
            </li>))}
        </ul>
        <form class="chat_input" onsubmit={ChatAction}>
            <input id="chat_input" autocomplete={"off"} enterkeyhint={"send"} placeholder="Type to chat"></input>
        </form>
    </div>
);

/**********************************************************************
 * Header
 */
const TitleAction = function (state: State, event: SubmitEvent) {
    let new_title = (document.getElementById("title") as HTMLFormElement).value;
    return [
        // Optimistically change the title locally to avoid flickering back and
        // forth. If the title change fails, the next update will refresh it.
        { ...state, room: { ...state.room, title: new_title } } as State,
        WebSocketCommand(state, {
            title: new_title,
        })
    ];
};
function ToggleSound(state: State): State {
    let new_state = {
        ...state,
        settings: {
            ...state.settings,
            sound: !state.settings.sound,
        },
    };
    localStorage.setItem("settings", JSON.stringify(new_state.settings));
    return new_state;
}
function GoFullscreen(state: State): State {
    requestAnimationFrame(() => document.documentElement.requestFullscreen());
    return { ...state, fullscreen: !state.fullscreen };
}
function ExitFullscreen(state: State): State {
    if (document.exitFullscreen) {
        requestAnimationFrame(() => document.exitFullscreen());
    }
    return { ...state, fullscreen: !state.fullscreen };
}
const LockAction = (state: State) => [
    { ...state } as State,
    WebSocketCommand(state, { lock: null })
];
const UnlockAction = (state: State) => [
    { ...state } as State,
    WebSocketCommand(state, { unlock: null })
];
export const Header = ({ state, admin }: { state: State, admin: boolean }) => (
    <header>
        {state.settings.sound ? (
            <i class="fas fa-bell" onclick={ToggleSound} />
        ) : (
            <i class="fas fa-bell-slash" onclick={ToggleSound} />
        )}
        <h1>
            {admin && (state.room.public ?
                <i class="fas fa-unlock" onclick={LockAction} /> :
                <i class="fas fa-lock" onclick={UnlockAction} />)
            }{" "}
            {state.room.name}:{" "}
            {admin ?
                <input id="title" value={state.room.title} onchange={TitleAction} /> :
                state.room.title
            }
        </h1>
        {state.fullscreen ?
            <i class="fas fa-compress-arrows-alt" onclick={ExitFullscreen} /> :
            <i class="fas fa-expand-arrows-alt" onclick={GoFullscreen} />}
    </header>
);

/**********************************************************************
 * Layout
 */
export const RoomRender = ({ state, admin }: { state: State, admin: boolean }) => (
    <main class={admin ? "room admin" : "room user"}>
        <Header state={state} admin={admin} />
        <MainVideo state={state.room.state} admin={admin} />
        <Chat log={state.room.chat} />
        <ViewerList viewers={state.room.viewers} admins={state.room.admins} />
        <MovieList movies={state.movies} state={state.room.state} admin={admin} />
    </main>
);
