import { createCheerioRouter, RequestOptions, Dataset } from "crawlee";
import { LABELS } from "./consts.js";
import { BASE_URL, BASE_SEARCH_URL, SELECTORS } from "./consts.js";

export const router = createCheerioRouter();

router.addHandler(LABELS.start, async ({ $, crawler, request, log }) => {
    log.info("Beginning processing Start handler.");

    const lastPaginationString = $(SELECTORS.lastPaginationSelector)
        .text()
        .trim();

    if (!lastPaginationString) {
        log.warning(
            "Cannot find the last pagination element on the page. Passing only startUrl to the next page",
        );

        await crawler.addRequests([
            {
                url: request.url,
                label: LABELS.search,
                userData: {
                    keyword: request.userData.keyword,
                },
            },
        ]);
    }

    const lastPaginationNumber = Number(lastPaginationString);

    log.info(
        `Found that the input keyword '${request.userData.keyword}' has ${lastPaginationNumber} pages`,
    );

    for (let pageNum = 1; pageNum <= lastPaginationNumber; pageNum++) {
        try {
            const url = `${BASE_SEARCH_URL}${request.userData.keyword}&page=${pageNum}`;

            await crawler.addRequests([
                {
                    url,
                    label: LABELS.search,
                    userData: {
                        keyword: request.userData.keyword,
                    },
                },
            ]);
        } catch (e) {
            log.error(
                "Failed to construct URL for page ${i} from base ${request.url}",
                e!,
            );
        }
    }
});

router.addHandler(
    LABELS.search,
    async ({ $, waitForSelector, crawler, request, log }) => {
        log.info(`Extracting product links from search page: ${request.url}`);

        await waitForSelector(SELECTORS.searchBorderSelector);

        const productLinkElements = $(SELECTORS.productLinksElementsSelector);

        if (productLinkElements.length === 0) {
            log.warning(
                `Cannot find any product links using selector on: ${request.url}`,
            );
            return;
        }

        const requestsToAdd: RequestOptions[] = [];

        productLinkElements.each((index, el) => {
            const $element = $(el);
            const relativeOrAbsoluteUrl = $element.attr("href");

            if (!relativeOrAbsoluteUrl) {
                log.warning(
                    `Found a link element without an href attribute at index ${index} on ${request.url}`,
                );
                return;
            }

            try {
                const productPageUrl = new URL(
                    relativeOrAbsoluteUrl,
                    request.loadedUrl ?? request.url,
                ).toString();

                const newRequest: RequestOptions = {
                    url: productPageUrl,
                    label: LABELS.detail,
                    userData: {
                        ...request.userData,
                        sourcePage: request.url,
                    },
                };

                requestsToAdd.push(newRequest);
            } catch (e: any) {
                log.error(
                    `Failed to construct URL or create request object for href "${relativeOrAbsoluteUrl}" on page ${request.url}: ${e.message}`,
                    { error: e },
                );
            }
        });

        if (requestsToAdd.length > 0) {
            log.info(`Adding ${requestsToAdd.length} product detail requests.`);
            await crawler.addRequests(requestsToAdd);
        } else {
            log.info(
                `No valid product links found or processed on ${request.url}`,
            );
        }
    },
);

router.addHandler(
    LABELS.detail,
    async ({ $, waitForSelector, request, log }) => {
        await waitForSelector(SELECTORS.productTitleSelector);

        const productTitle =
            $(SELECTORS.productTitleSelector)?.text().trim() || "undefined";
        const productDescription =
            $(SELECTORS.productDescriptionSelector)?.text().trim() ||
            "undefined";
        const offer =
            $(SELECTORS.offerSelector)?.first().text().trim() || "undefined";
        const seller =
            $(SELECTORS.sellerSelector).first().text().trim() || "undefined";

        const asin = $(SELECTORS.asinSelector).first().attr("data-csa-c-asin");

        log.info(
            `Extracting the details form the product page: ${productTitle}`,
        );

        await Dataset.pushData({
            title: productTitle,
            itemUrl: request.url,
            asin,
            description: productDescription,
            keyword: request.userData.keyword,
            seller_name: seller,
            offer,
        });
    },
);
