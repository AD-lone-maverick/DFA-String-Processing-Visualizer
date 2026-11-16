/**
 * Deterministic Finite Automaton (DFA) Model and Operations
 * Formal Definition: M = (Q, Σ, δ, q0, F)
 */

export class DFA {
  /**
   * @param {Object} options
   * @param {string[]} [options.states] - List of state names Q
   * @param {string[]} [options.alphabet] - Input alphabet symbols Σ
   * @param {Object.<string, Object.<string, string>>} [options.transitions] - δ: Q x Σ -> Q
   * @param {string} [options.startState] - q0 ∈ Q
   * @param {string[]} [options.acceptStates] - F ⊆ Q
   * @param {Object.<string, {x: number, y: number}>} [options.positions] - Visual coordinates
   */
  constructor({
    states = [],
    alphabet = [],
    transitions = {},
    startState = '',
    acceptStates = [],
    positions = {}
  } = {}) {
    this.states = new Set(states.map(String));
    this.alphabet = new Set(alphabet.map(String));
    this.startState = startState ? String(startState) : '';
    this.acceptStates = new Set(acceptStates.map(String));
    this.positions = { ...positions }; // state -> {x, y}

    // transitions: state -> (symbol -> nextState)
    this.transitions = new Map();
    for (const s of this.states) {
      this.transitions.set(s, new Map());
    }

    if (transitions) {
      for (const [fromState, symMap] of Object.entries(transitions)) {
        if (!this.transitions.has(fromState)) {
          this.transitions.set(fromState, new Map());
          this.states.add(fromState);
        }
        for (const [symbol, toState] of Object.entries(symMap)) {
          this.alphabet.add(symbol);
          this.states.add(toState);
          this.transitions.get(fromState).set(symbol, toState);
        }
      }
    }

    // Default start state if not set but states exist
    if (!this.startState && this.states.size > 0) {
      this.startState = Array.from(this.states)[0];
    }
  }

  /**
   * Clone the DFA
   * @returns {DFA}
   */
  clone() {
    const json = this.toJSON();
    return DFA.fromJSON(json);
  }

  /**
   * Add a state to Q
   * @param {string} state
   * @param {boolean} isAccept
   * @param {{x: number, y: number}} [position]
   */
  addState(state, isAccept = false, position = null) {
    state = String(state).trim();
    if (!state) return;
    this.states.add(state);
    if (!this.transitions.has(state)) {
      this.transitions.set(state, new Map());
    }
    if (isAccept) {
      this.acceptStates.add(state);
    }
    if (position) {
      this.positions[state] = { ...position };
    }
    if (!this.startState) {
      this.startState = state;
    }
  }

  /**
   * Remove a state and all connected transitions
   * @param {string} state
   */
  removeState(state) {
    state = String(state);
    this.states.delete(state);
    this.acceptStates.delete(state);
    this.transitions.delete(state);
    delete this.positions[state];

    for (const [_, symMap] of this.transitions) {
      for (const [sym, dest] of Array.from(symMap.entries())) {
        if (dest === state) {
          symMap.delete(sym);
        }
      }
    }

    if (this.startState === state) {
      this.startState = this.states.size > 0 ? Array.from(this.states)[0] : '';
    }
  }

  /**
   * Rename a state
   */
  renameState(oldName, newName) {
    oldName = String(oldName);
    newName = String(newName).trim();
    if (!newName || oldName === newName || this.states.has(newName)) return false;

    this.states.delete(oldName);
    this.states.add(newName);

    if (this.acceptStates.has(oldName)) {
      this.acceptStates.delete(oldName);
      this.acceptStates.add(newName);
    }

    if (this.startState === oldName) {
      this.startState = newName;
    }

    if (this.positions[oldName]) {
      this.positions[newName] = this.positions[oldName];
      delete this.positions[oldName];
    }

    const oldMap = this.transitions.get(oldName) || new Map();
    this.transitions.delete(oldName);
    this.transitions.set(newName, oldMap);

    // Update targets in other states
    for (const [_, symMap] of this.transitions) {
      for (const [sym, dest] of symMap) {
        if (dest === oldName) {
          symMap.set(sym, newName);
        }
      }
    }
    return true;
  }

  /**
   * Add a symbol to alphabet Σ
   */
  addSymbol(symbol) {
    symbol = String(symbol).trim();
    if (symbol.length > 0) {
      this.alphabet.add(symbol);
    }
  }

