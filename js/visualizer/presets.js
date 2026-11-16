/**
 * Automata Theory Presets Catalog
 * Contains classic and pedagogical DFAs, Regexes, and Grammars.
 */

export const PRESETS = [
  {
    id: 'div3',
    name: 'Binary Divisible by 3',
    category: 'Arithmetic / Modulo',
    type: 'dfa',
    description: '',
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
  }
];

