declare module '*.png';
declare module 'hyperapp';

type FormInputEvent = {
    target: HTMLTextAreaElement;
};

type Viewer = {
    name: string,
}

type ChatMessage = {
    absolute_timestamp: number,
    user: string,
    message: string,
}

type RoomState = {
    stopped?: null,
    paused?: [string, number],
    playing?: [string, number],
}

type Room = {
    name: string,
    title: string,
	state: RoomState,
    admins: Array<string>,
    viewers: Array<Viewer>,
	chat: Array<ChatMessage>,
    movie: string | null,
    public: boolean,
}

interface Dictionary<T> {
    [Key: string]: T;
}

type State = {
    conn: {
        user: string,
        room: string,
        sess: string,
    },
    movies: Array<string>,
    rooms: Dictionary<string>,
    error: string,
    room: Room,
    ws_errors: number,
    loading: string,
    fullscreen: boolean,
    manual_entry: boolean,
    help: boolean,
    can_play: boolean,
    currentTime: number,
    duration: number,
    show_settings: boolean,
    show_chat: boolean,
    title_edit: string,
    show_system: boolean,
}

declare type Action = import('hyperapp').Action<State>;
declare type Effect = import('hyperapp').Effect<State>;
declare type Dispatchable = import('hyperapp').Dispatchable<State>;
declare type Subscription = import('hyperapp').Subscription<State>;
declare type VNode = import('hyperapp').VNode<State>;
