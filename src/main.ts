import { Input } from "./types.js";
import { CheerioCrawler, Router, Request } from "crawlee";
import { router } from "./router.js";
import { Actor, log } from "apify";
import { checkInput } from "./utils.js";
import { BASE_SEARCH_URL, labels } from "./consts.js";
import {
    failedRequestHandler,
    logEvery10Seconds,
    trackErrorsPerRequest,
} from "./utils.js";
import { setAsinTracker, getAsinTracker } from "./asinTracker.js";
import { getStatsTracker, setStatsTracker } from "./statsTracker.js";
import { StatsTracker } from "./types.js";

await Actor.init();

const input = await Actor.getInput<Input>();
if (!input) throw new Error("Input is missing!");
checkInput(input);
const { keyword } = input;

//check for the previous state for AsinTracker
const myAsinTrackerState = (await Actor.getValue("asin-tracker-state")) || {};
setAsinTracker(myAsinTrackerState);

//check for the previous state for statsTracker
const myStatsTrackerState =
    ((await Actor.getValue("STATS")) as StatsTracker) || getStatsTracker();
setStatsTracker(myStatsTrackerState);

//initialize the logging of the asinTracker
logEvery10Seconds(getStatsTracker());

//setup the listener for a new state
Actor.on("migrating", async () => {
    Actor.setValue("asin-tracker-state", getAsinTracker());
    await Actor.reboot();
});

//proxy config
const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: ["RESIDENTIAL"],
    countryCode: "US",
});

const crawler = new CheerioCrawler({
    requestHandler: router,
    proxyConfiguration,
    useSessionPool: true,
    sessionPoolOptions: {
        maxPoolSize: 100,
        sessionOptions: { maxUsageCount: 5 },
    },
    async errorHandler({ request, error }) {
        const message = error instanceof Error ? error.message : String(error);
        const cleanMessage = message
            .replace(/\n/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        trackErrorsPerRequest(request, cleanMessage);
        // console.error(`Error occurred on ${request.url}:`, error);
    },
});

const startRequest = {
    url: `${BASE_SEARCH_URL}${keyword}`,
    userData: {
        label: labels.START,
        data: {
            keyword,
        },
    },
    failedRequestHandler,
    requestHandlerTimeoutSecs: 60,
    navigationTimeoutSecs: 60,
};

await crawler.run([startRequest]);

log.info(`✅ Last asinTracker state:${getAsinTracker()}`);

await Actor.exit();
