export interface APILocalizedName {
	english: string;
	japanese: string;
	chinese: string;
	korean: string;
	spanish: string;
}

export interface APITag {
	id: number;
	name: APILocalizedName;
	explicit: boolean;
	videoCount: number;
	type: string;
}

export interface APISearchResult {
	id: number;
	image: string;
	imageBlur: string;
	rjCode: string;
	language: string;
	ageRating: string;
	duration: string;
	subtitled: boolean;
	subtitleType: string;
	title: APILocalizedName;
	circleId: number;
	circle: string;
	tags: string;
	views: number;
	likes: number;
	userProgress: number;
}

export interface APITrack {
	title: APILocalizedName;
	length: number;
}

export interface APIVideoDetail {
	id: number;
	type: string;
	hqDownload: string;
	thumbnail: string;
	duration: string;
	rjCode: string;
	likes: number;
	saves: number;
	subtitled: boolean;
	isLiked: string;
	isSaved: number;
	title: APILocalizedName;
	description: APILocalizedName;
	circle: string;
	captions: Record<string, string>;
	images: string;
	tags: string;
	tracks: string;
	ageRating: string;
	comments: string;
	userProgress: number;
	engagement: string;
	isTranslationRequested: number;
	source: string;
	earlyAccessLocked: boolean;
	related: APISearchResult[];
}

export interface APISearchResponse {
	results: APISearchResult[];
	totalCount: number;
}
