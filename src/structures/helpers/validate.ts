const PROTOCOL_AND_DOMAIN_RE = /^(?:\w+:)?\/\/(\S+)$/;
const LOCALHOST_DOMAIN_RE = /^localhost[\:?\d]*(?:[^\:?\d]\S*)?$/;
const NON_LOCALHOST_DOMAIN_RE = /^[^\s\.]+\.\S{2,}$/;

export function isBetween(num: number, min: number, max: number) {
    return num >= min && num <= max;
}

export function isObject(object: any) {
    return object != null && typeof object === 'object';
}

export function compareObject(object1: object, object2: object, first = true): boolean {
    const keys1 = Object.keys(object1);
    const keys2 = Object.keys(object2);
    const keys = first ? keys1.filter(key => keys2.includes(key)) : keys1;
    for (const key of keys) {
        const val1 = (object1 as any)[key];
        const val2 = (object2 as any)[key];
        const areObjects = isObject(val1) && isObject(val2);
        if (
            (areObjects && !compareObject(val1, val2, false)) ||
            (!areObjects && val1 !== val2)
        ) {
            return false;
        }
    }
    return true;
}

export function isUrl(s: string) {
    if (typeof s !== 'string') return false;
    const match = s.match(PROTOCOL_AND_DOMAIN_RE);
    if (!match) return false;
    const everythingAfterProtocol = match[1];
    if (!everythingAfterProtocol) return false;
    if (
        LOCALHOST_DOMAIN_RE.test(everythingAfterProtocol) ||
        NON_LOCALHOST_DOMAIN_RE.test(everythingAfterProtocol)
    ) {
        return true;
    }
    return false;
}
