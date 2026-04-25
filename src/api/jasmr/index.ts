import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { Logger } from '../../structures/Logger';
import {
	APITag,
	APISearchResult,
	APIVideoDetail,
	APISearchResponse,
} from './types';

export enum Sort {
	Relevance = 'relevance',
	UploadDate = 'upload',
	ViewCount = 'views',
	Rating = 'rating',
}

export interface SearchResult {
	language: string;
	rating: string;
	circle: string;
	title: string;
	url: string;
	tags: string[];
	image: string;
	duration: string;
	views: string;
	likes: string;
}

export interface VideoDetail {
	rjCode: string;
	title: string;
	url: string;
	image: string;
	source: string;
	duration: string;
	circle: string;
	tags: string[];
	tracks: { title: string; length: number }[];
}

export interface SearchFilters {
	durationMin?: number;
	durationMax?: number;
	ageRating?: 'all' | 'r18' | 'r15' | 'general';
	date?: 'alltime' | 'today' | 'week' | 'month' | 'year';
}

export class Client {
	public baseURL = 'https://www.jasmr.net';
	private http: AxiosInstance;

	constructor(options?: { logger?: Logger }) {
		const logger = options?.logger;

		this.http = axios.create({
			baseURL: this.baseURL,
			timeout: 15_000,
			headers: {
				'User-Agent': 'nhentai-discord-bot/4.10.0 (ASMR module)',
			},
		});

		this.http.interceptors.request.use(cfg => {
			(cfg as any).__start = process.hrtime();
			return cfg;
		});

		this.http.interceptors.response.use(
			res => {
				const start = (res.config as any).__start as [number, number] | undefined;
				if (start && logger) {
					const elapsed = process.hrtime(start);
					const ms = (elapsed[0] * 1000 + elapsed[1] / 1e6).toFixed(2);
					logger.info(`[jasmr] ${res.config.method?.toUpperCase() || 'GET'} ${res.config.url} -> ${res.status} (${ms}ms)`);
				}
				return res;
			},
			err => {
				const cfg = err.config || {};
				const start = (cfg as any).__start as [number, number] | undefined;
				const elapsed = start ? process.hrtime(start) : undefined;
				const ms = elapsed ? (elapsed[0] * 1000 + elapsed[1] / 1e6).toFixed(2) : 'n/a';
				if (logger) {
					logger.error(`[jasmr] ${cfg.method?.toUpperCase() || 'GET'} ${cfg.url || 'unknown'} failed (${ms}ms): ${err.message}`);
				}
				return Promise.reject(err);
			}
		);

		axiosRetry(this.http, {
			retries: 3,
			retryDelay: (retryCount, error) => {
				if (error?.response?.status === 429) {
					return 60_000;
				}
				const base = 200;
				const backoff = base * Math.pow(2, retryCount - 1);
				return backoff + Math.floor(Math.random() * 100);
			},
			retryCondition: (error) => {
				if (axiosRetry.isNetworkOrIdempotentRequestError(error)) return true;
				const status = error?.response?.status;
				if (!status) return false;
				return (status >= 500 && status <= 599) || status === 429;
			},
		});
	}

	private parseCircle(circleRaw: string): { romaji: string; kana: string } {
		try {
			const parsed = JSON.parse(circleRaw);
			return {
				romaji: parsed.romaji || parsed.name || 'Unknown',
				kana: parsed.kana || '',
			};
		}
		catch {
			return { romaji: circleRaw, kana: '' };
		}
	}

	private parseTags(tagsRaw: string): string[] {
		try {
			const parsed = JSON.parse(tagsRaw);
			if (Array.isArray(parsed)) {
				return parsed.map((t: any) => t.english || t.name || String(t));
			}
		}
		catch {
			// Fallback: return empty array
		}
		return [];
	}

	private parseTracks(tracksRaw: string): { title: string; length: number }[] {
		try {
			const parsed = JSON.parse(tracksRaw);
			if (Array.isArray(parsed)) {
				return parsed.map((t: any) => ({
					title: t.title?.english || t.title?.japanese || 'Unknown',
					length: typeof t.length === 'number' ? t.length : 0,
				}));
			}
		}
		catch {
			// Fallback
		}
		return [];
	}

