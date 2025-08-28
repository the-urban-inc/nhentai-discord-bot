import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import qs from 'qs';
import { Logger } from '../../structures/Logger';
import { SocksProxyAgent } from 'socks-proxy-agent';

export interface HttpOptions {
    maxRetries?: number;
    retryDelay?: number;
    timeoutMs?: number;
}

export function createHttp(baseURL: string, logger: Logger, socksProxy?: string, opts: HttpOptions = {}): AxiosInstance {
    const a = axios.create({
        baseURL,
        timeout: opts.timeoutMs || 15_000,
        paramsSerializer: p => qs.stringify(p),
    });

    if (socksProxy) {
        const agent = new SocksProxyAgent(socksProxy);
        (a.defaults as any).httpAgent = agent;
        (a.defaults as any).httpsAgent = agent;
    }

    a.interceptors.request.use(cfg => {
        (cfg as any).__start = process.hrtime();
        return cfg;
    });

    a.interceptors.response.use(
        res => {
            const start = (res.config as any).__start as [number, number] | undefined;
            if (start) {
                const elapsed = process.hrtime(start);
                const ms = (elapsed[0] * 1000 + elapsed[1] / 1e6).toFixed(2);
                logger.info(`[nhentai] ${res.config.method?.toUpperCase() || 'GET'} ${res.config.url} -> ${res.status} (${ms}ms)`);
            }
            return res;
        },
        err => {
            const cfg = err.config || {};
            const start = (cfg as any).__start as [number, number] | undefined;
            const elapsed = start ? process.hrtime(start) : undefined;
            const ms = elapsed ? (elapsed[0] * 1000 + elapsed[1] / 1e6).toFixed(2) : 'n/a';
            logger.error(`[nhentai] ${cfg.method?.toUpperCase() || 'GET'} ${cfg.url || 'unknown'} failed (${ms}ms): ${err.message}`);
            return Promise.reject(err);
        }
    );

    axiosRetry(a, {
        retries: opts.maxRetries ?? 2,
        retryDelay: (retryCount, error) => {
            const base = opts.retryDelay ?? 200;
            const backoff = base * Math.pow(2, retryCount - 1);
            return backoff + Math.floor(Math.random() * 100);
        },
        retryCondition: (error) => {
            if (axiosRetry.isNetworkOrIdempotentRequestError(error)) return true;
            const status = error?.response?.status;
            if (!status) return false;
            return status === 429 || (status >= 500 && status <= 599);
        },
    });

    return a;
}
