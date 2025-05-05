import { Log, CheerioCrawler } from "crawlee";

export interface Product {
    title: string;
    asin: string;
    itemUrl: string;
    description: string;
    keyword: string;
    seller_name: string;
    offer: string;
}

export interface Input {
    keyword: string;
}

export interface FailedRequestInfo {
    url: string;
    uniqueKey: string;
    retryCount: number;
    errorMessage: string;
    failedAt: string;
}
