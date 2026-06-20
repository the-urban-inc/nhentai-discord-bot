import { Client } from './Client';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { BLOCKED_MESSAGE } from '@constants';
import * as textHelpers from './helpers/text';
import * as timeHelpers from './helpers/time';
import * as arrayHelpers from './helpers/array';
import * as validateHelpers from './helpers/validate';
import * as encodingHelpers from './helpers/encoding';

/**
 * Facade over the stateless helper modules in `./helpers/*`. The pure logic lives in
 * those modules (and is unit-testable without the Client graph); this class exposes them
 * as `client.util.*` and additionally hosts the Discord-dependent `communityGuidelines`.
 */
export class Util {
    client: Client;
    constructor(client: Client) {
        this.client = client;
    }

    // --- encoding ---
    base64(text: string, mode = 'encode') {
        return encodingHelpers.base64(text, mode);
    }

    // --- array ---
    chunkify<T>(a: T[], chunk: number) {
        return arrayHelpers.chunkify(a, chunk);
    }

    hasCommon<T>(texts: T[], keywords: T[]) {
        return arrayHelpers.hasCommon(texts, keywords);
    }

    random<T>(array: T[]): T {
        return arrayHelpers.random(array);
    }

    shuffle<T>(array: readonly T[]): T[] {
        return arrayHelpers.shuffle(array);
    }

    // --- time ---
    formatDuration(totalSeconds: number) {
        return timeHelpers.formatDuration(totalSeconds);
    }

    parseDurationString(str: string) {
        return timeHelpers.parseDurationString(str);
    }

    createProgressBar(currentMs: number, totalMs: number, length = 18) {
        return timeHelpers.createProgressBar(currentMs, totalMs, length);
    }

    formatMilliseconds(ms: number) {
        return timeHelpers.formatMilliseconds(ms);
    }

    // --- validate ---
    isBetween(num: number, min: number, max: number) {
        return validateHelpers.isBetween(num, min, max);
    }

    isObject(object: any) {
        return validateHelpers.isObject(object);
    }

    isUrl(s: string) {
        return validateHelpers.isUrl(s);
    }

    compareObject(object1: object, object2: object, first = true) {
        return validateHelpers.compareObject(object1, object2, first);
    }

    // --- text ---
    capitalize(text: string) {
        return textHelpers.capitalize(text);
    }

    escapeMarkdown(text: string) {
        return textHelpers.escapeMarkdown(text);
    }

    escapeRegExp(text: string) {
        return textHelpers.escapeRegExp(text);
    }

    gshorten(tags: Array<string>, split = ' ', maxLen = 1024) {
        return textHelpers.gshorten(tags, split, maxLen);
    }

    indefiniteArticle(phrase: string) {
        return textHelpers.indefiniteArticle(phrase);
    }

    pad(text: string, width: number, char = '0') {
        return textHelpers.pad(text, width, char);
    }

    shorten(text: string, split = ' ', maxLen = 4090) {
        return textHelpers.shorten(text, split, maxLen);
    }

    splitWithQuotes(text: string) {
        return textHelpers.splitWithQuotes(text);
    }

    resolvePerm(text: string) {
        return textHelpers.resolvePerm(text);
    }

    // --- Discord-dependent (not extractable) ---
    communityGuidelines() {
        return {
            content: BLOCKED_MESSAGE,
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setLabel('Discord Community Guidelines')
                        .setURL('https://discord.com/guidelines')
                        .setStyle(ButtonStyle.Link)
                ),
            ],
            flags: 64, // MessageFlags.Ephemeral,
        };
    }
}
