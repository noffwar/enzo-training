export const createTimerView = (deps) => {
  const { html, ft, IPause, IPlay, IReset } = deps;
  
const FloatingTimer = ({left, active, onToggle, onReset}) => {
      if(left===0 && !active) return null;
      const urgent = left<=10 && active;
      return html`
        <div style="position:fixed;bottom:88px;right:16px;z-index:50;display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:16px;background:rgba(8,13,26,0.97);border:1px solid #6366F1;box-shadow:0 0 20px rgba(99,102,241,0.25);">
          <div style="width:48px;height:48px;border-radius:12px;background:#162035;border:1px solid #6366F1;display:flex;align-items:center;justify-content:center;">
            <span class=${urgent?'timer-urgent':''} style=${`font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:700;color:${urgent?'#EF4444':'#6366F1'};`}>${ft(left)}</span>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="btn-icon" style="background:#1E2D45;" onClick=${onToggle}>${active ? html`<${IPause} s=${16}/>` : html`<${IPlay} s=${16}/>`}</button>
            <button class="btn-icon" style="background:#1E2D45;" onClick=${onReset}><${IReset} s=${16} c="text-red"/></button>
          </div>
        </div>
      `;
    };

  return FloatingTimer;
};
