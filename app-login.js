export const createLoginView = (deps) => {
  const { html, useState, supabase, Card } = deps;
  
const LoginView = () => {
      const [email,  setEmail]  = useState('');
      const [status, setStatus] = useState('idle'); // idle | sending | sent | error
      const [msg,    setMsg]    = useState('');

      const handleLogin = async () => {
        if(!email.trim()) return;
        setStatus('sending');
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: window.location.origin + window.location.pathname }
        });
        if(error) { setStatus('error'); setMsg(error.message); }
        else       { setStatus('sent'); setMsg('✓ Revisá tu email — el link expira en 1 hora.'); }
      };

      return html`
        <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#080D1A;">
          <div style="width:100%;max-width:360px;">
            <div style="text-align:center;margin-bottom:32px;">
              <p style="font-size:28px;font-family:'Barlow Condensed',sans-serif;font-weight:800;letter-spacing:0.1em;color:white;margin:0;">
                ENZO <span style="color:#10B981;">TRAINING</span>
              </p>
              <p style="color:#64748b;font-size:13px;margin:8px 0 0;">Ingresá con tu email para sincronizar entre dispositivos</p>
            </div>

            ${status === 'sent' ? html`
              <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:12px;padding:20px;text-align:center;">
                <p style="font-size:32px;margin:0 0 8px;">📧</p>
                <p style="color:#10B981;font-size:14px;margin:0;">${msg}</p>
              </div>
            ` : html`
              <div style="display:flex;flex-direction:column;gap:12px;">
                <input
                  type="email"
                  placeholder="tu@email.com"
                  value=${email}
                  onInput=${e=>setEmail(e.target.value)}
                  onKeyDown=${e=>e.key==='Enter'&&handleLogin()}
                  style="width:100%;box-sizing:border-box;background:#0F1729;border:1px solid #2A3F5F;border-radius:10px;padding:14px 16px;font-size:16px;color:white;outline:none;"
                />
                <button onClick=${handleLogin} disabled=${status==='sending'}
                  style="width:100%;padding:14px;border-radius:10px;border:none;background:#10B981;color:white;font-size:14px;font-weight:700;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.08em;cursor:pointer;opacity:${status==='sending'?'0.7':'1'};">
                  ${status==='sending' ? 'ENVIANDO...' : 'ENVIAR MAGIC LINK'}
                </button>
                ${status==='error' && html`<p style="color:#EF4444;font-size:12px;text-align:center;margin:0;">${msg}</p>`}
              </div>
            `}
          </div>
        </div>
      `;
    };

  return LoginView;
};
