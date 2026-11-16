/**
 * Simulation Controller for DFA String Execution
 * Manages step-by-step playback, backwards rewind, speed, and status events.
 */

export class Simulator {
  constructor(dfa, graphVisualizer, tapeVisualizer, options = {}) {
    this.dfa = dfa;
    this.graph = graphVisualizer;
    this.tape = tapeVisualizer;
    this.options = {
      speed: 800, // ms per step
      animateParticles: true,
      ...options
    };

    this.inputString = '';
    this.result = null; // output from dfa.processString
    this.currentStep = 0;
    this.isPlaying = false;
    this.timer = null;

    this.onStepChange = null; // callback(stepData, isFirst, isLast, result)
    this.onPlayStateChange = null; // callback(isPlaying)
  }

  setDFA(dfa) {
    this.pause();
    this.dfa = dfa;
    this.reset();
  }

  loadString(str) {
    this.pause();
    this.inputString = String(str);
    this.result = this.dfa.processString(this.inputString);
    this.currentStep = 0;
    this.tape.setString(this.inputString);
    this.applyCurrentStep(false);
  }

  setSpeed(ms) {
    this.options.speed = Math.max(100, Math.min(3000, ms));
  }

  setAnimateParticles(enabled) {
    this.options.animateParticles = !!enabled;
  }

  play() {
    if (this.isPlaying) return;
    if (!this.result || this.result.trace.length <= 1) return;

    if (this.currentStep >= this.result.trace.length - 1) {
      this.currentStep = 0;
      this.applyCurrentStep(false);
    }

    this.isPlaying = true;
    if (this.onPlayStateChange) this.onPlayStateChange(true);

    const stepLoop = () => {
      if (!this.isPlaying) return;
      if (this.currentStep < this.result.trace.length - 1) {
        this.stepForward(true, () => {
          if (this.isPlaying) {
            this.timer = setTimeout(stepLoop, this.options.speed);
          }
        });
      } else {
        this.pause();
      }
    };

    this.timer = setTimeout(stepLoop, this.options.speed);
  }

  pause() {
    this.isPlaying = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.onPlayStateChange) this.onPlayStateChange(false);
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  reset() {
    this.pause();
    this.currentStep = 0;
    if (this.result) {
      this.applyCurrentStep(false);
    }
  }

  stepForward(animate = true, onComplete = null) {
    if (!this.result) return;
    if (this.currentStep < this.result.trace.length - 1) {
      const nextStepIndex = this.currentStep + 1;
      const stepData = this.result.trace[nextStepIndex];

      if (animate && this.options.animateParticles && stepData.symbol !== null && stepData.nextState) {
        // Run particle animation along edge, then update state
        this.graph.animateTransitionParticle(
          stepData.state,
          stepData.nextState,
          stepData.symbol,
          () => {
            this.currentStep = nextStepIndex;
            this.applyCurrentStep(false);
            if (onComplete) onComplete();
          }
        );
      } else {
        this.currentStep = nextStepIndex;
        this.applyCurrentStep(false);
        if (onComplete) onComplete();
      }
    } else {
      if (onComplete) onComplete();
    }
  }

  stepBackward() {
    this.pause();
    if (this.currentStep > 0) {
      this.currentStep--;
      this.applyCurrentStep(false);
    }
  }

  jumpToStep(stepIndex) {
    this.pause();
    if (!this.result) return;
    this.currentStep = Math.max(0, Math.min(this.result.trace.length - 1, stepIndex));
    this.applyCurrentStep(false);
  }

  fastForward() {
    this.pause();
    if (!this.result) return;
    this.currentStep = this.result.trace.length - 1;
    this.applyCurrentStep(false);
  }

  applyCurrentStep(animateParticle = false) {
    if (!this.result || this.result.trace.length === 0) return;

    const stepData = this.result.trace[this.currentStep];
    const isFirst = this.currentStep === 0;
    const isLast = this.currentStep === this.result.trace.length - 1;

    let finalStatus = null;
    if (isLast) {
      finalStatus = this.result.accepted ? 'ACCEPTED' : 'REJECTED';
    }

    // Determine current state to highlight
    const currentState = stepData.nextState || stepData.state;

    // Transition info
    const lastTransition = stepData.symbol !== null && stepData.nextState ? {
      from: stepData.state,
      to: stepData.nextState,
      symbol: stepData.symbol
    } : null;

    this.graph.setActiveState(currentState, lastTransition, finalStatus);

    // Update tape cursor
    // If at start (step 0), tape cursor is at -1 or 0
    const charIndex = this.currentStep === 0 ? 0 : this.currentStep - 1;
    const tapeStatus = isLast
      ? (this.result.accepted ? 'ACCEPTED' : 'REJECTED')
      : (isFirst ? 'READY' : 'STEPPING');

    this.tape.setCursor(this.currentStep === 0 ? 0 : this.currentStep, tapeStatus);

    if (this.onStepChange) {
      this.onStepChange({
        stepIndex: this.currentStep,
        totalSteps: this.result.trace.length,
        stepData,
        isFirst,
        isLast,
        result: this.result
      });
    }
  }
}

