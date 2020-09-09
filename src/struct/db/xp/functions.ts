export function recalculate(op: 'add' | 'sub' | 'set', before: number, amount: number) {
    switch(op) {
        case 'add':
            return before + amount;
        case 'sub':
            return before - amount > 0 ? before - amount : 0;
        case 'set':
            return amount;
        default:
            return 0;
    }
}

export function levelToEXP(level: number) {
    return level * level * 100;
}

export function expToLevel(exp: number) {
    return Math.floor(0.1 * Math.sqrt(exp));
}
