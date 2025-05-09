import { StatsTracker } from "./types.js";

let statsTracker: StatsTracker = {
    errors: {},
    totalSaved: 0,
};

export function getStatsTracker(): StatsTracker {
    return statsTracker;
}

export function setStatsTracker(newTracker: StatsTracker): void {
    statsTracker = newTracker;
}
