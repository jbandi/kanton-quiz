(function (KQ) {
  'use strict';
  KQ.Timer = class {
    constructor(onTick) { this.onTick = onTick; this.netMs = 0; this.penaltyMs = 0; this.startedAt = null; this.interval = null; }
    read() {
      const netMs = this.netMs + (this.startedAt === null ? 0 : performance.now() - this.startedAt);
      return { netMs, penaltyMs: this.penaltyMs, totalMs: netMs + this.penaltyMs };
    }
    resume() {
      if (this.startedAt !== null) return;
      this.startedAt = performance.now();
      this.interval = setInterval(() => this.onTick(this.read()), 100);
      this.onTick(this.read());
    }
    pause() {
      if (this.startedAt !== null) this.netMs += performance.now() - this.startedAt;
      this.startedAt = null;
      clearInterval(this.interval);
      this.interval = null;
      this.onTick(this.read());
      return this.read();
    }
    addPenalty(ms) { this.penaltyMs += ms; this.onTick(this.read()); }
    stop() { return this.pause(); }
  };
})(window.KQ);
