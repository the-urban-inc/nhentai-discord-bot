export function chunkify<T>(a: T[], chunk: number) {
    return Array.from(Array(Math.ceil(a.length / chunk)), (_, i) =>
        a.slice(i * chunk, i * chunk + chunk)
    );
}

export function hasCommon<T>(texts: T[], keywords: T[]) {
    return [...new Set(texts)].some(x => new Set(keywords).has(x));
}

export function random<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
}

export function shuffle<T>(array: readonly T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}