  /**
   * Remove a symbol from alphabet and clear its transitions
   */
  removeSymbol(symbol) {
    this.alphabet.delete(symbol);
    for (const [_, symMap] of this.transitions) {
      symMap.delete(symbol);
    }
  }

  /**
   * Set transition: δ(fromState, symbol) = toState
   */
  setTransition(fromState, symbol, toState) {
    fromState = String(fromState);
    symbol = String(symbol);
    toState = toState !== null && toState !== undefined ? String(toState) : null;

    if (!this.states.has(fromState)) this.addState(fromState);
    if (toState && !this.states.has(toState)) this.addState(toState);
    if (!this.alphabet.has(symbol)) this.addSymbol(symbol);

    const symMap = this.transitions.get(fromState);
    if (toState === null || toState === '') {
      symMap.delete(symbol);
    } else {
      symMap.set(symbol, toState);
    }
  }

  /**
   * Get transition: δ(state, symbol)
   * @returns {string|null} next state or null if undefined
   */
  getTransition(state, symbol) {
    const symMap = this.transitions.get(String(state));
    if (!symMap) return null;
    return symMap.get(String(symbol)) || null;
  }

  /**
   * Toggle accept state
   */
  toggleAcceptState(state) {
    state = String(state);
    if (this.acceptStates.has(state)) {
      this.acceptStates.delete(state);
    } else {
      this.acceptStates.add(state);
    }
  }

  /**
   * Set start state
   */
  setStartState(state) {
    state = String(state);
    if (this.states.has(state)) {
      this.startState = state;
    }
  }

  /**
   * Validates DFA completeness and consistency
   * @returns {{isValid: boolean, isComplete: boolean, errors: string[], warnings: string[]}}
   */
  validate() {
    const errors = [];
    const warnings = [];

    if (this.states.size === 0) {
      errors.push('The automaton has no states defined.');
    }
    if (this.alphabet.size === 0) {
      errors.push('The alphabet Σ is empty.');
    }
    if (!this.startState || !this.states.has(this.startState)) {
      errors.push(`Start state "${this.startState}" is not in Q.`);
    }

    for (const acc of this.acceptStates) {
      if (!this.states.has(acc)) {
        errors.push(`Accept state "${acc}" is not defined in Q.`);
      }
    }

    let missingTransitionsCount = 0;
    for (const s of this.states) {
      const symMap = this.transitions.get(s) || new Map();
      for (const a of this.alphabet) {
        if (!symMap.has(a) || !symMap.get(a)) {
          missingTransitionsCount++;
        } else {
          const dest = symMap.get(a);
          if (!this.states.has(dest)) {
            errors.push(`Transition δ(${s}, '${a}') points to undefined state "${dest}".`);
          }
        }
      }
    }

    const isComplete = missingTransitionsCount === 0;
    if (!isComplete && this.states.size > 0 && this.alphabet.size > 0) {
      warnings.push(`DFA is incomplete: ${missingTransitionsCount} transition(s) are missing (they act as implicit trap/dead states).`);
    }

    // Check reachable states
    const reachable = this.getReachableStates();
    const unreachable = Array.from(this.states).filter(s => !reachable.has(s));
    if (unreachable.length > 0) {
      warnings.push(`Unreachable state(s): ${unreachable.join(', ')}.`);
    }

    return {
      isValid: errors.length === 0,
      isComplete,
      errors,
      warnings
    };
  }

  /**
   * Computes reachable states using BFS from start state
   * @returns {Set<string>}
   */
  getReachableStates() {
    const reachable = new Set();
    if (!this.startState || !this.states.has(this.startState)) return reachable;

    const queue = [this.startState];
    reachable.add(this.startState);

    while (queue.length > 0) {
      const curr = queue.shift();
      const symMap = this.transitions.get(curr);
      if (!symMap) continue;

      for (const [_, dest] of symMap) {
        if (dest && this.states.has(dest) && !reachable.has(dest)) {
          reachable.add(dest);
          queue.push(dest);
        }
      }
    }
    return reachable;
  }

  /**
   * Complete DFA by introducing an explicit trap/dead state
   */
  completeWithTrapState(trapName = 'q_dead') {
    let baseName = trapName;
    let idx = 1;
    while (this.states.has(baseName)) {
      baseName = `${trapName}_${idx++}`;
    }

    let neededTrap = false;
    for (const s of Array.from(this.states)) {
      const symMap = this.transitions.get(s) || new Map();
      for (const a of this.alphabet) {
        if (!symMap.has(a) || !symMap.get(a)) {
          neededTrap = true;
          break;
        }
      }
      if (neededTrap) break;
    }

    if (!neededTrap) return null; // already complete

    this.addState(baseName, false);
    for (const a of this.alphabet) {
      this.setTransition(baseName, a, baseName);
    }

    for (const s of Array.from(this.states)) {
      const symMap = this.transitions.get(s);
      for (const a of this.alphabet) {
        if (!symMap.has(a) || !symMap.get(a)) {
          this.setTransition(s, a, baseName);
        }
      }
    }

    return baseName;
  }

