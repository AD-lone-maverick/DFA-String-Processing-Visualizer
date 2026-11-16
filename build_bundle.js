/**
 * Simple zero-dependency bundler to create a self-contained bundle.js
 * allowing double-clicking index.html directly from file:// with zero CORS restriction!
 */

import fs from 'fs';
import path from 'path';

const baseDir = 'C:\\Users\\Atharva\\.gemini\\antigravity\\scratch\\dfa-visualizer';

const dfaCode = fs.readFileSync(path.join(baseDir, 'js/automata/dfa.js'), 'utf-8')
  .replace(/export class DFA/g, 'class DFA')
  .replace(/export /g, '');

const regexCode = fs.readFileSync(path.join(baseDir, 'js/automata/regex.js'), 'utf-8')
  .replace(/import { DFA } from '\.\/dfa\.js';/g, '')
  .replace(/export const EPSILON/g, 'const EPSILON')
  .replace(/export class RegexEngine/g, 'class RegexEngine');

const grammarCode = fs.readFileSync(path.join(baseDir, 'js/automata/grammar.js'), 'utf-8')
  .replace(/import { DFA } from '\.\/dfa\.js';/g, '')
  .replace(/import { RegexEngine, EPSILON } from '\.\/regex\.js';/g, '')
  .replace(/export class GrammarEngine/g, 'class GrammarEngine');

const minimizerCode = fs.readFileSync(path.join(baseDir, 'js/automata/minimizer.js'), 'utf-8')
  .replace(/import { DFA } from '\.\/dfa\.js';/g, '')
  .replace(/export class DFAMinimizer/g, 'class DFAMinimizer');

const graphCode = fs.readFileSync(path.join(baseDir, 'js/visualizer/graph.js'), 'utf-8')
  .replace(/export class GraphVisualizer/g, 'class GraphVisualizer');

const tapeCode = fs.readFileSync(path.join(baseDir, 'js/visualizer/tape.js'), 'utf-8')
  .replace(/export class TapeVisualizer/g, 'class TapeVisualizer');

const simulatorCode = fs.readFileSync(path.join(baseDir, 'js/visualizer/simulator.js'), 'utf-8')
  .replace(/export class Simulator/g, 'class Simulator');

const presetsCode = fs.readFileSync(path.join(baseDir, 'js/visualizer/presets.js'), 'utf-8')
  .replace(/export const PRESETS/g, 'const PRESETS');

const appCode = fs.readFileSync(path.join(baseDir, 'js/app.js'), 'utf-8')
  .replace(/import {[^}]+} from '[^']+';/g, '');

const bundle = `/**
 * DFA String Processing Visualizer - Standalone Bundle
 * Auto-generated for direct file:// and http:// execution
 */
(function() {
  'use strict';

  ${dfaCode}
  ${regexCode}
  ${grammarCode}
  ${minimizerCode}
  ${graphCode}
  ${tapeCode}
  ${simulatorCode}
  ${presetsCode}
  ${appCode}
})();
`;

fs.writeFileSync(path.join(baseDir, 'js/bundle.js'), bundle, 'utf-8');
console.log('Successfully generated js/bundle.js!');

