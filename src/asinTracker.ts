import { log } from "crawlee";

let asinTracker: Record<string, any> = {};

export function getAsinTracker() {
    return asinTracker;
}

export function setAsinTracker(newTracker: Record<string, any>) {
    asinTracker = newTracker;
}
