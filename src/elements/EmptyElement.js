import Element from '../Element.js';
import { STATE } from '../ElementProperties.js';

class EmptyElement extends Element {
    constructor() {
        super(0, 'empty', 0x000000, {
            density: 0,
            state: STATE.EMPTY,
            movable: false,
            tags: []
        });
    }
}

export default EmptyElement;
