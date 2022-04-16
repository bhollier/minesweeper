import Modal, {BACK_BUTTON} from './modal';
import {Element} from './menu';
import {SPRITES} from '../draw';

import {pos} from '../common';

export const TITLE: Element = {
    id: 'modal.retry.title',
    sprite: SPRITES.RETRY_MODAL.TITLE,
    scale: 1,
};

export const RETRY_BUTTON: Element = {
    id: 'modal.retry.retry_button',
    sprite: SPRITES.RETRY_MODAL.RETRY,
    hoveredSprite: pos(SPRITES.RETRY_MODAL.RETRY_HOVERED),
    scale: 1.25,
    interactable: true
};

// The elements, in order of how they're displayed on screen (top down)
const ELEMENTS: Array<Element> = [TITLE, RETRY_BUTTON, BACK_BUTTON];

export default Modal.bind(Modal, ELEMENTS);