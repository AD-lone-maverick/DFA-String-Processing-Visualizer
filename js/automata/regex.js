/**
 * Regular Expression to DFA Converter
 * 1. Shunting-Yard (Infix -> Postfix with explicit concatenation)
 * 2. Thompson's Construction (Postfix -> ε-NFA)
 * 3. Subset Construction (ε-NFA -> DFA)
 */

import { DFA } from './dfa.js';

export const EPSILON = 'ε';

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

export class RegexEngine {
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

