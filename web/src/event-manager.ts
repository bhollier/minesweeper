export type EventListener<EventMapT> = (event: EventMapT[keyof EventMapT]) => void

export default class EventManager<EventMapT> {
    private eventListeners: Map<keyof EventMapT, Array<EventListener<EventMapT>>>;

    constructor() {
        this.eventListeners = new Map();
    }

    public addEventListener<K extends keyof EventMapT>(type: K, listener: (event: EventMapT[K]) => void) {
        const listenersForEvent = this.eventListeners.get(type) ?? [];
        this.eventListeners.set(type, [...listenersForEvent, listener]);
    }

    public removeEventListener<K extends keyof EventMapT>(type: K, listener: (event: EventMapT[K]) => void) {
        const listenersForEvent = this.eventListeners.get(type) ?? [];
        this.eventListeners.set(type,
            listenersForEvent.filter(listenerForEvent => listenerForEvent === listener));
    }

    protected callEventListeners<K extends keyof EventMapT>(type: K, event: EventMapT[K]) {
        (this.eventListeners.get(type) ?? []).forEach(listener => listener(event));
    }
}