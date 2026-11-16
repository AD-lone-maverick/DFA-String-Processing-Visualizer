/**
 * Input String Ribbon / Tape Visualizer
 * Shows string cells, active reading head cursor, consumed symbols,
 * and current computation state.
 */

export class TapeVisualizer {
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