  /**
   * Run simulation on string w
   * @param {string} inputString
   * @returns {{
   *   accepted: boolean,
   *   reason: string,
   *   trace: Array<{step: number, state: string, symbol: string|null, nextState: string|null, remaining: string, status: string}>
   * }}
   */
  processString(inputString) {
    const validation = this.validate();
    if (!validation.isValid) {
      return {
        accepted: false,
        reason: `Invalid DFA definition: ${validation.errors.join(' ')}`,
        trace: []
      };
    }

    const chars = Array.from(inputString);
    let currentState = this.startState;
    const trace = [];

    // Initial configuration step (before consuming any symbol)
    trace.push({
      step: 0,
      state: currentState,
      symbol: null,
      nextState: currentState,
      remaining: inputString,
      isAccept: this.acceptStates.has(currentState),
      status: 'START',
      message: `Initial state: ${currentState}`
    });

    for (let i = 0; i < chars.length; i++) {
      const sym = chars[i];
      const remaining = chars.slice(i + 1).join('');

      // Check if symbol in alphabet
      if (!this.alphabet.has(sym)) {
        trace.push({
          step: i + 1,
          state: currentState,
          symbol: sym,
          nextState: null,
          remaining,
          isAccept: false,
          status: 'INVALID_SYMBOL',
          message: `Symbol '${sym}' is not in alphabet Σ = {${Array.from(this.alphabet).join(', ')}}`
        });
        return {
          accepted: false,
          reason: `Rejected: Symbol '${sym}' at position ${i + 1} is not in alphabet Σ.`,
          trace
        };
      }

      const nextState = this.getTransition(currentState, sym);
      if (!nextState) {
        // Missing transition -> Computation blocks (implicit trap state)
        trace.push({
          step: i + 1,
          state: currentState,
          symbol: sym,
          nextState: null,
          remaining,
          isAccept: false,
          status: 'TRAP',
          message: `No transition defined for δ(${currentState}, '${sym}'). Enters implicit trap state.`
        });
        return {
          accepted: false,
          reason: `Rejected: No transition defined for δ(${currentState}, '${sym}') at position ${i + 1}. Computation halts in non-accepting dead state.`,
          trace
        };
      }

      const isNextAccept = this.acceptStates.has(nextState);
      trace.push({
        step: i + 1,
        state: currentState,
        symbol: sym,
        nextState,
        remaining,
        isAccept: isNextAccept,
        status: 'TRANSITION',
        message: `δ(${currentState}, '${sym}') = ${nextState}`
      });

      currentState = nextState;
    }

    const isAccepted = this.acceptStates.has(currentState);
    const finalReason = isAccepted
      ? `Accepted: Finished processing string. State ${currentState} ∈ F (Accepting).`
      : `Rejected: Finished processing string. State ${currentState} ∉ F (Non-accepting).`;

    trace[trace.length - 1].status = isAccepted ? 'ACCEPTED' : 'REJECTED';

    return {
      accepted: isAccepted,
      reason: finalReason,
      finalState: currentState,
      trace
    };
  }

  /**
   * Serialize to JSON
   */
  toJSON() {
    const transitionsObj = {};
    for (const [state, symMap] of this.transitions) {
      transitionsObj[state] = {};
      for (const [sym, dest] of symMap) {
        transitionsObj[state][sym] = dest;
      }
    }

    return {
      states: Array.from(this.states),
      alphabet: Array.from(this.alphabet),
      transitions: transitionsObj,
      startState: this.startState,
      acceptStates: Array.from(this.acceptStates),
      positions: this.positions
    };
  }

  /**
   * Deserialize from JSON
   */
  static fromJSON(json) {
    if (typeof json === 'string') {
      json = JSON.parse(json);
    }
    return new DFA({
      states: json.states || [],
      alphabet: json.alphabet || [],
      transitions: json.transitions || {},
      startState: json.startState || '',
      acceptStates: json.acceptStates || [],
      positions: json.positions || {}
    });
  }
}

