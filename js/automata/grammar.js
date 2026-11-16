/**
 * Regular Grammar (Right-Linear Grammar) to DFA Converter
 * Supports:
 *   S -> aA | bB | c | ε
 *   A -> 0A | 1B
 */

import { DFA } from './dfa.js';
import { RegexEngine, EPSILON } from './regex.js';

export class GrammarEngine {
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

