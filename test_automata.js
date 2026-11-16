/**
 * Automata Theory Algorithms Verification Script
 */

import { DFA } from './js/automata/dfa.js';
import { RegexEngine } from './js/automata/regex.js';
import { GrammarEngine } from './js/automata/grammar.js';
import { DFAMinimizer } from './js/automata/minimizer.js';

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${message}`);
  } else {
    console.error(`[FAIL] ${message}`);
  }
}

console.log('=== TEST 1: Manual DFA (Binary Divisible by 3) ===');
const div3DFA = new DFA({
  states: ['q0', 'q1', 'q2'],
  alphabet: ['0', '1'],
  startState: 'q0',
  acceptStates: ['q0'],
  transitions: {
    q0: { '0': 'q0', '1': 'q1' },
    q1: { '0': 'q2', '1': 'q0' },
    q2: { '0': 'q1', '1': 'q2' }
  }
});

// Binary 0 = 0 -> accept
assert(div3DFA.processString('0').accepted === true, 'Binary 0 (0) mod 3 == 0 -> Accepted');
// Binary 11 = 3 -> accept
assert(div3DFA.processString('11').accepted === true, 'Binary 11 (3) mod 3 == 0 -> Accepted');
// Binary 110 = 6 -> accept
assert(div3DFA.processString('110').accepted === true, 'Binary 110 (6) mod 3 == 0 -> Accepted');
// Binary 1001 = 9 -> accept
assert(div3DFA.processString('1001').accepted === true, 'Binary 1001 (9) mod 3 == 0 -> Accepted');
// Binary 1 = 1 -> reject
assert(div3DFA.processString('1').accepted === false, 'Binary 1 (1) mod 3 != 0 -> Rejected');
// Binary 10 = 2 -> reject
assert(div3DFA.processString('10').accepted === false, 'Binary 10 (2) mod 3 != 0 -> Rejected');
// Binary 100 = 4 -> reject
assert(div3DFA.processString('100').accepted === false, 'Binary 100 (4) mod 3 != 0 -> Rejected');
// Invalid symbol '2'
assert(div3DFA.processString('102').accepted === false, 'String with symbol not in alphabet -> Rejected');

console.log('\n=== TEST 2: Regex Engine (Thompson + Subset Construction) ===');
// Regex: (a|b)*abb
const abbDFA = RegexEngine.regexToDFA('(a|b)*abb');
console.log(`Generated DFA states for (a|b)*abb:`, Array.from(abbDFA.states));
assert(abbDFA.processString('abb').accepted === true, 'abb is accepted');
assert(abbDFA.processString('aabb').accepted === true, 'aabb is accepted');
assert(abbDFA.processString('babb').accepted === true, 'babb is accepted');
assert(abbDFA.processString('ababb').accepted === true, 'ababb is accepted');
assert(abbDFA.processString('ab').accepted === false, 'ab is rejected');
assert(abbDFA.processString('abba').accepted === false, 'abba is rejected');
assert(abbDFA.processString('').accepted === false, 'empty string is rejected');

console.log('\n=== TEST 3: Regex with Alternation and Star ===');
// Regex: 0*10*
const single1DFA = RegexEngine.regexToDFA('0*10*');
assert(single1DFA.processString('1').accepted === true, '1 is accepted');
assert(single1DFA.processString('01').accepted === true, '01 is accepted');
assert(single1DFA.processString('000100').accepted === true, '000100 is accepted');
assert(single1DFA.processString('000').accepted === false, '000 (no 1) is rejected');
assert(single1DFA.processString('101').accepted === false, '101 (two 1s) is rejected');

console.log('\n=== TEST 4: DFA Minimization (Hopcroft) ===');
const { minimizedDFA, steps } = DFAMinimizer.minimize(abbDFA);
console.log(`Minimized states: ${abbDFA.states.size} -> ${minimizedDFA.states.size}`);
assert(minimizedDFA.states.size <= abbDFA.states.size, 'Minimized DFA has <= states than original');
assert(minimizedDFA.processString('abb').accepted === true, 'minimized DFA accepts abb');
assert(minimizedDFA.processString('ababb').accepted === true, 'minimized DFA accepts ababb');
assert(minimizedDFA.processString('ab').accepted === false, 'minimized DFA rejects ab');
assert(minimizedDFA.processString('abba').accepted === false, 'minimized DFA rejects abba');

console.log('\n=== TEST 5: Grammar Engine (Right-Linear Grammar) ===');
// S -> 0S | 1A | ε
// A -> 0A | 1S
const grammarStr = `
S -> 0S | 1A | ε
A -> 0A | 1S
`;
const grammarDFA = GrammarEngine.grammarToDFA(grammarStr);
console.log(`Grammar DFA states:`, Array.from(grammarDFA.states));
// Accepts strings with even number of 1s
assert(grammarDFA.processString('').accepted === true, 'empty string has even 1s (0) -> Accepted');
assert(grammarDFA.processString('0').accepted === true, '0 has even 1s -> Accepted');
assert(grammarDFA.processString('11').accepted === true, '11 has even 1s (2) -> Accepted');
assert(grammarDFA.processString('01010').accepted === true, '01010 has even 1s -> Accepted');
assert(grammarDFA.processString('1').accepted === false, '1 has odd 1s -> Rejected');
assert(grammarDFA.processString('111').accepted === false, '111 has odd 1s -> Rejected');

console.log(`\n========================================`);
console.log(`Summary: ${passedTests}/${totalTests} tests passed.`);
if (passedTests === totalTests) {
  console.log('ALL AUTOMATA ALGORITHM TESTS PASSED PERFECTLY!');
} else {
  process.exit(1);
}

