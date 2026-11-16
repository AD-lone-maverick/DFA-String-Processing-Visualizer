# DFA String Processing Visualizer & Automata Theory Engine

An interactive, pedagogical **Deterministic Finite Automaton (DFA) String Processing Visualizer** built to animate state transitions, computation paths, and formal acceptance/rejection criteria in Automata Theory.

---

## 🌟 Key Capabilities & Features

### 1. Multiple Automaton Input Formats
- **Manual DFA Specification**:
  - Finite set of states $Q$ (e.g. `q0, q1, q2`).
  - Alphabet $\Sigma$ (e.g. `0, 1` or `a, b`).
  - Start state $q_0 \in Q$.
  - Accept states $F \subseteq Q$.
  - Transition function rules: `state, symbol -> nextState` per line.
- **Regular Expression to DFA Converter**:
  - Enter arbitrary regular expressions such as `(a|b)*abb`, `(0|1)*01`, `(a|b)(a|b|0|1)*`.
  - Supports operators:
    - Union: `|`
    - Kleene star: `*`
    - Positive closure: `+`
    - Optional: `?`
    - Grouping: `(...)`
    - Empty string: `ε` or `e`
  - Fully automated compilation pipeline:
    1. **Shunting-Yard Algorithm**: Infix to postfix notation with explicit concatenation operators (`·`).
    2. **Thompson's Construction**: Postfix regex to $\epsilon$-NFA state graph.
    3. **Subset Construction (Powerset)**: Computes $\epsilon$-closure to synthesize a clean, deterministic DFA.
    4. **Hopcroft's Minimization**: Optional 1-click state minimization.
- **Regular Grammar to DFA Converter**:
  - Right-linear Chomsky Type-3 grammars (e.g. `S -> 0S | 1A | ε`, `A -> 0A | 1S`).
  - Converts production rules to an NFA and executes subset construction to yield the minimal DFA.

### 2. Interactive String Processing & Visualization
- **Dynamic Tape Ribbon**:
  - Renders input string $w$ as discrete tape cells.
  - Floating reading-head cursor ($\blacktriangledown$) tracking the exact symbol consumed.
  - Distinct visual states: `Pending`, `Active`, `Consumed`, and `End-of-String (⊣)`.
  - Supports empty string $\epsilon$ testing.
- **Animated Planar State Graph (SVG)**:
  - High-DPI crisp vector graphics.
  - States rendered as circles; accept states rendered with double concentric circles.
  - Incoming green indicator arrow for the start state $q_0$.
  - Directed edges with curved bezier arcs to prevent overlapping bidirectional transitions ($A \to B$ vs $B \to A$).
  - Overlying self-loops for recursive transitions.
  - Multi-symbol transitions merged cleanly into single labels (e.g., `0, 1`).
  - **Draggable Nodes**: Rearrange any state with collision avoidance and smooth updates.
  - **Zoom & Pan**: Mouse wheel zoom, click-and-drag pan, and auto-layout re-centering.
  - **Edge Particles**: Animated packet traveling along transition arcs as characters are consumed.
  - **Accept/Reject Aura**: Pulsating emerald beacon upon string acceptance; crimson alert upon rejection or trap state.

### 3. Step-by-Step Playback Controls
- **Time Travel**:
  - `|<<` Reset to start state ($q_0$, step 0).
  - `<` Step Backward (rewind 1 symbol in the computation history).
  - `▶ Play` / `❚❚ Pause` with smooth variable speed slider (0.15s – 2.0s).
  - `>` Step Forward (advance 1 symbol).
  - `>>|` Fast-forward to final acceptance/rejection determination.
- Click any tape cell or any row in the trace ledger to jump directly to that point in execution.

### 4. Mathematical Rigor & Verification
- **Formal Computation Trace ($\delta^*$)**:
  - Displays each configuration step:
    $$\delta(q_{i-1}, w_i) \to q_i$$
  - Real-time remaining tape substring and mathematical rule annotation.