	private mapResult(item: APISearchResult): SearchResult {
		const circle = this.parseCircle(item.circle);
		const tags = this.parseTags(item.tags);
		const title = item.title.english || item.title.japanese || item.rjCode;
		const image = item.image.startsWith('http')
			? item.image
			: `${this.baseURL}${item.image}`;

		return {
			language: item.language,
			rating: item.ageRating,
			circle: circle.romaji,
			title,
			url: `${this.baseURL}/watch/${item.rjCode}`,
			tags,
			image,
			duration: item.duration,
			views: String(item.views),
			likes: String(item.likes),
		};
	}

	private validateSearchResponse(data: unknown): APISearchResponse {
		if (typeof data !== 'object' || data === null) {
			throw new Error('Invalid search response: expected object');
		}
		const d = data as Record<string, unknown>;
		if (!Array.isArray(d.results)) {
			throw new Error('Invalid search response: missing results array');
		}
		if (typeof d.totalCount !== 'number') {
			throw new Error('Invalid search response: missing totalCount');
		}
		return d as unknown as APISearchResponse;
	}

	private validateTagsResponse(data: unknown): APITag[] {
		if (!Array.isArray(data)) {
			throw new Error('Invalid tags response: expected array');
		}
		return data as APITag[];
	}

	private validateVideoDetailResponse(data: unknown): APIVideoDetail {
		if (typeof data !== 'object' || data === null) {
			throw new Error('Invalid video detail response: expected object');
		}
		const d = data as Record<string, unknown>;
		if (typeof d.source !== 'string') {
			throw new Error('Invalid video detail response: missing source');
		}
		return d as unknown as APIVideoDetail;
	}

	private buildRatingParams(rating?: string): { r18: boolean; r15: boolean; all: boolean } {
		switch (rating) {
			case 'r18':
				return { r18: true, r15: false, all: false };
			case 'r15':
				return { r18: false, r15: true, all: false };
			case 'general':
				return { r18: false, r15: false, all: true };
			case 'all':
			default:
				return { r18: true, r15: true, all: true };
		}
	}

	public async tag(tag: string): Promise<SearchResult[]> {
		const { results } = await this.search(tag, 1, Sort.Relevance);
		return results;
	}

	public async search(
		query: string,
		page = 1,
		sort = 'relevance',
		filters: SearchFilters = {}
	): Promise<{ results: SearchResult[]; totalCount: number }> {
		const ratingParams = this.buildRatingParams(filters.ageRating);
		const params = new URLSearchParams({
			page: String(page),
			limit: '24',
			r18: String(ratingParams.r18),
			r15: String(ratingParams.r15),
			all: String(ratingParams.all),
			type: 'video',
			date: filters.date || 'alltime',
			min: String(filters.durationMin ?? 0),
			max: String(filters.durationMax ?? 6000),
			tracks: 'false',
			exclude: '',
			search: query,
			sort,
		});

		const res = await this.http.get(`/api/v1/search?${params.toString()}`);
		const data = this.validateSearchResponse(res.data);
		return {
			results: data.results.map(r => this.mapResult(r)),
			totalCount: data.totalCount,
		};
	}

	public async video(url: string): Promise<string> {
		const detail = await this.details(url);
		return detail.source;
	}

	public async details(url: string): Promise<VideoDetail> {
		const match = url.match(/\/watch\/(RJ\d+)/);
		if (!match) {
			throw new Error('Invalid JASMR video URL');
		}

		const rjCode = match[1];
		const res = await this.http.get(`/api/v1/videos?code=${rjCode}`);
		const data = this.validateVideoDetailResponse(res.data);

		const circle = this.parseCircle(data.circle);
		const tags = this.parseTags(data.tags);
		const tracks = this.parseTracks(data.tracks);
		const title = data.title.english || data.title.japanese || data.rjCode;
		const image = data.thumbnail.startsWith('http')
			? data.thumbnail
			: `${this.baseURL}${data.thumbnail}`;
		const source = data.source.startsWith('http')
			? data.source
			: `${this.baseURL}${data.source}`;

		return {
			rjCode: data.rjCode,
			title,
			url: `${this.baseURL}/watch/${data.rjCode}`,
			image,
			source,
			duration: data.duration,
			circle: circle.romaji,
			tags,
			tracks,
		};
	}

	public async tagList(): Promise<string[]> {
		const res = await this.http.get('/api/v1/tags');
		const data = this.validateTagsResponse(res.data);

		return data
			.filter(t => t.name.english !== 'Rape')
			.map(t => t.name.english || t.name.japanese || String(t.id));
	}
}
