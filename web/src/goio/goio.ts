import {postMessage} from './worker-helper';

import {Pos, Rect} from '../common';

export type InitRequestData = {
    width: number,
    height: number,
    mines: number
} | {
    mineDensity: number
}

export function init(data: InitRequestData): Promise<void> {
    return postMessage('init', data);
}

export type AppearanceRequestData = Rect

export type AppearanceResponseData = Array<Array<string>>

export function appearance(data: AppearanceRequestData): Promise<AppearanceResponseData> {
    return postMessage('appearance', data);
}

export type UncoverRequestData = Pos

export type UncoverResponseData = {
    state: string,
    timer: number
}

export function uncover(data: UncoverRequestData): Promise<UncoverResponseData> {
    return postMessage('uncover', data);
}

export type FlagRequestData = Pos

export type FlagResponseData = {
    remainingMines: number
}

export function flag(data: FlagRequestData): Promise<FlagResponseData> {
    return postMessage('flag', data);
}