- **Completeness & Health Analysis**:
  - Checks whether the DFA is completely defined ($\forall q \in Q, \forall a \in \Sigma, \delta(q, a)$ is defined).
  - Detects unreachable states.
  - Detects dead/trap states.
  - 1-click **"Complete with Trap State"** button to auto-synthesize explicit $q_{\text{dead}}$ transitions.
- **Live Transition Matrix**:
  - Interactive grid displaying the state table.
  - The active cell $\delta(q, a)$ illuminates in real-time during execution.
- **Batch Test Suite**:
  - Test a batch of strings simultaneously.
  - Table outputs string length, final state, and green/red acceptance status badges.
  - Click any row in the batch results to load that string into the interactive visualizer.

### 5. Classic Automata Presets Catalog
- **Binary Divisible by 3**: Modulo 3 arithmetic over $\Sigma = \{0, 1\}$.
- **Strings Ending in "01"**: Pattern matching over binary strings.
- **Even Parity (Even 0s and Even 1s)**: 4-state product automaton over $\Sigma = \{0, 1\}$.
- **Contains Substring "101"**: Absorbing state pattern matcher.
- **Regex `(a|b)*abb`**: Classic textbook pattern matching automaton.
- **Regex Identifiers `(a|b)(a|b|0|1)*`**: Lexical analysis token recognizer.
- **Grammar for Even number of 'a's**: Right-linear grammar synthesis.

---

## 📂 Project Architecture

```
dfa-visualizer/
├── index.html                   # Main dashboard application UI
├── run.bat                      # 1-click launcher for Windows
├── build_bundle.js              # Standalone bundler
├── test_automata.js             # 31/31 unit test suite for automata algorithms
├── css/
│   └── styles.css               # Modern glassmorphism & dark theme styles
└── js/
    ├── app.js                   # Application coordinator & event wiring
    ├── bundle.js                # Self-contained bundle (works with file:// and http://)
    ├── automata/
    │   ├── dfa.js               # Formal DFA data structure, simulation & validation
    │   ├── regex.js             # Shunting-yard, Thompson's NFA & Subset Construction
    │   ├── grammar.js           # Right-Linear Grammar parser & converter
    │   └── minimizer.js         # Hopcroft's / Moore's DFA Minimizer
    └── visualizer/
        ├── graph.js             # Interactive SVG graph renderer with particle animations
        ├── tape.js              # Input ribbon & reading head cursor visualizer
        ├── simulator.js         # Playback engine with rewind, step & variable speed
        └── presets.js           # Catalog of classic automata theory benchmarks
```

---

## 🚀 How to Run

### Method 1: Double-Click (Zero Server Required)
Simply double-click `index.html` in Windows Explorer or open it in Google Chrome, Microsoft Edge, or Firefox.

### Method 2: Local HTTP Server
Double-click `run.bat` or run in your terminal:
```bash
python -m http.server 8000
```
Then navigate to:
```
http://localhost:8000/index.html
```

### Running Unit Tests
To run the automated verification suite for all automata algorithms:
```bash
node test_automata.js
```
All 31 test suites test:
- Modulo 3 arithmetic DFA transitions.
- Regex parsing, alternation, Kleene star, and subset construction.
- Hopcroft DFA state minimization.
- Right-linear regular grammar synthesis.
- Rejection of invalid alphabet symbols and dead states.

---

## 📐 Formal Theory Reference

Given an automaton $M = (Q, \Sigma, \delta, q_0, F)$:
1. $Q$ is a finite set of states.
2. $\Sigma$ is an alphabet (finite non-empty set of symbols).
3. $\delta: Q \times \Sigma \to Q$ is the transition function.
4. $q_0 \in Q$ is the start state.
5. $F \subseteq Q$ is the set of accept states.

The extended transition function $\delta^*: Q \times \Sigma^* \to Q$ is defined inductively:
- $\delta^*(q, \epsilon) = q$
- $\delta^*(q, wa) = \delta(\delta^*(q, w), a)$ for $w \in \Sigma^*, a \in \Sigma$

A string $w \in \Sigma^*$ is **accepted** by $M$ if and only if:
$$\delta^*(q_0, w) \in F$$
Otherwise, $w$ is **rejected**.

