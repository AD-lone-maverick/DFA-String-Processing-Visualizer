/**
 * DFA Minimizer using Hopcroft's / Moore's Partition Refinement Algorithm
 * Computes minimal DFA and records step-by-step partition history.
 */

import { DFA } from './dfa.js';

export class DFAMinimizer {
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

