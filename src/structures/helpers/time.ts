export function formatDuration(totalSeconds: number) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const parts = [
        minutes.toString().padStart(2, '0'),
        seconds.toString().padStart(2, '0'),
    ];
    if (hours > 0) {
        parts.unshift(hours.toString().padStart(2, '0'));
    }
    return parts.join(':');
}

export function parseDurationString(str: string) {
    const parts = str.split(':').map(Number).filter(n => !isNaN(n));
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 1) return parts[0];
    return 0;
}

export function createProgressBar(currentMs: number, totalMs: number, length = 18) {
    if (totalMs <= 0) return '─'.repeat(length);
    const fraction = Math.min(currentMs / totalMs, 1);
    const position = Math.round(fraction * (length - 1));
    const played = '▬'.repeat(position);
    const slider = '🔘';
    const remaining = '─'.repeat(length - position - 1);
    return played + slider + remaining;
}

export function formatMilliseconds(ms: number) {
    let x = Math.floor(ms / 1000);
    const s = x % 60;

    x = Math.floor(x / 60);
    const m = x % 60;

    x = Math.floor(x / 60);
    const h = x % 24;

    const d = Math.floor(x / 24);

    const seconds = `${'0'.repeat(2 - s.toString().length)}${s}`;
    const minutes = `${'0'.repeat(2 - m.toString().length)}${m}`;
    const hours = `${'0'.repeat(2 - h.toString().length)}${h}`;
    const days = `${'0'.repeat(Math.max(0, 2 - d.toString().length))}${d}`;

    return `${days === '00' ? '' : `${days}:`}${hours}:${minutes}:${seconds}`;
}
