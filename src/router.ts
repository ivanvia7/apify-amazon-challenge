import { createCheerioRouter, RequestOptions, Dataset } from "crawlee";
import { labels } from "./consts.js";
import { BASE_URL, BASE_SEARCH_URL, SELECTORS } from "./consts.js";
import { createOffersUrl } from "./utils.js";
import { trackOffersPerAsin } from "./utils.js";

export const router = createCheerioRouter();

router.addHandler(labels.START, async ({ $, crawler, request, log }) => {
    const { data } = request.userData;
    const lastPaginationNumber = Number(
        $(SELECTORS.lastPaginationSelector).text().trim(),
    );

    if (!lastPaginationNumber) {
        log.warning(
            "Cannot find the last pagination element on the page. Passing only startUrl to the next page",
        );

        await crawler.addRequests([
            {
                url: `${BASE_SEARCH_URL}${request.userData.data.keyword}&page=1`,
                label: labels.LISTING,
                userData: {
                    data: {
                        ...data,
                    },
                },
            },
        ]);
        return;
    }

    //iterate through all available listing pages and add all of them to the queue
    for (let pageNum = 1; pageNum <= lastPaginationNumber; pageNum++) {
        const url = `${BASE_SEARCH_URL}${request.userData.data.keyword}&page=${pageNum}`;

        await crawler.addRequests([
            {
                url,
                label: labels.LISTING,
                userData: {
                    data: {
                        ...data,
                    },
                },
            },
        ]);
    }
});

router.addHandler(
    labels.LISTING,
    async ({ $, crawler, session, request, log }) => {
        log.info(`Initiating listing handler for list ${request.url}`);

        const { data } = request.userData;

        //extract the link of each product
        const productLinkElements = $(SELECTORS.productLinksElementsSelector);

        if (productLinkElements.length === 0) {
            log.warning(
                `Cannot find any product links using selector on: ${request.url}`,
            );
            session?.markBad();

            if (request.retryCount < 3) {
                log.info(
                    `Retrying request for ${request.url} (attempt ${request.retryCount + 1})`,
                );
                await crawler.addRequests([
                    {
                        ...request,
                        retryCount: request.retryCount + 1,
                    },
                ]);
            } else {
                log.error(`Max retry attempts reached for ${request.url}`);
                session?.markBad();
            }
            return;
        }

        productLinkElements.toArray().forEach((el, index) => {
            const $element = $(el);
            const href = $element.attr("href");

            if (!href) {
                log.warning(
                    `Found a link element without href at index ${index} on ${request.url}`,
                );
                return;
            }

            const productPageUrl = new URL(
                href,
                request.loadedUrl ?? request.url,
            ).toString();

            crawler.addRequests([
                {
                    url: productPageUrl,
                    label: labels.DETAIL,
                    userData: {
                        data: { ...data },
                    },
                },
            ]);
        });
    },
);

router.addHandler(labels.DETAIL, async ({ $, crawler, request, log }) => {
    const { data } = request.userData;

    //extract the basic info about this product
    const productTitle =
        $(SELECTORS.productTitleSelector)?.text().trim() || "undefined";
    const productDescription =
        $(SELECTORS.productDescriptionSelector)?.text().trim() || "undefined";

    const asin = $(SELECTORS.asinSelector).first().attr("data-csa-c-asin");

    const offerUrl = createOffersUrl(asin!);

    log.info(`Scraped initial details for product ${productTitle}`);

    crawler.addRequests([
        {
            url: offerUrl,
            label: labels.OFFER,
            userData: {
                data: {
                    ...data,
                    productTitle,
                    productDescription,
                    asin,
                    productUrl: request.url,
                },
            },
        },
    ]);
});

router.addHandler(labels.OFFER, async ({ $, request }) => {
    const { data } = request.userData;

    for (const offerNode of $(SELECTORS.offerNodeSelector)) {
        const element = $(offerNode);

        //track this offer to the asin
        trackOffersPerAsin(data.asin);

        const sellerNameText = element
            .find(SELECTORS.sellerSelector)
            .first()
            .text()
            .trim();

        const offerPriceText = element
            .find(SELECTORS.offerPriceSelector)
            .first()
            .text()
            .trim();

        await Dataset.pushData({
            ...data,
            sellerName: sellerNameText,
            offer: offerPriceText,
        });
    }
});
