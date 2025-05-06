export const BASE_URL = "https://www.amazon.com";
export const BASE_SEARCH_URL = `https://www.amazon.com/s?k=`;
export const labels = {
    START: "START",
    LISTING: "LISTING",
    DETAIL: "DETAIL",
    OFFER: "OFFER",
};

export const SELECTORS = {
    productTitleSelector: "#productTitle",
    productDescriptionSelector: "#productDescription",
    offerSelector: ".a-price.a-text-price span",
    sellerSelector:
        'div[data-csa-c-content-id="desktop-merchant-info"][data-csa-c-slot-id="odf-feature-text-desktop-merchant-info"] span',
    asinSelector: 'div[data-csa-c-asin]:not([data-csa-c-asin=""])',
    lastPaginationSelector:
        '.s-pagination-item.s-pagination-disabled:not([class*="s-pagination-previous"])',
    productLinksElementsSelector: 'div[data-cy="title-recipe"] > a',
    searchBorderSelector: ".rhf-border",
};
