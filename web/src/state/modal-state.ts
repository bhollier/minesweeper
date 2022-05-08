import State, {StateStack} from './state';

import Modal, {BACK_BUTTON, CLOSE_BUTTON} from '../menu/modal';
import {ElementPressEvent} from '../menu/menu';

export default class ModalState<T extends Modal> extends State {
    public readonly modal: T;

    // Assuming here that the modal ctor has no args
    public constructor(stack: StateStack, modalCtor: new() => T) {
        super(stack);
        this.modal = new modalCtor();
        // Add some common event handlers
        this.modal.addEventListener('hover', () => this.stack.draw());
        this.modal.addEventListener('press', (event: ElementPressEvent) => {
            switch (event.pressedElement) {
            case CLOSE_BUTTON.id:
                // Pop the modal state off the stack
                this.pop();
                break;
            case BACK_BUTTON.id:
                // Pop the parent state (and its children, including this one)
                this.parent.pop();
                break;
            }
        });
    }

    public async draw() {
        await this.modal.draw();
    }

    public registerEvents() {
        this.modal.registerEvents();
    }

    public deregisterEvents() {
        this.modal.deregisterEvents();
    }
}