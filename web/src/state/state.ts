export default abstract class State {
    protected readonly stack: StateStack;
    protected readonly parent: State;

    protected constructor(stack: StateStack) {
        this.stack = stack;
        this.parent = stack.top();
    }

    // Pop's the state (and any child states) off the stack
    public pop() {
        // While there are states to pop
        while (this.stack.top()) {
            // Pop the top state
            const poppedState = this.stack.pop();
            // If this state was popped, exit
            if (poppedState == this) {
                break;
            }
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    protected onPop(): void {}

    abstract draw(): Promise<void>
    abstract registerEvents(): void
    abstract deregisterEvents(): void
}

type StateConstructor0<R extends State> = new(stack: StateStack) => R
type StateConstructor1<R extends State, A1> = new(stack: StateStack, arg1: A1) => R
type StateConstructor2<R extends State, A1, A2> = new(stack: StateStack, arg1: A1, arg2: A2) => R
type StateConstructor3<R extends State, A1, A2, A3> = new(stack: StateStack, arg1: A1, arg2: A2, arg3: A3) => R
type StateConstructorN<R extends State> = new(stack: StateStack, ...args: unknown[]) => R

export class StateStack {
    private readonly states : Array<State>;

    public constructor() {
        this.states = [];
    }

    public push<T extends State>(stateCtor: StateConstructor0<T>): T
    public push<T extends State, A1>(stateCtor: StateConstructor1<T, A1>, arg1: A1)
    public push<T extends State, A1, A2>(stateCtor: StateConstructor2<T, A1, A2>, arg1: A1, arg2: A2)
    public push<T extends State, A1, A2, A3>(stateCtor: StateConstructor3<T, A1, A2, A3>, arg1: A1, arg2: A2, arg3: A3)
    public push<T extends State>(stateCtor: StateConstructorN<T>, ...args: unknown[]): T {
        // Deregister the top state (if it exists)
        if (this.top()) {
            this.top().deregisterEvents();
        }
        // Create the new state
        const state = new stateCtor(this, ...args);
        this.states.push(state);
        // Redraw
        this.draw();
        return state;
    }

    public pop(): State {
        // Pop the top state
        const poppedState = this.states.pop();
        // Deregister the popped state
        poppedState.deregisterEvents();
        poppedState['onPop']();

        // Register the top state (if it exists)
        if (this.top()) {
            this.top().registerEvents();
        }

        // Redraw
        this.draw();
        return poppedState;
    }

    public top(): State {
        return this.states[this.states.length - 1];
    }

    public async draw() {
        for (const state of this.states) {
            // todo drawing main menu despite Game not being transparent

            await state.draw();
        }
    }
}