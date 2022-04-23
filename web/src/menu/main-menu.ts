import Menu, {Element} from './menu';
import {SPRITES, clear} from '../draw';

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
    private readonly handleResize: () => void;

    constructor() {
        super(ELEMENTS);
        super.addEventListener('press', () => this.draw());
        super.addEventListener('hover', () => this.draw());

        this.handleResize = () => this.draw();

        this.registerEvents();
    }

    async draw() {
        return clear().then(() => super.draw());
    }

    registerEvents() {
        super.registerEvents();
        window.addEventListener('resize', this.handleResize);
    }

    deregisterEvents() {
        super.deregisterEvents();
        window.removeEventListener('resize', this.handleResize);
    }
}