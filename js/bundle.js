/**
 * DFA String Processing Visualizer - Standalone Bundle
 * Auto-generated for direct file:// and http:// execution
 */
(function() {
  'use strict';

  /**
 * Deterministic Finite Automaton (DFA) Model and Operations
 * Formal Definition: M = (Q, Σ, δ, q0, F)
 */

class DFA {
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

  /**
 * Regular Expression to DFA Converter
 * 1. Shunting-Yard (Infix -> Postfix with explicit concatenation)
 * 2. Thompson's Construction (Postfix -> ε-NFA)
 * 3. Subset Construction (ε-NFA -> DFA)
 */



const EPSILON = 'ε';

class NFAState {
  static idCounter = 0;
  constructor(name = null) {
    this.id = name !== null ? name : `n${NFAState.idCounter++}`;
    // transitions: symbol -> Set<NFAState>
    this.transitions = new Map();
  }

  addTransition(symbol, state) {
    if (!this.transitions.has(symbol)) {
      this.transitions.set(symbol, new Set());
    }
    this.transitions.get(symbol).add(state);
  }
}

class NFAFragment {
  constructor(start, accept) {
    this.start = start;
    this.accept = accept;
  }
}

class RegexEngine {
  /**
   * Preprocesses regex string and inserts explicit concatenation operators ('.')
   * Handles:
   *  - Literals (alphanumeric, etc.)
   *  - Operators: '|', '*', '+', '?', '(', ')'
   *  - Epsilon: 'ε', 'e', 'E', '\e'
   */
  static insertConcatOperators(regex) {
    let output = '';
    const length = regex.length;

    for (let i = 0; i < length; i++) {
      const c = regex[i];
      output += c;

      if (i + 1 < length) {
        const next = regex[i + 1];

        // Is current an atom or postfix operator that can be followed by concatenation?
        const isCurrentAtomOrPostfix =
          c !== '(' && c !== '|' && c !== '\\';

        // Is next an atom or prefix '(' that can follow a concatenation?
        const isNextAtomOrPrefix =
          next !== ')' && next !== '|' && next !== '*' && next !== '+' && next !== '?';

        if (isCurrentAtomOrPostfix && isNextAtomOrPrefix) {
          output += '·';
        }
      }
    }
    return output;
  }

  /**
   * Shunting-yard algorithm to convert infix regex to postfix notation
   */
  static infixToPostfix(regex) {
    // Clean whitespace
    const cleanRegex = regex.replace(/\s+/g, '');
    if (!cleanRegex) return '';

    const formatted = RegexEngine.insertConcatOperators(cleanRegex);
    const output = [];
    const opStack = [];

    const precedence = {
      '*': 4,
      '+': 4,
      '?': 4,
      '·': 3,
      '|': 2
    };

    for (let i = 0; i < formatted.length; i++) {
      const c = formatted[i];

      if (c === '(') {
        opStack.push(c);
      } else if (c === ')') {
        while (opStack.length > 0 && opStack[opStack.length - 1] !== '(') {
          output.push(opStack.pop());
        }
        if (opStack.length === 0) {
          throw new Error('Mismatched parentheses in regular expression.');
        }
        opStack.pop(); // remove '('
      } else if (c in precedence) {
        const currentPrec = precedence[c];
        // Right-associative unary operators (*, +, ?)
        if (c === '*' || c === '+' || c === '?') {
          while (
            opStack.length > 0 &&
            opStack[opStack.length - 1] !== '(' &&
            precedence[opStack[opStack.length - 1]] > currentPrec
          ) {
            output.push(opStack.pop());
          }
        } else {
          // Left-associative binary operators (·, |)
          while (
            opStack.length > 0 &&
            opStack[opStack.length - 1] !== '(' &&
            precedence[opStack[opStack.length - 1]] >= currentPrec
          ) {
            output.push(opStack.pop());
          }
        }
        opStack.push(c);
      } else {
        // Literal or ε
        output.push(c);
      }
    }

    while (opStack.length > 0) {
      const op = opStack.pop();
      if (op === '(' || op === ')') {
        throw new Error('Mismatched parentheses in regular expression.');
      }
      output.push(op);
    }

    return output.join('');
  }

  /**
   * Thompson's Construction: Build ε-NFA from postfix regex
   */
  static postfixToNFA(postfix) {
    NFAState.idCounter = 0;
    const stack = [];

    if (!postfix) {
      // Empty regex matches empty string
      const start = new NFAState();
      const accept = new NFAState();
      start.addTransition(EPSILON, accept);
      return new NFAFragment(start, accept);
    }

    for (let i = 0; i < postfix.length; i++) {
      const c = postfix[i];

      if (c === '·') {
        // Concatenation
        if (stack.length < 2) throw new Error('Malformed regular expression (concat).');
        const frag2 = stack.pop();
        const frag1 = stack.pop();

        frag1.accept.addTransition(EPSILON, frag2.start);
        stack.push(new NFAFragment(frag1.start, frag2.accept));
      } else if (c === '|') {
        // Union
        if (stack.length < 2) throw new Error('Malformed regular expression (union).');
        const frag2 = stack.pop();
        const frag1 = stack.pop();

        const start = new NFAState();
        const accept = new NFAState();

        start.addTransition(EPSILON, frag1.start);
        start.addTransition(EPSILON, frag2.start);

        frag1.accept.addTransition(EPSILON, accept);
        frag2.accept.addTransition(EPSILON, accept);

        stack.push(new NFAFragment(start, accept));
      } else if (c === '*') {
        // Kleene star
        if (stack.length < 1) throw new Error('Malformed regular expression (*).');
        const frag = stack.pop();

        const start = new NFAState();
        const accept = new NFAState();

        start.addTransition(EPSILON, frag.start);
        start.addTransition(EPSILON, accept);

        frag.accept.addTransition(EPSILON, frag.start);
        frag.accept.addTransition(EPSILON, accept);

        stack.push(new NFAFragment(start, accept));
      } else if (c === '+') {
        // Kleene plus: R+ = R . R*
        if (stack.length < 1) throw new Error('Malformed regular expression (+).');
        const frag = stack.pop();

        const start = new NFAState();
        const accept = new NFAState();

        start.addTransition(EPSILON, frag.start);
        frag.accept.addTransition(EPSILON, frag.start);
        frag.accept.addTransition(EPSILON, accept);

        stack.push(new NFAFragment(start, accept));
      } else if (c === '?') {
        // Optional: R? = R | ε
        if (stack.length < 1) throw new Error('Malformed regular expression (?).');
        const frag = stack.pop();

        const start = new NFAState();
        const accept = new NFAState();

        start.addTransition(EPSILON, frag.start);
        start.addTransition(EPSILON, accept);
        frag.accept.addTransition(EPSILON, accept);

        stack.push(new NFAFragment(start, accept));
      } else {
        // Literal symbol or ε
        const symbol = (c === 'ε' || c === 'e' || c === 'E') ? EPSILON : c;
        const start = new NFAState();
        const accept = new NFAState();
        start.addTransition(symbol, accept);
        stack.push(new NFAFragment(start, accept));
      }
    }

    if (stack.length !== 1) {
      throw new Error('Malformed regular expression syntax.');
    }

    return stack[0];
  }

  /**
   * Compute ε-closure of a set of NFA states
   * @param {Set<NFAState>} states
   * @returns {Set<NFAState>}
   */
  static epsilonClosure(states) {
    const closure = new Set(states);
    const stack = Array.from(states);

    while (stack.length > 0) {
      const state = stack.pop();
      const epsTransitions = state.transitions.get(EPSILON);
      if (epsTransitions) {
        for (const next of epsTransitions) {
          if (!closure.has(next)) {
            closure.add(next);
            stack.push(next);
          }
        }
      }
    }

    return closure;
  }

  /**
   * Gather alphabet from NFA (excluding ε)
   */
  static getNFAAlphabet(startState) {
    const alphabet = new Set();
    const visited = new Set();
    const queue = [startState];

    while (queue.length > 0) {
      const state = queue.shift();
      if (visited.has(state)) continue;
      visited.add(state);

      for (const [sym, targets] of state.transitions) {
        if (sym !== EPSILON) {
          alphabet.add(sym);
        }
        for (const t of targets) {
          if (!visited.has(t)) {
            queue.push(t);
          }
        }
      }
    }

    return Array.from(alphabet).sort();
  }

  /**
   * Subset Construction (Powerset Construction): Convert ε-NFA to DFA
   * @param {NFAFragment} nfa
   * @returns {DFA}
   */
  static nfaToDFA(nfa) {
    const alphabet = RegexEngine.getNFAAlphabet(nfa.start);
    if (alphabet.length === 0) {
      // Empty language or language with only ε
      const dfa = new DFA();
      dfa.addState('q0', true);
      dfa.setStartState('q0');
      return dfa;
    }

    // Map a sorted state-id string to DFA state name 'q0', 'q1', ...
    const keyForSet = (stateSet) => {
      const ids = Array.from(stateSet).map(s => s.id).sort();
      return ids.join(',');
    };

    const dfaStateMap = new Map(); // key -> dfaStateName
    const dfaStateSets = new Map(); // dfaStateName -> Set<NFAState>
    let dfaCounter = 0;

    const initialClosure = RegexEngine.epsilonClosure(new Set([nfa.start]));
    const initialKey = keyForSet(initialClosure);
    const q0Name = `q${dfaCounter++}`;

    dfaStateMap.set(initialKey, q0Name);
    dfaStateSets.set(q0Name, initialClosure);

    const dfa = new DFA({ alphabet });
    dfa.addState(q0Name, false);
    dfa.setStartState(q0Name);

    const queue = [q0Name];

    while (queue.length > 0) {
      const currentDFAName = queue.shift();
      const currentNFASet = dfaStateSets.get(currentDFAName);

      // Check if current DFA state is an accept state
      let isAccept = false;
      for (const nfaState of currentNFASet) {
        if (nfaState === nfa.accept) {
          isAccept = true;
          break;
        }
      }
      if (isAccept) {
        dfa.acceptStates.add(currentDFAName);
      }

      // Compute transitions for each alphabet symbol
      for (const sym of alphabet) {
        const moveSet = new Set();
        for (const nState of currentNFASet) {
          const targets = nState.transitions.get(sym);
          if (targets) {
            for (const t of targets) {
              moveSet.add(t);
            }
          }
        }

        if (moveSet.size === 0) {
          // No transition for this symbol (will remain undefined or dead)
          continue;
        }

        const closure = RegexEngine.epsilonClosure(moveSet);
        if (closure.size === 0) continue;

        const closureKey = keyForSet(closure);
        let destDFAName;

        if (dfaStateMap.has(closureKey)) {
          destDFAName = dfaStateMap.get(closureKey);
        } else {
          destDFAName = `q${dfaCounter++}`;
          dfaStateMap.set(closureKey, destDFAName);
          dfaStateSets.set(destDFAName, closure);
          dfa.addState(destDFAName, false);
          queue.push(destDFAName);
        }

        dfa.setTransition(currentDFAName, sym, destDFAName);
      }
    }

    return dfa;
  }

  /**
   * Main API: Convert regular expression to DFA
   * @param {string} regex
   * @returns {DFA}
   */
  static regexToDFA(regex) {
    const postfix = RegexEngine.infixToPostfix(regex);
    const nfa = RegexEngine.postfixToNFA(postfix);
    const dfa = RegexEngine.nfaToDFA(nfa);
    return dfa;
  }
}

  /**
 * Regular Grammar (Right-Linear Grammar) to DFA Converter
 * Supports:
 *   S -> aA | bB | c | ε
 *   A -> 0A | 1B
 */




class GrammarEngine {
  /**
   * Parse grammar text into rules
   * @param {string} text
   * @returns {{
   *   nonTerminals: Set<string>,
   *   terminals: Set<string>,
   *   startSymbol: string,
   *   rules: Array<{lhs: string, rhs: string[]}>
   * }}
   */
  static parseGrammar(text) {
    const lines = text.split('\n');
    const nonTerminals = new Set();
    const terminals = new Set();
    const parsedRules = [];
    let startSymbol = null;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || line.startsWith('//')) continue;

      // Match A -> alpha or A := alpha or A ::= alpha
      const match = line.match(/^([A-Za-z0-9_<>]+)\s*(?:->|::=|:=)\s*(.+)$/);
      if (!match) continue;

      const lhs = match[1].trim();
      nonTerminals.add(lhs);
      if (!startSymbol) startSymbol = lhs;

      const rhsAlternatives = match[2].split('|').map(s => s.trim()).filter(Boolean);

      for (const alt of rhsAlternatives) {
        parsedRules.push({ lhs, rhs: alt });
      }
    }

    if (!startSymbol) {
      throw new Error('No valid grammar production rules found.');
    }

    return {
      nonTerminals,
      terminals,
      startSymbol,
      rules: parsedRules
    };
  }

  /**
   * Converts a Right-Linear Grammar to a DFA
   * Right-linear grammar productions:
   *   A -> a B  (terminal followed by non-terminal)
   *   A -> a    (single terminal leading to accept state)
   *   A -> ε    (A is accept state)
   */
  static grammarToDFA(text) {
    const { nonTerminals, startSymbol, rules } = GrammarEngine.parseGrammar(text);

    // We build an intermediate NFA representation
    const states = new Set(nonTerminals);
    const finalTrap = 'q_accept';
    let needsFinalTrap = false;
    const acceptStates = new Set();
    const alphabet = new Set();

    // Map: fromState -> Map(symbol -> Set(toState))
    const nfaTransitions = new Map();
    const getMap = (s) => {
      if (!nfaTransitions.has(s)) nfaTransitions.set(s, new Map());
      return nfaTransitions.get(s);
    };

    for (const rule of rules) {
      const { lhs, rhs } = rule;

      // Check epsilon production
      if (rhs === 'ε' || rhs === 'e' || rhs === 'E' || rhs === "''" || rhs === '""') {
        acceptStates.add(lhs);
        continue;
      }

      // Check if RHS ends with a known non-terminal
      let matchedNT = null;
      let terminalPart = '';

      // Try to find if RHS ends with one of the non-terminals
      for (const nt of nonTerminals) {
        if (rhs.endsWith(nt) && rhs.length > nt.length) {
          // ensure longest match
          if (!matchedNT || nt.length > matchedNT.length) {
            matchedNT = nt;
            terminalPart = rhs.slice(0, rhs.length - nt.length).trim();
          }
        }
      }

      if (matchedNT) {
        // A -> w B
        // For simplicity in standard right-linear grammars, w is a sequence of terminals
        // If w has length 1: direct transition
        // If w has length > 1: intermediate chain of states
        let currentFrom = lhs;
        for (let i = 0; i < terminalPart.length; i++) {
          const sym = terminalPart[i];
          alphabet.add(sym);
          const nextTarget = (i === terminalPart.length - 1) ? matchedNT : `${lhs}_sub_${Math.random().toString(36).substring(2, 6)}`;
          states.add(nextTarget);

          const symMap = getMap(currentFrom);
          if (!symMap.has(sym)) symMap.set(sym, new Set());
          symMap.get(sym).add(nextTarget);

          currentFrom = nextTarget;
        }
      } else {
        // A -> w (leads to an accept state)
        needsFinalTrap = true;
        states.add(finalTrap);
        acceptStates.add(finalTrap);

        let currentFrom = lhs;
        for (let i = 0; i < rhs.length; i++) {
          const sym = rhs[i];
          alphabet.add(sym);
          const nextTarget = (i === rhs.length - 1) ? finalTrap : `${lhs}_sub_${Math.random().toString(36).substring(2, 6)}`;
          states.add(nextTarget);

          const symMap = getMap(currentFrom);
          if (!symMap.has(sym)) symMap.set(sym, new Set());
          symMap.get(sym).add(nextTarget);

          currentFrom = nextTarget;
        }
      }
    }

    // Now perform Subset Construction on this NFA to get a clean DFA
    const alphaArr = Array.from(alphabet).sort();

    const keyForSet = (sSet) => Array.from(sSet).sort().join(',');
    const dfaStateMap = new Map();
    const dfaSets = new Map();
    let counter = 0;

    const initialSet = new Set([startSymbol]);
    const initialKey = keyForSet(initialSet);
    const q0 = `q${counter++}`;
    dfaStateMap.set(initialKey, q0);
    dfaSets.set(q0, initialSet);

    const dfa = new DFA({ alphabet: alphaArr });
    dfa.addState(q0, false);
    dfa.setStartState(q0);

    const queue = [q0];

    while (queue.length > 0) {
      const curDfa = queue.shift();
      const nfaSet = dfaSets.get(curDfa);

      // Check accept
      for (const s of nfaSet) {
        if (acceptStates.has(s)) {
          dfa.acceptStates.add(curDfa);
          break;
        }
      }

      for (const sym of alphaArr) {
        const nextSet = new Set();
        for (const s of nfaSet) {
          const symMap = nfaTransitions.get(s);
          if (symMap && symMap.has(sym)) {
            for (const target of symMap.get(sym)) {
              nextSet.add(target);
            }
          }
        }

        if (nextSet.size === 0) continue;

        const k = keyForSet(nextSet);
        let destName;
        if (dfaStateMap.has(k)) {
          destName = dfaStateMap.get(k);
        } else {
          destName = `q${counter++}`;
          dfaStateMap.set(k, destName);
          dfaSets.set(destName, nextSet);
          dfa.addState(destName, false);
          queue.push(destName);
        }

        dfa.setTransition(curDfa, sym, destName);
      }
    }

    return dfa;
  }
}

  /**
 * DFA Minimizer using Hopcroft's / Moore's Partition Refinement Algorithm
 * Computes minimal DFA and records step-by-step partition history.
 */



class DFAMinimizer {
  /**
   * Minimize a given DFA
   * @param {DFA} originalDFA
   * @returns {{
   *   minimizedDFA: DFA,
   *   steps: Array<{iteration: number, partitions: string[][]}>,
   *   stateMapping: Object.<string, string>
   * }}
   */
  static minimize(originalDFA) {
    // 1. Remove unreachable states
    const reachable = originalDFA.getReachableStates();
    const cleanDFA = new DFA({
      alphabet: Array.from(originalDFA.alphabet),
      startState: originalDFA.startState
    });

    for (const s of reachable) {
      cleanDFA.addState(s, originalDFA.acceptStates.has(s));
    }

    for (const s of reachable) {
      const symMap = originalDFA.transitions.get(s);
      if (symMap) {
        for (const [sym, dest] of symMap) {
          if (reachable.has(dest)) {
            cleanDFA.setTransition(s, sym, dest);
          }
        }
      }
    }

    // Complete missing transitions with an explicit trap state so partition refinement works uniformly
    const hadIncomplete = cleanDFA.completeWithTrapState('q_dead');

    const states = Array.from(cleanDFA.states).sort();
    const alphabet = Array.from(cleanDFA.alphabet).sort();
    const accept = Array.from(cleanDFA.acceptStates).sort();
    const nonAccept = states.filter(s => !cleanDFA.acceptStates.has(s));

    // 2. Initial partition P0 = { F, Q \ F }
    let partitions = [];
    if (accept.length > 0) partitions.push(accept);
    if (nonAccept.length > 0) partitions.push(nonAccept);

    const steps = [
      {
        iteration: 0,
        partitions: partitions.map(p => [...p])
      }
    ];

    // Helper: which group index does state 's' belong to?
    const getGroupIndex = (state, parts) => {
      if (!state) return -1;
      return parts.findIndex(group => group.includes(state));
    };

    // 3. Partition refinement loop
    let iteration = 1;
    let changed = true;

    while (changed) {
      changed = false;
      const newPartitions = [];

      for (const group of partitions) {
        if (group.length <= 1) {
          newPartitions.push(group);
          continue;
        }

        // Subdivide group based on signature: [destGroup(sym_0), destGroup(sym_1), ...]
        const signatureMap = new Map(); // signatureStr -> string[]

        for (const state of group) {
          const sig = alphabet.map(sym => {
            const dest = cleanDFA.getTransition(state, sym);
            return getGroupIndex(dest, partitions);
          }).join('|');

          if (!signatureMap.has(sig)) {
            signatureMap.set(sig, []);
          }
          signatureMap.get(sig).push(state);
        }

        if (signatureMap.size > 1) {
          changed = true;
        }

        for (const subGroup of signatureMap.values()) {
          newPartitions.push(subGroup);
        }
      }

      partitions = newPartitions;
      steps.push({
        iteration: iteration++,
        partitions: partitions.map(p => [...p])
      });

      if (iteration > 50) break; // safeguard
    }

    // 4. Construct Minimized DFA from groups
    // If a group consists purely of the trap state and is not start/accept, we can keep or prune it
    const groupNameMap = new Map(); // groupIndex -> new state name
    const stateMapping = {}; // oldState -> new state name

    // Identify which group contains start state
    const startGroupIdx = getGroupIndex(cleanDFA.startState, partitions);

    // Assign names: Start group gets q0 (or canonical state name)
    let stateIdx = 0;
    // Name start state group first
    groupNameMap.set(startGroupIdx, `p${stateIdx++}`);

    for (let i = 0; i < partitions.length; i++) {
      if (i !== startGroupIdx) {
        groupNameMap.set(i, `p${stateIdx++}`);
      }
    }

    for (let i = 0; i < partitions.length; i++) {
      const gName = groupNameMap.get(i);
      for (const s of partitions[i]) {
        stateMapping[s] = gName;
      }
    }

    const minDFA = new DFA({ alphabet });
    minDFA.setStartState(groupNameMap.get(startGroupIdx));

    for (let i = 0; i < partitions.length; i++) {
      const gName = groupNameMap.get(i);
      const rep = partitions[i][0];
      const isAcc = partitions[i].some(s => cleanDFA.acceptStates.has(s));
      minDFA.addState(gName, isAcc);

      for (const sym of alphabet) {
        const dest = cleanDFA.getTransition(rep, sym);
        if (dest) {
          const destGroupIdx = getGroupIndex(dest, partitions);
          const destName = groupNameMap.get(destGroupIdx);
          minDFA.setTransition(gName, sym, destName);
        }
      }
    }

    return {
      minimizedDFA: minDFA,
      steps,
      stateMapping
    };
  }
}

  /**
 * Interactive SVG Graph Visualizer for DFA States & Transitions
 * Supports draggable nodes, bezier curves, self-loops, zoom/pan,
 * particle traversal animations, and active state highlights.
 */

class GraphVisualizer {
  constructor(svgElement, options = {}) {
    this.svg = svgElement;
    this.options = {
      nodeRadius: 28,
      ...options
    };

    this.dfa = null;
    this.nodePositions = new Map(); // state -> {x, y}
    this.activeState = null;
    this.lastTransition = null; // {from, to, symbol}
    this.finalStatus = null; // 'ACCEPTED' | 'REJECTED' | null

    // Zoom & pan state
    this.viewBox = { x: 0, y: 0, width: 800, height: 500 };
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };
    this.draggedNode = null;
    this.dragOffset = { x: 0, y: 0 };

    this.initSVG();
    this.setupInteractions();
  }

  initSVG() {
    this.svg.setAttribute('viewBox', `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.width} ${this.viewBox.height}`);
    this.svg.innerHTML = `
      <defs>
        <!-- Arrowhead Marker for Normal Edges -->
        <marker id="arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#64748b" />
        </marker>
        <!-- Arrowhead Marker for Highlighted Edges -->
        <marker id="arrow-active" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#38bdf8" />
        </marker>
        <!-- Arrowhead Marker for Start Arrow -->
        <marker id="arrow-start" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#22c55e" />
        </marker>
        <!-- Glow filters -->
        <filter id="glow-cyan" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="glow-green" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="glow-red" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <!-- Layers -->
      <g id="grid-layer"></g>
      <g id="edges-layer"></g>
      <g id="particles-layer"></g>
      <g id="nodes-layer"></g>
      <g id="labels-layer"></g>
    `;

    this.gridLayer = this.svg.querySelector('#grid-layer');
    this.edgesLayer = this.svg.querySelector('#edges-layer');
    this.particlesLayer = this.svg.querySelector('#particles-layer');
    this.nodesLayer = this.svg.querySelector('#nodes-layer');
    this.labelsLayer = this.svg.querySelector('#labels-layer');
  }

  setDFA(dfa, autoLayout = true) {
    this.dfa = dfa;
    this.activeState = dfa.startState;
    this.lastTransition = null;
    this.finalStatus = null;

    if (autoLayout || Object.keys(dfa.positions || {}).length === 0) {
      this.computeLayout();
    } else {
      this.nodePositions.clear();
      for (const [s, pos] of Object.entries(dfa.positions)) {
        this.nodePositions.set(s, { ...pos });
      }
      // Ensure all states have a position
      for (const s of dfa.states) {
        if (!this.nodePositions.has(s)) {
          this.nodePositions.set(s, { x: 400, y: 250 });
        }
      }
    }

    this.render();
  }

  /**
   * Layout states:
   * Circular or stratified layout based on state count
   */
  computeLayout() {
    this.nodePositions.clear();
    const states = Array.from(this.dfa.states);
    const n = states.length;
    if (n === 0) return;

    const cx = this.viewBox.width / 2;
    const cy = this.viewBox.height / 2;

    if (n === 1) {
      this.nodePositions.set(states[0], { x: cx, y: cy });
    } else if (n === 2) {
      this.nodePositions.set(states[0], { x: cx - 140, y: cy });
      this.nodePositions.set(states[1], { x: cx + 140, y: cy });
    } else if (n <= 8) {
      // Circle layout with start state at left-center
      const radius = Math.min(this.viewBox.width, this.viewBox.height) * 0.35;
      const startIdx = states.indexOf(this.dfa.startState);
      const ordered = startIdx >= 0
        ? [states[startIdx], ...states.filter((_, i) => i !== startIdx)]
        : states;

      ordered.forEach((state, i) => {
        // Place start state at angle PI (left side)
        const angle = Math.PI + (i * 2 * Math.PI) / n;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        this.nodePositions.set(state, { x, y });
      });
    } else {
      // Stratified / two-tier layout
      const radiusX = this.viewBox.width * 0.38;
      const radiusY = this.viewBox.height * 0.34;
      states.forEach((state, i) => {
        const angle = Math.PI + (i * 2 * Math.PI) / n;
        const x = cx + radiusX * Math.cos(angle);
        const y = cy + radiusY * Math.sin(angle);
        this.nodePositions.set(state, { x, y });
      });
    }

    // Save positions back into dfa object
    for (const [s, pos] of this.nodePositions) {
      this.dfa.positions[s] = { ...pos };
    }
  }

  /**
   * Render nodes, edges, labels, and status highlights
   */
  render() {
    if (!this.dfa) return;

    this.edgesLayer.innerHTML = '';
    this.nodesLayer.innerHTML = '';
    this.labelsLayer.innerHTML = '';

    // Render transitions
    this.renderEdges();

    // Render state nodes
    this.renderNodes();
  }

  /**
   * Aggregate transitions between pairs of states to display merged symbol labels (e.g., "0, 1")
   */
  getEdgeGroups() {
    const groups = new Map(); // "from->to" => symbols[]

    for (const [fromState, symMap] of this.dfa.transitions) {
      for (const [symbol, toState] of symMap) {
        if (!toState || !this.nodePositions.has(toState)) continue;
        const key = `${fromState}==>${toState}`;
        if (!groups.has(key)) {
          groups.set(key, { from: fromState, to: toState, symbols: [] });
        }
        groups.get(key).symbols.push(symbol);
      }
    }

    return Array.from(groups.values());
  }

  renderEdges() {
    const edgeGroups = this.getEdgeGroups();
    const r = this.options.nodeRadius;

    for (const edge of edgeGroups) {
      const { from, to, symbols } = edge;
      const p1 = this.nodePositions.get(from);
      const p2 = this.nodePositions.get(to);
      if (!p1 || !p2) continue;

      const labelText = symbols.sort().join(', ');
      const isHighlighted =
        this.lastTransition &&
        this.lastTransition.from === from &&
        this.lastTransition.to === to &&
        symbols.includes(this.lastTransition.symbol);

      if (from === to) {
        // Self-loop
        this.renderSelfLoop(from, p1, labelText, isHighlighted);
      } else {
        // Between two distinct states
        // Check if reciprocal edge exists (to -> from)
        const reciprocalKey = `${to}==>${from}`;
        const hasReciprocal = edgeGroups.some(e => e.from === to && e.to === from);

        this.renderCurvedEdge(p1, p2, from, to, labelText, hasReciprocal, isHighlighted);
      }
    }
  }

  renderSelfLoop(state, p, labelText, isHighlighted) {
    const r = this.options.nodeRadius;
    const loopHeight = 48;
    const loopWidth = 36;

    // Cubic bezier loop at the top of the node
    const x0 = p.x - r * 0.5;
    const y0 = p.y - r * 0.85;

    const x1 = p.x - loopWidth;
    const y1 = p.y - r - loopHeight;

    const x2 = p.x + loopWidth;
    const y2 = p.y - r - loopHeight;

    const x3 = p.x + r * 0.5;
    const y3 = p.y - r * 0.85;

    const pathData = `M ${x0} ${y0} C ${x1} ${y1}, ${x2} ${y2}, ${x3} ${y3}`;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('class', `dfa-edge ${isHighlighted ? 'dfa-edge-active' : ''}`);
    path.setAttribute('marker-end', isHighlighted ? 'url(#arrow-active)' : 'url(#arrow)');
    path.dataset.edge = `${state}->${state}`;
    this.edgesLayer.appendChild(path);

    // Label position at top peak of loop
    const labelX = p.x;
    const labelY = p.y - r - loopHeight - 6;

    this.renderEdgeLabel(labelX, labelY, labelText, isHighlighted);
  }

  renderCurvedEdge(p1, p2, from, to, labelText, hasReciprocal, isHighlighted) {
    const r = this.options.nodeRadius;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return;

    const ux = dx / dist;
    const uy = dy / dist;

    // Normal vector perpendicular to edge
    const nx = -uy;
    const ny = ux;

    // Determine curvature offset: if reciprocal exists or default slight curve
    const curvature = hasReciprocal ? 32 : 12;

    // Control point for quadratic bezier
    const midX = (p1.x + p2.x) / 2 + nx * curvature;
    const midY = (p1.y + p2.y) / 2 + ny * curvature;

    // Truncate start and end at node boundaries
    const startX = p1.x + ux * (r * 0.9);
    const startY = p1.y + uy * (r * 0.9);

    const endX = p2.x - ux * (r * 0.9);
    const endY = p2.y - uy * (r * 0.9);

    const pathData = `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('class', `dfa-edge ${isHighlighted ? 'dfa-edge-active' : ''}`);
    path.setAttribute('marker-end', isHighlighted ? 'url(#arrow-active)' : 'url(#arrow)');
    path.dataset.edge = `${from}->${to}`;
    this.edgesLayer.appendChild(path);

    // Label position roughly at midpoint of curve
    // Quadratic bezier point at t = 0.5: B(0.5) = 0.25*P0 + 0.5*P1 + 0.25*P2
    const labelX = 0.25 * startX + 0.5 * midX + 0.25 * endX + nx * 10;
    const labelY = 0.25 * startY + 0.5 * midY + 0.25 * endY + ny * 10;

    this.renderEdgeLabel(labelX, labelY, labelText, isHighlighted);
  }

  renderEdgeLabel(x, y, text, isHighlighted) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', `dfa-edge-label-group ${isHighlighted ? 'active' : ''}`);

    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txt.setAttribute('x', x);
    txt.setAttribute('y', y);
    txt.setAttribute('text-anchor', 'middle');
    txt.setAttribute('dominant-baseline', 'central');
    txt.setAttribute('class', 'dfa-edge-label-text');
    txt.textContent = text;

    // Approximate background pill width
    const padX = 7;
    const padY = 3;
    const estWidth = Math.max(18, text.length * 8.5 + padX * 2);
    const estHeight = 18;

    bg.setAttribute('x', x - estWidth / 2);
    bg.setAttribute('y', y - estHeight / 2);
    bg.setAttribute('width', estWidth);
    bg.setAttribute('height', estHeight);
    bg.setAttribute('rx', 4);
    bg.setAttribute('class', 'dfa-edge-label-bg');

    g.appendChild(bg);
    g.appendChild(txt);
    this.labelsLayer.appendChild(g);
  }

  renderNodes() {
    const r = this.options.nodeRadius;

    for (const [state, pos] of this.nodePositions) {
      const isAccept = this.dfa.acceptStates.has(state);
      const isStart = this.dfa.startState === state;
      const isActive = this.activeState === state;

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', `dfa-node ${isActive ? 'dfa-node-active' : ''} ${isAccept ? 'dfa-node-accept' : ''}`);
      g.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
      g.dataset.state = state;

      // Status aura if final accepted / rejected
      if (isActive && this.finalStatus) {
        const aura = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        aura.setAttribute('r', r + 12);
        aura.setAttribute('class', this.finalStatus === 'ACCEPTED' ? 'dfa-aura-accept' : 'dfa-aura-reject');
        g.appendChild(aura);
      }

      // Start indicator arrow
      if (isStart) {
        const startG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        startG.setAttribute('class', 'dfa-start-arrow-group');

        const arrowLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        arrowLine.setAttribute('x1', -r - 35);
        arrowLine.setAttribute('y1', 0);
        arrowLine.setAttribute('x2', -r - 2);
        arrowLine.setAttribute('y2', 0);
        arrowLine.setAttribute('class', 'dfa-start-arrow');
        arrowLine.setAttribute('marker-end', 'url(#arrow-start)');

        const startText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        startText.setAttribute('x', -r - 42);
        startText.setAttribute('y', 0);
        startText.setAttribute('text-anchor', 'end');
        startText.setAttribute('dominant-baseline', 'central');
        startText.setAttribute('class', 'dfa-start-text');
        startText.textContent = 'Start';

        startG.appendChild(arrowLine);
        startG.appendChild(startText);
        g.appendChild(startG);
      }

      // Outer circle (Base)
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', r);
      circle.setAttribute('class', 'dfa-node-circle');
      g.appendChild(circle);

      // Inner circle for Accept State (concentric double circle)
      if (isAccept) {
        const innerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        innerCircle.setAttribute('r', r - 5.5);
        innerCircle.setAttribute('class', 'dfa-node-inner-circle');
        g.appendChild(innerCircle);
      }

      // Active state glowing pulse ring
      if (isActive) {
        const activeRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        activeRing.setAttribute('r', r + 4);
        activeRing.setAttribute('class', 'dfa-node-active-ring');
        g.appendChild(activeRing);
      }

      // State text label
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.setAttribute('class', 'dfa-node-text');
      text.textContent = state;
      g.appendChild(text);

      this.nodesLayer.appendChild(g);
    }
  }

  /**
   * Animates a travelling packet/particle along the transition edge
   */
  animateTransitionParticle(fromState, toState, symbol, onComplete) {
    const p1 = this.nodePositions.get(fromState);
    const p2 = this.nodePositions.get(toState);
    if (!p1 || !p2) {
      if (onComplete) onComplete();
      return;
    }

    const particle = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    particle.setAttribute('class', 'dfa-transition-particle');

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', 9);
    circle.setAttribute('fill', '#38bdf8');
    circle.setAttribute('filter', 'url(#glow-cyan)');

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'central');
    text.setAttribute('fill', '#0f172a');
    text.setAttribute('font-size', '10px');
    text.setAttribute('font-weight', 'bold');
    text.textContent = symbol || '';

    particle.appendChild(circle);
    particle.appendChild(text);
    this.particlesLayer.appendChild(particle);

    const startTime = performance.now();
    const duration = 380; // ms

    const isSelfLoop = fromState === toState;
    const r = this.options.nodeRadius;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const t = Math.min(1, elapsed / duration);
      // easeInOutCubic
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      let currentX, currentY;

      if (isSelfLoop) {
        const loopHeight = 48;
        const loopWidth = 36;
        const x0 = p1.x - r * 0.5;
        const y0 = p1.y - r * 0.85;
        const x1 = p1.x - loopWidth;
        const y1 = p1.y - r - loopHeight;
        const x2 = p1.x + loopWidth;
        const y2 = p1.y - r - loopHeight;
        const x3 = p1.x + r * 0.5;
        const y3 = p1.y - r * 0.85;

        // Cubic bezier formula
        const u = 1 - ease;
        currentX = u * u * u * x0 + 3 * u * u * ease * x1 + 3 * u * ease * ease * x2 + ease * ease * ease * x3;
        currentY = u * u * u * y0 + 3 * u * u * ease * y1 + 3 * u * ease * ease * y2 + ease * ease * ease * y3;
      } else {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.hypot(dx, dy);
        const ux = dx / dist;
        const uy = dy / dist;
        const nx = -uy;
        const ny = ux;

        const hasReciprocal = this.dfa.getTransition(toState, symbol) !== null;
        const curvature = hasReciprocal ? 32 : 12;

        const midX = (p1.x + p2.x) / 2 + nx * curvature;
        const midY = (p1.y + p2.y) / 2 + ny * curvature;

        const u = 1 - ease;
        currentX = u * u * p1.x + 2 * u * ease * midX + ease * ease * p2.x;
        currentY = u * u * p1.y + 2 * u * ease * midY + ease * ease * p2.y;
      }

      particle.setAttribute('transform', `translate(${currentX}, ${currentY})`);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        particle.remove();
        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Update active state and transition highlights
   */
  setActiveState(state, transition = null, finalStatus = null) {
    this.activeState = state;
    this.lastTransition = transition;
    this.finalStatus = finalStatus;
    this.render();
  }

  /**
   * Mouse and Touch dragging, Zoom, and Pan handlers
   */
  setupInteractions() {
    const getSVGPoint = (evt) => {
      const clientX = evt.clientX ?? (evt.touches && evt.touches[0] ? evt.touches[0].clientX : 0);
      const clientY = evt.clientY ?? (evt.touches && evt.touches[0] ? evt.touches[0].clientY : 0);

      const ctm = this.svg.getScreenCTM();
      if (ctm) {
        const pt = this.svg.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        return pt.matrixTransform(ctm.inverse());
      }
      const rect = this.svg.getBoundingClientRect();
      return {
        x: this.viewBox.x + ((clientX - rect.left) / rect.width) * this.viewBox.width,
        y: this.viewBox.y + ((clientY - rect.top) / rect.height) * this.viewBox.height
      };
    };

    const handlePointerDown = (e) => {
      const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
      const target = e.target;
      const nodeEl = target.closest ? target.closest('.dfa-node') : null;

      if (nodeEl) {
        const state = nodeEl.dataset.state;
        const pos = this.nodePositions.get(state);
        const pt = getSVGPoint(e);
        this.draggedNode = state;
        this.dragOffset = { x: pt.x - pos.x, y: pt.y - pos.y };
        e.stopPropagation();
      } else {
        this.isPanning = true;
        this.panStart = { x: clientX, y: clientY };
      }
    };

    const handlePointerMove = (e) => {
      const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

      if (this.draggedNode) {
        const pt = getSVGPoint(e);
        const newX = pt.x - this.dragOffset.x;
        const newY = pt.y - this.dragOffset.y;
        this.nodePositions.set(this.draggedNode, { x: newX, y: newY });
        if (this.dfa) {
          this.dfa.positions[this.draggedNode] = { x: newX, y: newY };
        }
        this.render();
      } else if (this.isPanning) {
        const rect = this.svg.getBoundingClientRect();
        const dx = (clientX - this.panStart.x) * (this.viewBox.width / (rect.width || 800));
        const dy = (clientY - this.panStart.y) * (this.viewBox.height / (rect.height || 500));

        this.viewBox.x -= dx;
        this.viewBox.y -= dy;
        this.updateViewBox();

        this.panStart = { x: clientX, y: clientY };
      }
    };

    const handlePointerUp = () => {
      this.draggedNode = null;
      this.isPanning = false;
    };

    this.svg.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    this.svg.addEventListener('touchstart', handlePointerDown, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);

    // Zoom on wheel
    this.svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.12 : 0.89;
      this.zoom(zoomFactor, e);
    }, { passive: false });
  }

  zoom(factor, evt = null) {
    let focusX = this.viewBox.x + this.viewBox.width / 2;
    let focusY = this.viewBox.y + this.viewBox.height / 2;

    if (evt) {
      const rect = this.svg.getBoundingClientRect();
      const clientX = evt.clientX - rect.left;
      const clientY = evt.clientY - rect.top;
      focusX = this.viewBox.x + (clientX / rect.width) * this.viewBox.width;
      focusY = this.viewBox.y + (clientY / rect.height) * this.viewBox.height;
    }

    const newWidth = this.viewBox.width * factor;
    const newHeight = this.viewBox.height * factor;

    // Bounds limit
    if (newWidth < 200 || newWidth > 3500) return;

    this.viewBox.x = focusX - (focusX - this.viewBox.x) * factor;
    this.viewBox.y = focusY - (focusY - this.viewBox.y) * factor;
    this.viewBox.width = newWidth;
    this.viewBox.height = newHeight;

    this.updateViewBox();
  }

  resetZoom() {
    this.viewBox = { x: 0, y: 0, width: 800, height: 500 };
    this.updateViewBox();
  }

  updateViewBox() {
    this.svg.setAttribute('viewBox', `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.width} ${this.viewBox.height}`);
  }
}

  /**
 * Input String Ribbon / Tape Visualizer
 * Shows string cells, active reading head cursor, consumed symbols,
 * and current computation state.
 */

class TapeVisualizer {
  constructor(containerElement, onCellClick = null) {
    this.container = containerElement;
    this.onCellClick = onCellClick;
    this.inputString = '';
    this.currentIndex = -1; // -1 = start state before consuming any symbol
    this.status = 'READY'; // READY, STEPPING, ACCEPTED, REJECTED
  }

  setString(str) {
    this.inputString = str;
    this.currentIndex = -1;
    this.status = 'READY';
    this.render();
  }

  setCursor(index, status = 'STEPPING') {
    this.currentIndex = index;
    this.status = status;
    this.render();
  }

  render() {
    this.container.innerHTML = '';

    const tapeWrapper = document.createElement('div');
    tapeWrapper.className = 'tape-cells-wrapper';

    // If string is empty (ε)
    if (this.inputString.length === 0) {
      const cell = document.createElement('div');
      cell.className = `tape-cell epsilon-cell ${this.currentIndex >= 0 ? 'active' : ''} ${this.status.toLowerCase()}`;
      cell.innerHTML = `
        <div class="tape-head-marker ${this.currentIndex >= 0 ? 'visible' : ''}">▼</div>
        <div class="tape-char">ε</div>
        <div class="tape-idx">empty</div>
      `;
      tapeWrapper.appendChild(cell);
      this.container.appendChild(tapeWrapper);
      return;
    }

    const chars = Array.from(this.inputString);

    chars.forEach((char, idx) => {
      const cell = document.createElement('div');
      let stateClass = 'pending';

      if (idx < this.currentIndex) {
        stateClass = 'consumed';
      } else if (idx === this.currentIndex) {
        stateClass = `active ${this.status.toLowerCase()}`;
      }

      cell.className = `tape-cell ${stateClass}`;
      cell.innerHTML = `
        <div class="tape-head-marker ${idx === this.currentIndex ? 'visible' : ''}">▼</div>
        <div class="tape-char">${char === ' ' ? '␣' : char}</div>
        <div class="tape-idx">${idx}</div>
      `;

      if (this.onCellClick) {
        cell.addEventListener('click', () => this.onCellClick(idx));
      }

      tapeWrapper.appendChild(cell);
    });

    // End-of-string sentinel cell ⊣
    const eofCell = document.createElement('div');
    const isEOF = this.currentIndex >= chars.length;
    eofCell.className = `tape-cell eof-cell ${isEOF ? 'active ' + this.status.toLowerCase() : 'pending'}`;
    eofCell.innerHTML = `
      <div class="tape-head-marker ${isEOF ? 'visible' : ''}">▼</div>
      <div class="tape-char">⊣</div>
      <div class="tape-idx">end</div>
    `;
    tapeWrapper.appendChild(eofCell);

    this.container.appendChild(tapeWrapper);

    // Auto-scroll tape to keep active head in view
    const activeCell = tapeWrapper.querySelector('.tape-cell.active');
    if (activeCell) {
      activeCell.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }
}

  /**
 * Simulation Controller for DFA String Execution
 * Manages step-by-step playback, backwards rewind, speed, and status events.
 */

class Simulator {
  constructor(dfa, graphVisualizer, tapeVisualizer, options = {}) {
    this.dfa = dfa;
    this.graph = graphVisualizer;
    this.tape = tapeVisualizer;
    this.options = {
      speed: 800, // ms per step
      animateParticles: true,
      ...options
    };

    this.inputString = '';
    this.result = null; // output from dfa.processString
    this.currentStep = 0;
    this.isPlaying = false;
    this.timer = null;

    this.onStepChange = null; // callback(stepData, isFirst, isLast, result)
    this.onPlayStateChange = null; // callback(isPlaying)
  }

  setDFA(dfa) {
    this.pause();
    this.dfa = dfa;
    this.reset();
  }

  loadString(str) {
    this.pause();
    this.inputString = String(str);
    this.result = this.dfa.processString(this.inputString);
    this.currentStep = 0;
    this.tape.setString(this.inputString);
    this.applyCurrentStep(false);
  }

  setSpeed(ms) {
    this.options.speed = Math.max(100, Math.min(3000, ms));
  }

  setAnimateParticles(enabled) {
    this.options.animateParticles = !!enabled;
  }

  play() {
    if (this.isPlaying) return;
    if (!this.result || this.result.trace.length <= 1) return;

    if (this.currentStep >= this.result.trace.length - 1) {
      this.currentStep = 0;
      this.applyCurrentStep(false);
    }

    this.isPlaying = true;
    if (this.onPlayStateChange) this.onPlayStateChange(true);

    const stepLoop = () => {
      if (!this.isPlaying) return;
      if (this.currentStep < this.result.trace.length - 1) {
        this.stepForward(true, () => {
          if (this.isPlaying) {
            this.timer = setTimeout(stepLoop, this.options.speed);
          }
        });
      } else {
        this.pause();
      }
    };

    this.timer = setTimeout(stepLoop, this.options.speed);
  }

  pause() {
    this.isPlaying = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.onPlayStateChange) this.onPlayStateChange(false);
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  reset() {
    this.pause();
    this.currentStep = 0;
    if (this.result) {
      this.applyCurrentStep(false);
    }
  }

  stepForward(animate = true, onComplete = null) {
    if (!this.result) return;
    if (this.currentStep < this.result.trace.length - 1) {
      const nextStepIndex = this.currentStep + 1;
      const stepData = this.result.trace[nextStepIndex];

      if (animate && this.options.animateParticles && stepData.symbol !== null && stepData.nextState) {
        // Run particle animation along edge, then update state
        this.graph.animateTransitionParticle(
          stepData.state,
          stepData.nextState,
          stepData.symbol,
          () => {
            this.currentStep = nextStepIndex;
            this.applyCurrentStep(false);
            if (onComplete) onComplete();
          }
        );
      } else {
        this.currentStep = nextStepIndex;
        this.applyCurrentStep(false);
        if (onComplete) onComplete();
      }
    } else {
      if (onComplete) onComplete();
    }
  }

  stepBackward() {
    this.pause();
    if (this.currentStep > 0) {
      this.currentStep--;
      this.applyCurrentStep(false);
    }
  }

  jumpToStep(stepIndex) {
    this.pause();
    if (!this.result) return;
    this.currentStep = Math.max(0, Math.min(this.result.trace.length - 1, stepIndex));
    this.applyCurrentStep(false);
  }

  fastForward() {
    this.pause();
    if (!this.result) return;
    this.currentStep = this.result.trace.length - 1;
    this.applyCurrentStep(false);
  }

  applyCurrentStep(animateParticle = false) {
    if (!this.result || this.result.trace.length === 0) return;

    const stepData = this.result.trace[this.currentStep];
    const isFirst = this.currentStep === 0;
    const isLast = this.currentStep === this.result.trace.length - 1;

    let finalStatus = null;
    if (isLast) {
      finalStatus = this.result.accepted ? 'ACCEPTED' : 'REJECTED';
    }

    // Determine current state to highlight
    const currentState = stepData.nextState || stepData.state;

    // Transition info
    const lastTransition = stepData.symbol !== null && stepData.nextState ? {
      from: stepData.state,
      to: stepData.nextState,
      symbol: stepData.symbol
    } : null;

    this.graph.setActiveState(currentState, lastTransition, finalStatus);

    // Update tape cursor
    // If at start (step 0), tape cursor is at -1 or 0
    const charIndex = this.currentStep === 0 ? 0 : this.currentStep - 1;
    const tapeStatus = isLast
      ? (this.result.accepted ? 'ACCEPTED' : 'REJECTED')
      : (isFirst ? 'READY' : 'STEPPING');

    this.tape.setCursor(this.currentStep === 0 ? 0 : this.currentStep, tapeStatus);

    if (this.onStepChange) {
      this.onStepChange({
        stepIndex: this.currentStep,
        totalSteps: this.result.trace.length,
        stepData,
        isFirst,
        isLast,
        result: this.result
      });
    }
  }
}

  /**
 * Automata Theory Presets Catalog
 * Contains classic and pedagogical DFAs, Regexes, and Grammars.
 */

const PRESETS = [
  {
    id: 'div3',
    name: 'Binary Divisible by 3',
    category: 'Arithmetic / Modulo',
    type: 'dfa',
    description: 'Accepts binary representations of integers divisible by 3 (most significant bit first). $L = \\{ w \\in \\{0, 1\\}^* \\mid \\text{val}(w) \\equiv 0 \\pmod 3 \\}$.',
    sampleInput: '110', // 6 in decimal -> accepts
    testCases: ['0', '11', '110', '1001', '1100', '1', '10', '100', '101', '111'],
    data: {
      states: ['q0', 'q1', 'q2'],
      alphabet: ['0', '1'],
      startState: 'q0',
      acceptStates: ['q0'],
      transitions: {
        q0: { '0': 'q0', '1': 'q1' },
        q1: { '0': 'q2', '1': 'q0' },
        q2: { '0': 'q1', '1': 'q2' }
      },
      positions: {
        q0: { x: 260, y: 250 },
        q1: { x: 440, y: 150 },
        q2: { x: 440, y: 350 }
      }
    }
  },
  {
    id: 'ends01',
    name: 'Strings Ending with "01"',
    category: 'Pattern Matching',
    type: 'dfa',
    description: 'Accepts all binary strings that end with the suffix "01". $L = \\{ w \\in \\{0, 1\\}^* \\mid w = x01 \\text{ for some } x \\in \\{0, 1\\}^* \\}$.',
    sampleInput: '100101',
    testCases: ['01', '001', '101', '1101', '0101', '0', '1', '10', '00', '11'],
    data: {
      states: ['q0', 'q1', 'q2'],
      alphabet: ['0', '1'],
      startState: 'q0',
      acceptStates: ['q2'],
      transitions: {
        q0: { '0': 'q1', '1': 'q0' },
        q1: { '0': 'q1', '1': 'q2' },
        q2: { '0': 'q1', '1': 'q0' }
      },
      positions: {
        q0: { x: 250, y: 250 },
        q1: { x: 400, y: 250 },
        q2: { x: 550, y: 250 }
      }
    }
  },
  {
    id: 'even0even1',
    name: 'Even Number of 0s and 1s',
    category: 'Parity / Combinatorics',
    type: 'dfa',
    description: 'Accepts strings containing both an even count of 0s and an even count of 1s. $L = \\{ w \\in \\{0, 1\\}^* \\mid \\#_0(w) \\text{ even and } \\#_1(w) \\text{ even} \\}$.',
    sampleInput: '0101',
    testCases: ['', '00', '11', '0101', '1010', '0011', '0', '1', '010', '011'],
    data: {
      states: ['q_ee', 'q_oe', 'q_eo', 'q_oo'],
      alphabet: ['0', '1'],
      startState: 'q_ee',
      acceptStates: ['q_ee'],
      transitions: {
        q_ee: { '0': 'q_oe', '1': 'q_eo' },
        q_oe: { '0': 'q_ee', '1': 'q_oo' },
        q_eo: { '0': 'q_oo', '1': 'q_ee' },
        q_oo: { '0': 'q_eo', '1': 'q_oe' }
      },
      positions: {
        q_ee: { x: 280, y: 170 },
        q_oe: { x: 520, y: 170 },
        q_eo: { x: 280, y: 350 },
        q_oo: { x: 520, y: 350 }
      }
    }
  },
  {
    id: 'contains101',
    name: 'Contains Substring "101"',
    category: 'Substring Search',
    type: 'dfa',
    description: 'Accepts strings containing the substring "101". Once the pattern is found, the automaton enters an absorbing accepting state.',
    sampleInput: '001011',
    testCases: ['101', '0101', '1010', '11101', '0010100', '100', '0110', '1100', '000'],
    data: {
      states: ['q0', 'q1', 'q2', 'q3'],
      alphabet: ['0', '1'],
      startState: 'q0',
      acceptStates: ['q3'],
      transitions: {
        q0: { '0': 'q0', '1': 'q1' },
        q1: { '0': 'q2', '1': 'q1' },
        q2: { '0': 'q0', '1': 'q3' },
        q3: { '0': 'q3', '1': 'q3' }
      },
      positions: {
        q0: { x: 200, y: 250 },
        q1: { x: 340, y: 250 },
        q2: { x: 480, y: 250 },
        q3: { x: 620, y: 250 }
      }
    }
  },
  {
    id: 'regex_abb',
    name: 'Regex: (a|b)*abb',
    category: 'Regular Expressions',
    type: 'regex',
    rawInput: '(a|b)*abb',
    description: 'Tokens ending in "abb" over alphabet {a, b}. Classic textbook example of Thompson + Subset construction.',
    sampleInput: 'ababb',
    testCases: ['abb', 'aabb', 'babb', 'ababb', 'bbabb', 'ab', 'ba', 'abba', 'b', '']
  },
  {
    id: 'regex_identifier',
    name: 'Regex: Identifiers [a-b](a|b|0|1)*',
    category: 'Lexical Analysis',
    type: 'regex',
    rawInput: '(a|b)(a|b|0|1)*',
    description: 'Identifiers starting with a letter {a, b} followed by letters or digits {a, b, 0, 1}.',
    sampleInput: 'a0b1',
    testCases: ['a', 'b', 'a1', 'b0', 'ab10', '0a', '1b', '0', '1', '']
  },
  {
    id: 'grammar_even_as',
    name: 'Grammar: Even Number of a\'s',
    category: 'Regular Grammars',
    type: 'grammar',
    rawInput: `S -> bS | aA | ε
A -> bA | aS`,
    description: 'Right-linear regular grammar generating strings with an even number of \'a\'s over alphabet {a, b}.',
    sampleInput: 'bbaab',
    testCases: ['', 'b', 'aa', 'baab', 'aaba', 'a', 'aba', 'aaa', 'aab']
  }
];

  /**
 * DFA String Processing Visualizer - Main Application Controller
 */










class App {
  constructor() {
    this.currentDFA = null;
    this.historyStack = [];

    // DOM Elements
    this.svgElement = document.getElementById('dfa-svg');
    this.tapeContainer = document.getElementById('tape-container');
    this.stringInput = document.getElementById('string-input');
    this.statusBadge = document.getElementById('status-badge');
    this.statusMessage = document.getElementById('status-message');
    this.formalTraceTable = document.getElementById('trace-table-body');
    this.transitionTableContainer = document.getElementById('transition-table-container');
    this.presetSelect = document.getElementById('preset-select');
    this.batchResultsContainer = document.getElementById('batch-results-body');

    // Controls
    this.playBtn = document.getElementById('btn-play');
    this.pauseBtn = document.getElementById('btn-pause');
    this.stepFwdBtn = document.getElementById('btn-step-fwd');
    this.stepBackBtn = document.getElementById('btn-step-back');
    this.resetBtn = document.getElementById('btn-reset');
    this.fastFwdBtn = document.getElementById('btn-fast-fwd');
    this.speedSlider = document.getElementById('speed-slider');
    this.speedLabel = document.getElementById('speed-label');

    // Initialize visualizers
    this.graph = new GraphVisualizer(this.svgElement);
    this.tape = new TapeVisualizer(this.tapeContainer, (charIdx) => {
      this.simulator.jumpToStep(charIdx + 1);
    });

    this.simulator = new Simulator(null, this.graph, this.tape, {
      speed: 800,
      animateParticles: true
    });

    this.setupEventListeners();
    this.populatePresets();

    // Load initial default preset (Binary Divisible by 3)
    this.loadPreset('div3');
  }

  populatePresets() {
    this.presetSelect.innerHTML = '<option value="">-- Select Classic Automaton Preset --</option>';
    const groups = {};

    PRESETS.forEach(p => {
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    });

    for (const [category, list] of Object.entries(groups)) {
      const optGroup = document.createElement('optgroup');
      optGroup.label = category;
      list.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        optGroup.appendChild(opt);
      });
      this.presetSelect.appendChild(optGroup);
    }
  }

  loadPreset(presetId) {
    const preset = PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    this.presetSelect.value = presetId;
    document.getElementById('preset-info').innerHTML = `
      <strong>${preset.name}</strong>: ${preset.description}
    `;

    if (preset.type === 'dfa') {
      const dfa = DFA.fromJSON(preset.data);
      this.setAutomaton(dfa, preset.sampleInput || '');
    } else if (preset.type === 'regex') {
      document.getElementById('tab-regex-btn').click();
      document.getElementById('regex-input').value = preset.rawInput;
      this.convertRegexToDFA(preset.rawInput, preset.sampleInput || '');
    } else if (preset.type === 'grammar') {
      document.getElementById('tab-grammar-btn').click();
      document.getElementById('grammar-input').value = preset.rawInput;
      this.convertGrammarToDFA(preset.rawInput, preset.sampleInput || '');
    }

    // Populate quick test case pills
    this.renderTestCasePills(preset.testCases || []);
  }

  renderTestCasePills(testCases) {
    const container = document.getElementById('test-cases-pills');
    container.innerHTML = '';
    if (!testCases || testCases.length === 0) return;

    testCases.forEach(tc => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'test-pill';
      pill.textContent = tc === '' ? 'ε (empty)' : `"${tc}"`;
      pill.title = `Test string: "${tc}"`;
      pill.addEventListener('click', () => {
        this.stringInput.value = tc;
        this.simulator.loadString(tc);
        this.simulator.play();
      });
      container.appendChild(pill);
    });
  }

  setAutomaton(dfa, sampleInput = null) {
    this.currentDFA = dfa;
    this.simulator.setDFA(dfa);
    this.graph.setDFA(dfa, true);

    this.updateManualEditor();
    this.renderTransitionTable();
    this.runBatchTests();

    const inputToLoad = sampleInput !== null ? sampleInput : this.stringInput.value;
    this.stringInput.value = inputToLoad;
    this.simulator.loadString(inputToLoad);

    this.updateAutomatonStats();
  }

  updateAutomatonStats() {
    const validation = this.currentDFA.validate();
    const statsEl = document.getElementById('automaton-stats');

    let badgeClass = 'badge-success';
    let statusText = 'Valid & Complete DFA';

    if (!validation.isValid) {
      badgeClass = 'badge-danger';
      statusText = 'Invalid DFA';
    } else if (!validation.isComplete) {
      badgeClass = 'badge-warning';
      statusText = 'Incomplete DFA (Implicit Dead States)';
    }

    statsEl.innerHTML = `
      <div class="stats-row">
        <span>|Q| = <strong>${this.currentDFA.states.size}</strong> states</span>
        <span>|Σ| = <strong>${this.currentDFA.alphabet.size}</strong> symbols</span>
        <span>|F| = <strong>${this.currentDFA.acceptStates.size}</strong> accept</span>
        <span class="badge ${badgeClass}">${statusText}</span>
      </div>
      ${validation.warnings.length > 0 ? `<div class="warning-text">${validation.warnings.join('<br>')}</div>` : ''}
      ${validation.errors.length > 0 ? `<div class="error-text">${validation.errors.join('<br>')}</div>` : ''}
    `;
  }

  setupEventListeners() {
    // Simulator controls
    this.playBtn.addEventListener('click', () => this.simulator.play());
    this.pauseBtn.addEventListener('click', () => this.simulator.pause());
    this.stepFwdBtn.addEventListener('click', () => this.simulator.stepForward(true));
    this.stepBackBtn.addEventListener('click', () => this.simulator.stepBackward());
    this.resetBtn.addEventListener('click', () => this.simulator.reset());
    this.fastFwdBtn.addEventListener('click', () => this.simulator.fastForward());

    // Speed slider
    this.speedSlider.addEventListener('input', (e) => {
      const speed = parseInt(e.target.value, 10);
      this.simulator.setSpeed(speed);
      this.speedLabel.textContent = `${(speed / 1000).toFixed(2)}s`;
    });

    // Particle animation toggle
    const particleToggle = document.getElementById('particle-toggle');
    if (particleToggle) {
      particleToggle.addEventListener('change', (e) => {
        this.simulator.setAnimateParticles(e.target.checked);
      });
    }

    // String input load
    const loadStringBtn = document.getElementById('btn-load-string');
    const handleLoadString = () => {
      const str = this.stringInput.value;
      this.simulator.loadString(str);
    };
    loadStringBtn.addEventListener('click', handleLoadString);
    this.stringInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleLoadString();
    });

    // Presets dropdown
    this.presetSelect.addEventListener('change', (e) => {
      if (e.target.value) {
        this.loadPreset(e.target.value);
      }
    });

    // Graph tools
    document.getElementById('btn-zoom-in').addEventListener('click', () => this.graph.zoom(0.85));
    document.getElementById('btn-zoom-out').addEventListener('click', () => this.graph.zoom(1.18));
    document.getElementById('btn-zoom-reset').addEventListener('click', () => this.graph.resetZoom());
    document.getElementById('btn-relayout').addEventListener('click', () => {
      this.graph.computeLayout();
      this.graph.render();
    });

    // Simulator callbacks
    this.simulator.onPlayStateChange = (isPlaying) => {
      if (isPlaying) {
        this.playBtn.classList.add('hidden');
        this.pauseBtn.classList.remove('hidden');
      } else {
        this.playBtn.classList.remove('hidden');
        this.pauseBtn.classList.add('hidden');
      }
    };

    this.simulator.onStepChange = ({ stepIndex, totalSteps, stepData, isFirst, isLast, result }) => {
      this.renderTraceTable(result.trace, stepIndex);
      this.updateStatusDisplay(stepData, isFirst, isLast, result);
      this.highlightActiveTableCell(stepData.state, stepData.symbol);
    };

    // Mode tabs (Manual, Regex, Grammar)
    const tabBtns = document.querySelectorAll('.mode-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const targetTab = btn.dataset.tab;
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        document.getElementById(targetTab).classList.add('active');
      });
    });

    // Regex conversion
    document.getElementById('btn-convert-regex').addEventListener('click', () => {
      const regexStr = document.getElementById('regex-input').value.trim();
      if (!regexStr) return;
      this.convertRegexToDFA(regexStr);
    });

    // Grammar conversion
    document.getElementById('btn-convert-grammar').addEventListener('click', () => {
      const grammarStr = document.getElementById('grammar-input').value.trim();
      if (!grammarStr) return;
      this.convertGrammarToDFA(grammarStr);
    });

    // Minimization button
    document.getElementById('btn-minimize-dfa').addEventListener('click', () => {
      this.minimizeCurrentDFA();
    });

    // Complete DFA button
    document.getElementById('btn-complete-dfa').addEventListener('click', () => {
      if (!this.currentDFA) return;
      const trap = this.currentDFA.completeWithTrapState('q_dead');
      if (trap) {
        this.setAutomaton(this.currentDFA);
        alert(`Completed DFA with trap state "${trap}".`);
      } else {
        alert('DFA is already complete (all states have transitions for every symbol in Σ).');
      }
    });

    // Manual editor events
    document.getElementById('btn-apply-manual').addEventListener('click', () => {
      this.applyManualEditor();
    });

    // Batch test runner
    document.getElementById('btn-run-batch').addEventListener('click', () => {
      this.runBatchTests();
    });

    // Export / Import
    document.getElementById('btn-export-json').addEventListener('click', () => this.exportJSON());
    document.getElementById('file-import-json').addEventListener('change', (e) => this.importJSON(e));
    document.getElementById('btn-export-svg').addEventListener('click', () => this.exportSVG());
  }

  convertRegexToDFA(regexStr, sampleString = null) {
    try {
      const dfa = RegexEngine.regexToDFA(regexStr);
      const shouldMinimize = document.getElementById('regex-minimize-toggle')?.checked;
      let finalDFA = dfa;
      if (shouldMinimize) {
        const { minimizedDFA } = DFAMinimizer.minimize(dfa);
        finalDFA = minimizedDFA;
      }
      this.setAutomaton(finalDFA, sampleString);
      document.getElementById('preset-info').innerHTML = `
        <strong>Generated DFA from Regex:</strong> <code>${regexStr}</code>
      `;
    } catch (err) {
      alert(`Regex Conversion Error: ${err.message}`);
    }
  }

  convertGrammarToDFA(grammarStr, sampleString = null) {
    try {
      const dfa = GrammarEngine.grammarToDFA(grammarStr);
      this.setAutomaton(dfa, sampleString);
      document.getElementById('preset-info').innerHTML = `
        <strong>Generated DFA from Regular Grammar</strong>
      `;
    } catch (err) {
      alert(`Grammar Conversion Error: ${err.message}`);
    }
  }

  minimizeCurrentDFA() {
    if (!this.currentDFA) return;
    try {
      const { minimizedDFA, steps, stateMapping } = DFAMinimizer.minimize(this.currentDFA);

      let stepLog = `Minimization Completed (${this.currentDFA.states.size} states -> ${minimizedDFA.states.size} states):\n`;
      steps.forEach(s => {
        stepLog += `P${s.iteration}: [ ${s.partitions.map(p => `{${p.join(',')}}`).join(', ')} ]\n`;
      });

      this.setAutomaton(minimizedDFA);
      alert(stepLog);
    } catch (err) {
      alert(`Minimization Error: ${err.message}`);
    }
  }

  updateStatusDisplay(stepData, isFirst, isLast, result) {
    this.statusBadge.className = 'status-badge';

    if (isLast) {
      if (result.accepted) {
        this.statusBadge.classList.add('badge-success');
        this.statusBadge.textContent = 'ACCEPTED ✓';
        this.statusMessage.innerHTML = `<span class="text-success font-bold">${result.reason}</span>`;
      } else {
        this.statusBadge.classList.add('badge-danger');
        this.statusBadge.textContent = 'REJECTED ✗';
        this.statusMessage.innerHTML = `<span class="text-danger font-bold">${result.reason}</span>`;
      }
    } else if (isFirst) {
      this.statusBadge.classList.add('badge-info');
      this.statusBadge.textContent = 'START';
      this.statusMessage.innerHTML = `Initialized at start state <strong>${stepData.state}</strong>. Tape is positioned at head.`;
    } else {
      this.statusBadge.classList.add('badge-warning');
      this.statusBadge.textContent = 'STEPPING';
      this.statusMessage.innerHTML = `Transition taken: &delta;(<strong>${stepData.state}</strong>, '<strong>${stepData.symbol}</strong>') &rarr; <strong>${stepData.nextState}</strong>.`;
    }
  }

  renderTraceTable(trace, activeStepIndex) {
    this.formalTraceTable.innerHTML = '';
    if (!trace) return;

    trace.forEach((step, idx) => {
      const tr = document.createElement('tr');
      if (idx === activeStepIndex) tr.className = 'trace-row-active';

      tr.innerHTML = `
        <td class="text-center font-mono">${step.step}</td>
        <td class="text-center font-mono font-bold">${step.state}</td>
        <td class="text-center font-mono">${step.symbol !== null ? step.symbol : '—'}</td>
        <td class="text-center font-mono font-bold">${step.nextState ? step.nextState : (step.symbol ? 'Trap (∅)' : step.state)}</td>
        <td class="font-mono text-xs">${step.remaining ? step.remaining : 'ε'}</td>
        <td class="text-xs">${step.message}</td>
      `;

      tr.addEventListener('click', () => {
        this.simulator.jumpToStep(idx);
      });

      this.formalTraceTable.appendChild(tr);
    });

    // Auto-scroll active row into view
    const activeRow = this.formalTraceTable.querySelector('.trace-row-active');
    if (activeRow) {
      activeRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  renderTransitionTable() {
    this.transitionTableContainer.innerHTML = '';
    if (!this.currentDFA) return;

    const states = Array.from(this.currentDFA.states).sort();
    const alphabet = Array.from(this.currentDFA.alphabet).sort();

    const table = document.createElement('table');
    table.className = 'transition-grid';

    // Header row
    const thead = document.createElement('thead');
    let headerHTML = '<tr><th>State</th>';
    alphabet.forEach(sym => {
      headerHTML += `<th>${sym}</th>`;
    });
    headerHTML += '</tr>';
    thead.innerHTML = headerHTML;
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    states.forEach(s => {
      const isStart = this.currentDFA.startState === s;
      const isAccept = this.currentDFA.acceptStates.has(s);

      const tr = document.createElement('tr');
      tr.dataset.state = s;

      let prefix = '';
      if (isStart && isAccept) prefix = '→ *';
      else if (isStart) prefix = '→ ';
      else if (isAccept) prefix = '* ';

      let rowHTML = `<td class="font-bold state-cell">${prefix}${s}</td>`;

      alphabet.forEach(sym => {
        const dest = this.currentDFA.getTransition(s, sym);
        rowHTML += `<td class="trans-cell font-mono" data-state="${s}" data-sym="${sym}">${dest !== null ? dest : '—'}</td>`;
      });

      tr.innerHTML = rowHTML;
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    this.transitionTableContainer.appendChild(table);
  }

  highlightActiveTableCell(state, symbol) {
    // Remove previous highlights
    const prevs = this.transitionTableContainer.querySelectorAll('.active-trans-cell');
    prevs.forEach(c => c.classList.remove('active-trans-cell'));

    if (!state || !symbol) return;
    const cell = this.transitionTableContainer.querySelector(`.trans-cell[data-state="${state}"][data-sym="${symbol}"]`);
    if (cell) {
      cell.classList.add('active-trans-cell');
    }
  }

  updateManualEditor() {
    if (!this.currentDFA) return;

    document.getElementById('manual-states').value = Array.from(this.currentDFA.states).join(', ');
    document.getElementById('manual-alphabet').value = Array.from(this.currentDFA.alphabet).join(', ');
    document.getElementById('manual-start').value = this.currentDFA.startState;
    document.getElementById('manual-accept').value = Array.from(this.currentDFA.acceptStates).join(', ');

    // Manual transitions in format: state, symbol -> nextState
    const transLines = [];
    for (const [from, symMap] of this.currentDFA.transitions) {
      for (const [sym, to] of symMap) {
        transLines.push(`${from}, ${sym} -> ${to}`);
      }
    }
    document.getElementById('manual-transitions').value = transLines.join('\n');
  }

  applyManualEditor() {
    try {
      const statesStr = document.getElementById('manual-states').value;
      const alphaStr = document.getElementById('manual-alphabet').value;
      const startStr = document.getElementById('manual-start').value.trim();
      const acceptStr = document.getElementById('manual-accept').value;
      const transStr = document.getElementById('manual-transitions').value;

      const states = statesStr.split(',').map(s => s.trim()).filter(Boolean);
      const alphabet = alphaStr.split(',').map(s => s.trim()).filter(Boolean);
      const acceptStates = acceptStr.split(',').map(s => s.trim()).filter(Boolean);

      const dfa = new DFA({
        states,
        alphabet,
        startState: startStr,
        acceptStates
      });

      const lines = transStr.split('\n');
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        // Pattern: q0, 0 -> q1
        const match = line.match(/^([^,]+),\s*([^->]+)\s*->\s*(.+)$/);
        if (match) {
          const from = match[1].trim();
          const sym = match[2].trim();
          const to = match[3].trim();
          dfa.setTransition(from, sym, to);
        }
      }

      this.setAutomaton(dfa);
      alert('DFA successfully updated from manual definition.');
    } catch (err) {
      alert(`Error parsing manual DFA definition: ${err.message}`);
    }
  }

  runBatchTests() {
    this.batchResultsContainer.innerHTML = '';
    if (!this.currentDFA) return;

    const rawInput = document.getElementById('batch-strings-input').value;
    const lines = rawInput.split('\n').map(s => s.trim());

    lines.forEach(str => {
      // allow empty line testing as empty string if explicitly written as 'ε' or empty
      const testStr = (str === 'ε' || str === "''" || str === '""') ? '' : str;
      const res = this.currentDFA.processString(testStr);

      const tr = document.createElement('tr');
      tr.className = 'cursor-pointer hover:bg-slate-700/50';
      tr.innerHTML = `
        <td class="font-mono text-sm">${testStr === '' ? 'ε (empty)' : testStr}</td>
        <td class="text-center font-mono text-xs">${testStr.length}</td>
        <td class="text-center font-mono text-xs">${res.finalState || '—'}</td>
        <td class="text-center">
          <span class="badge ${res.accepted ? 'badge-success' : 'badge-danger'}">
            ${res.accepted ? 'ACCEPTED ✓' : 'REJECTED ✗'}
          </span>
        </td>
      `;

      tr.addEventListener('click', () => {
        this.stringInput.value = testStr;
        this.simulator.loadString(testStr);
      });

      this.batchResultsContainer.appendChild(tr);
    });
  }

  exportJSON() {
    if (!this.currentDFA) return;
    const jsonStr = JSON.stringify(this.currentDFA.toJSON(), null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dfa_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const dfa = DFA.fromJSON(e.target.result);
        this.setAutomaton(dfa);
        alert('DFA imported successfully.');
      } catch (err) {
        alert(`Failed to import DFA JSON: ${err.message}`);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  exportSVG() {
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(this.svgElement);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dfa_diagram_${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});

})();
