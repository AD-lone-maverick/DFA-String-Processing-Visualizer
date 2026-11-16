/**
 * DFA String Processing Visualizer - Main Application Controller
 */

import { DFA } from './automata/dfa.js';
import { RegexEngine } from './automata/regex.js';
import { GrammarEngine } from './automata/grammar.js';
import { DFAMinimizer } from './automata/minimizer.js';
import { GraphVisualizer } from './visualizer/graph.js';
import { TapeVisualizer } from './visualizer/tape.js';
import { Simulator } from './visualizer/simulator.js';
import { PRESETS } from './visualizer/presets.js';

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

    // Manual editor events
    document.getElementById('btn-apply-manual').addEventListener('click', () => {
      this.applyManualEditor();
    });

    // Batch test runner
    document.getElementById('btn-run-batch').addEventListener('click', () => {
      this.runBatchTests();
    });
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
