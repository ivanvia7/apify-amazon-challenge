import { Input } from "./types.js";
import { FailedRequestInfo } from "./types.js";
import { Actor, log } from "apify";
import { getAsinTracker } from "./asinTracker.js";
import { CheerioCrawler, Session, Request } from "crawlee";
import { getStatsTracker } from "./statsTracker.js";

export function checkInput(input: Input) {
    if (!input || !input.keyword || typeof input.keyword !== "string") {
        console.error("Please define the correct keyword as a string");
        Actor.fail("Please define the correct keyword as a string");
    }
}

export const failedRequestHandler = async (context: any): Promise<void> => {
    const { request, error, log } = context;

    log.error(
        `Request ${request.url} failed after ${request.retryCount + 1} attempts: ${error.message}`,
    );

    const failedRequestInfo: FailedRequestInfo = {
        url: request.url,
        uniqueKey: request.uniqueKey,
        retryCount: request.retryCount,
        errorMessage: error.message,
        failedAt: new Date().toISOString(),
    };

    await Actor.pushData(failedRequestInfo);
};

export const createOffersUrl = (asin: string): string => {
    const offersUrl = `https://www.amazon.com/gp/product/ajax/ref=dp_aod_ALL_mbc?asin=${asin}&m=&qid=1746454175&smid=&sourcecustomerorglistid=&sourcecustomerorglistitemid=&sr=8-54&pc=dp&experienceId=aodAjaxMain`;
    return offersUrl;
};

export const trackOffersPerAsin = (asin: string) => {
    const tracker = getAsinTracker();

    if (tracker.hasOwnProperty(asin)) {
        tracker[asin] = tracker[asin] + 1;
    } else {
        tracker[asin] = 1;
    }

    return tracker;
};

export async function logEvery10Seconds(object: Record<string, number> | {}) {
    while (true) {
        log.info(`✍️ Logging state:${JSON.stringify(object, null, 2)}`);
        await new Promise((resolve) => setTimeout(resolve, 10_000));
    }
}

export async function retryRequestManually(
    crawler: CheerioCrawler,
    request: Request,
    session: Session | undefined,
) {
    if (request.retryCount < 3) {
        log.info(
            `Retrying request for ${request.url} (attempt ${request.retryCount + 1})`,
        );
        await crawler.addRequests([
            {
                url: request.url,
                method: request.method,
                headers: request.headers,
                payload: request.payload,
                userData: { ...request.userData },
                retryCount: request.retryCount + 1,
            },
        ]);
    } else {
        log.error(`Max retry attempts reached for ${request.url}`);
        session?.markBad();
    }
}

export const trackErrorsPerRequest = (request: Request, error: string) => {
    const stats = getStatsTracker();
    const url = request.url;

    if (!stats.errors[url]) {
        stats.errors[url] = [];
    }

    stats.errors[url].push(error);

    stats.totalSaved++;

    return stats;
};
