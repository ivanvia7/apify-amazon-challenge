// Axios - Promise based HTTP client for the browser and node.js (Read more at https://axios-http.com/docs/intro).
import { Input } from "./types.js";
import { CheerioCrawler, Router, Request } from "crawlee";
import { router } from "./router.js";

import { Actor } from "apify";
import { checkInput } from "./utils.js";
import { BASE_SEARCH_URL, LABELS } from "./consts.js";
import { failedRequestHandler } from "./utils.js";

// The init() call configures the Actor for its environment. It's recommended to start every Actor with an init().
await Actor.init();

// Structure of input is defined in input_schema.json
const input = await Actor.getInput<Input>();
if (!input) throw new Error("Input is missing!");
checkInput(input);
const { keyword } = input;

//proxy config
const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: ["RESIDENTIAL"],
    countryCode: "US",
});

const startUrl = `${BASE_SEARCH_URL}${keyword}`;

const crawler = new CheerioCrawler({
    requestHandler: router,
    proxyConfiguration,
});

const startRequest = {
    url: startUrl,
    userData: {
        label: LABELS.start,
        keyword,
    },
    failedRequestHandler,
};

await crawler.run([startRequest]);

await Actor.exit();
