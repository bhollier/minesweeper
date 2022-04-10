import Modal, {BACK_BUTTON} from './modal';
import {Element} from './menu';
import {SPRITES} from './draw';

import {pos} from './common';

export const TITLE: Element = {
    id: 'modal.success.title',
    sprite: SPRITES.SUCCESS_MODAL.TITLE,
    scale: 1,
};

export const RESET_BUTTON: Element = {
    id: 'modal.success.reset_button',
    sprite: SPRITES.SUCCESS_MODAL.RESET,
    hoveredSprite: pos(SPRITES.SUCCESS_MODAL.RESET_HOVERED),
    scale: 1.25,
    interactable: true
};

// The elements, in order of how they're displayed on screen (top down)
const ELEMENTS: Array<Element> = [TITLE, RESET_BUTTON, BACK_BUTTON];

export default Modal.bind(Modal, ELEMENTS);