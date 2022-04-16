import Menu, {Element} from './menu';
import {SPRITES, clear} from '../draw';

import {limiter} from '../util';
import {pos} from '../common';

const TITLE: Element = {
    id: 'menu.main.title',
    sprite: SPRITES.MAIN_MENU.TITLE,
    scale: 1,
};

export const EASY_BUTTON: Element = {
    id: 'menu.main.easy_button',
    sprite: SPRITES.MAIN_MENU.EASY,
    hoveredSprite: pos(SPRITES.MAIN_MENU.EASY_HOVERED),
    scale: 1.25,
    interactable: true
};

export const MEDIUM_BUTTON: Element = {
    id: 'menu.main.medium_button',
    sprite: SPRITES.MAIN_MENU.MEDIUM,
    hoveredSprite: pos(SPRITES.MAIN_MENU.MEDIUM_HOVERED),
    scale: 1.25,
    interactable: true
};

export const HARD_BUTTON: Element = {
    id: 'menu.main.hard_button',
    sprite: SPRITES.MAIN_MENU.HARD,
    hoveredSprite: pos(SPRITES.MAIN_MENU.HARD_HOVERED),
    scale: 1.25,
    interactable: true
};

/* todo implement custom difficulty
export const CUSTOM_BUTTON: Element = {
    id: 'menu.main.custom_button',
    sprite: SPRITES.MAIN_MENU.CUSTOM,
    hoveredSprite: pos(SPRITES.MAIN_MENU.CUSTOM_HOVERED),
    scale: 1.25,
    interactable: false
};*/

export const INFINITE_BUTTON: Element = {
    id: 'menu.main.infinite_button',
    sprite: SPRITES.MAIN_MENU.INFINITE,
    hoveredSprite: pos(SPRITES.MAIN_MENU.INFINITE_HOVERED),
    scale: 1.25,
    interactable: true
};

// The elements, in order of how they're displayed on screen (top down)
const ELEMENTS: Array<Element> = [TITLE, EASY_BUTTON, MEDIUM_BUTTON, HARD_BUTTON/*, CUSTOM_BUTTON*/, INFINITE_BUTTON];

export default class MainMenu extends Menu {
    private readonly drawWithLimit: () => void;

    constructor() {
        super(ELEMENTS);
        super.addEventListener('press', this.draw.bind(this));
        super.addEventListener('hover', this.draw.bind(this));

        // The draw function with a limiter, to prevent flickering when resizing
        this.drawWithLimit = limiter(this.draw.bind(this), 100);

        this.registerEvents();
    }

    async draw() {
        return clear().then(super.draw.bind(this));
    }

    registerEvents() {
        super.registerEvents();
        window.addEventListener('resize', this.drawWithLimit);
    }

    deregisterEvents() {
        super.deregisterEvents();
        window.removeEventListener('resize', this.drawWithLimit);
    }
}