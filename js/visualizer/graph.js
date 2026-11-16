/**
 * Interactive SVG Graph Visualizer for DFA States & Transitions
 * Supports draggable nodes, bezier curves, self-loops, zoom/pan,
 * particle traversal animations, and active state highlights.
 */

export class GraphVisualizer {
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
          <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#0284c7" />
        </marker>
        <!-- Arrowhead Marker for Start Arrow -->
        <marker id="arrow-start" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#059669" />
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
    circle.setAttribute('fill', '#0284c7');
    circle.setAttribute('filter', 'url(#glow-cyan)');

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'central');
    text.setAttribute('fill', '#ffffff');
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
