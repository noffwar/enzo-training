

export const createGymPanel = (deps) => {
  const {
    html, useState, useRef, IClock, IDumb, ICheck, SectionAccordion,
    fn, pn, ft, resolveMuscleInfo
  } = deps;
  
  const GymPanel = ({session, tracker:t, onSetComplete, onInput, onHabit, onApplyOverload, onCompleteSession, onResetSessionChecks}) => {
    const [open,setOpen] = useState(true);
    if(!session||session.length===0) return html`
      <${SectionAccordion} icon=${html`<${IDumb} s=${18}/>`} title="Rutina Gimnasio" isOpen=${true} onToggle=${()=>{}}>
        <div style="padding:16px;text-align:center;color:#64748B;font-size:12px;background:rgba(10,15,30,0.5);border:1px solid #1E2D45;border-radius:10px;margin-bottom:10px;">
          No hay rutina asignada para hoy.
        </div>
      <//>
    `;
    const safeT = { gymStartTime:'', gymEndTime:'', ...t };
    const totalSets = session.reduce((acc, ex) => acc + (ex.sets?.length || 0), 0);
    const completedSets = session.reduce((acc, ex) => acc + ex.sets.filter(s => s.completed).length, 0);
    const completedExercises = session.filter(ex => ex.sets.length > 0 && ex.sets.every(s => s.completed)).length;
    const progressPct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

    // Detecta ejercicios donde se superaron las reps objetivo en al menos 1 serie
    const overloadCandidates = session.filter(ex =>
      ex.sets.some(s => s.completed && parseInt(s.reps) > parseInt(s.idealReps||s.reps))
    );

    return html`
      <${SectionAccordion} icon=${html`<${IDumb} s=${18}/>`} title="Rutina Gimnasio" isOpen=${open} onToggle=${()=>setOpen(!open)}>
        <!-- Horarios sesión -->
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;background:rgba(10,15,30,0.5);border:1px solid #1E2D45;margin-bottom:12px;">
          <${IClock} s=${16} c=""/>
          <span style="font-size:13px;color:#94a3b8;">Sesión:</span>
          <div style="display:flex;gap:12px;flex-wrap:wrap;">
            ${[['gymStartTime','Inicio'],['gymEndTime','Fin']].map(([k,l]) => html`
              <div style="display:flex;align-items:center;gap:6px;">
                <label style="font-size:10px;text-transform:uppercase;color:#64748b;">${l}</label>
                <input type="time" value=${safeT[k]||''} onInput=${e=>onHabit(k,e.target.value)} class="inp-sm"/>
              </div>
            `)}
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px;padding:10px 12px;border-radius:10px;background:rgba(10,15,30,0.5);border:1px solid #1E2D45;margin-bottom:12px;">
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
            ${[
              { label:'Series', value:`${completedSets}/${totalSets}`, color:'#10B981' },
              { label:'Ejercicios', value:`${completedExercises}/${session.length}`, color:'#6366F1' },
              { label:'Progreso', value:`${progressPct}%`, color:'#F59E0B' }
            ].map(stat => html`
              <div style="padding:8px;border-radius:8px;background:#0F1729;border:1px solid #1E2D45;text-align:center;">
                <p style="margin:0;font-size:9px;text-transform:uppercase;color:#64748b;">${stat.label}</p>
                <p style="margin:2px 0 0;font-size:15px;font-weight:700;font-family:'JetBrains Mono',monospace;color:${stat.color};">${stat.value}</p>
              </div>
            `)}
          </div>
          <div style="height:8px;border-radius:999px;background:#0F1729;border:1px solid #1E2D45;overflow:hidden;">
            <div style=${`width:${progressPct}%;height:100%;background:linear-gradient(90deg,#10B981,#6366F1);transition:width 0.3s ease;`}></div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            <button onClick=${()=>onCompleteSession&&onCompleteSession()}
              style="padding:7px 12px;border-radius:8px;border:1px solid rgba(16,185,129,0.35);background:rgba(16,185,129,0.12);color:#86EFAC;font-size:11px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
              COMPLETAR SESION
            </button>
            <button onClick=${()=>onResetSessionChecks&&onResetSessionChecks()}
              style="padding:7px 12px;border-radius:8px;border:1px solid rgba(239,68,68,0.28);background:rgba(239,68,68,0.10);color:#FCA5A5;font-size:11px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
              REINICIAR CHECKS
            </button>
          </div>
        </div>

        <!-- Ejercicios -->
        ${session.map((ex,ei) => html`
          <div style="border-radius:10px;overflow:hidden;border:1px solid #1E2D45;margin-bottom:10px;">
            <div style="padding:8px 12px;background:rgba(22,32,53,0.7);border-left:3px solid var(--green);">
              <p style="margin:0;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:15px;color:white;letter-spacing:0.04em;">${ei+1}. ${ex.name}</p>
              ${resolveMuscleInfo(ex.name) && html`
                <p style="margin:2px 0 0;font-size:10px;color:#475569;">
                  ${resolveMuscleInfo(ex.name).direct.join(', ')}
                  ${resolveMuscleInfo(ex.name).indirect.length>0 ? ' · '+resolveMuscleInfo(ex.name).indirect.join(', ') : ''}
                </p>
              `}
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style="text-align:center;width:28px;">#</th>
                    <th>Reps</th><th>Peso</th><th>RIR</th><th>Pausa</th>
                    <th style="text-align:center;">✓</th>
                  </tr>
                </thead>
                <tbody>
                  ${ex.sets.map((set,si) => html`
                    <tr class=${set.completed?'set-row-done':''}>
                      <td style="text-align:center;font-size:11px;font-family:'JetBrains Mono',monospace;color:#475569;">${si+1}</td>
                      <td><input class="inp-xs" style="width:52px;" value=${set.reps} onInput=${e=>onInput(ei,si,'reps',e.target.value)}/></td>
                      <td><input class="inp-xs" style="width:60px;" value=${set.weight} onInput=${e=>onInput(ei,si,'weight',e.target.value)}/></td>
                      <td><span class=${`tag-rir ${set.rir.includes('Fallo')?'fallo':''}`}>${set.rir}</span></td>
                      <td><span style="font-size:11px;color:#64748b;font-family:'JetBrains Mono',monospace;white-space:nowrap;">${set.restStr}</span></td>
                      <td style="text-align:center;">
                        <button class="check-btn" onClick=${()=>onSetComplete(ei,si,set.restSecs)}
                          style=${set.completed?'background:#10B981;box-shadow:0 0 10px rgba(16,185,129,0.4);':'background:#162035;border:1px solid #1E2D45;'}>
                          <${ICheck} s=${14} c=""/>
                        </button>
                      </td>
                    </tr>
                    ${set.completed && html`
                      <tr style="background:rgba(10,15,30,0.3);">
                        <td colspan="6" style="padding:6px 8px;">
                          <div style="display:flex;justify-content:space-between;font-size:9px;color:#64748b;margin-bottom:3px;">
                            <span>RPE: ${set.rpe||7}</span><span>Esfuerzo percibido</span>
                          </div>
                          <input type="range" min="1" max="10" class="rpe-slider"
                            value=${set.rpe||7}
                            onInput=${e=>onInput(ei,si,'rpe',parseInt(e.target.value))}/>
                          ${(parseInt(set.reps) > parseInt(set.idealReps||set.reps)) && html`
                            <p style="margin:4px 0 0;font-size:10px;color:#10B981;">🚀 Sugerencia: +2,5kg la próxima semana</p>
                          `}
                        </td>
                      </tr>
                    `}
                  `)}
                </tbody>
              </table>
            </div>
          </div>
        `)}

        <!-- Sobrecarga progresiva -->
        ${overloadCandidates.length > 0 && html`
          <div style="padding:10px 12px;border-radius:8px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.3);margin-bottom:8px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
              <div>
                <p style="margin:0;font-size:12px;font-weight:700;color:#10B981;">🚀 Sobrecarga Disponible</p>
                <p style="margin:2px 0 0;font-size:10px;color:#64748b;">
                  ${overloadCandidates.map(ex=>ex.name.split(' ')[0]).join(', ')} — superaste las reps objetivo
                </p>
              </div>
              <button onClick=${()=>onApplyOverload&&onApplyOverload(overloadCandidates)}
                style="flex-shrink:0;padding:7px 14px;border-radius:8px;border:none;background:#10B981;color:#080D1A;font-weight:700;font-family:'Barlow Condensed',sans-serif;font-size:12px;cursor:pointer;letter-spacing:0.05em;white-space:nowrap;">
                +2,5kg aplicar
              </button>
            </div>
          </div>
        `}

        <!-- Notas del entrenamiento -->
        <textarea
          placeholder="Notas de la sesión (sensaciones, dolores, PRs...)"
          value=${t.gymNotes||''}
          onInput=${e=>onHabit('gymNotes',e.target.value)}
          style="width:100%;background:#0F1729;border:1px solid #1E2D45;border-radius:8px;padding:10px;font-size:13px;color:#cbd5e1;font-family:'Barlow',sans-serif;resize:vertical;min-height:70px;margin-top:4px;"></textarea>
      <//>
    `;
  };

  return GymPanel;
};

// ─── Gym Logic Helpers ──────────────────────────────────────

export const muscleMap = {
  "Press banca plano":{direct:["Pecho"],indirect:["Hombros","Tríceps"]},
  "Remo 45° con barra":{direct:["Espalda"],indirect:["Bíceps","Lumbares"]},
  "Press militar Smith":{direct:["Hombros"],indirect:["Tríceps"]},
  "Jalón Dorsal Isolateral":{direct:["Espalda"],indirect:["Bíceps"]},
  "Vuelo lateral hombro":{direct:["Hombros"],indirect:[]},
  "Encogimientos trapecio":{direct:["Trapecio"],indirect:[]},
  "Tríceps polea barra":{direct:["Tríceps"],indirect:[]},
  "Sentadilla Smith":{direct:["Cuádriceps"],indirect:["Glúteos","Femorales","Lumbares"]},
  "Peso muerto rumano":{direct:["Femorales","Glúteos"],indirect:["Lumbares"]},
  "Extensión cuádriceps":{direct:["Cuádriceps"],indirect:[]},
  "Aductores máquina":{direct:["Aductores"],indirect:[]},
  "Gemelos de pie":{direct:["Pantorrillas"],indirect:[]},
  "Soleos banco":{direct:["Pantorrillas"],indirect:[]},
  "Dominadas prono/neutras":{direct:["Espalda"],indirect:["Bíceps"]},
  "Press inclinado mancuernas":{direct:["Pecho"],indirect:["Hombros","Tríceps"]},
  "Remo polea bilateral":{direct:["Espalda"],indirect:["Bíceps"]},
  "Mariposa pectoral":{direct:["Pecho"],indirect:[]},
  "Facepull polea alta":{direct:["Hombros"],indirect:["Trapecio","Espalda"]},
  "Curl mancuernas bíceps":{direct:["Bíceps"],indirect:[]},
  "Tríceps polea soga":{direct:["Tríceps"],indirect:[]},
  "Hip Thrust con Barra":{direct:["Glúteos"],indirect:["Femorales"]},
  "Sentadilla Búlgara Smith":{direct:["Cuádriceps","Glúteos"],indirect:[]},
  "Curl femoral":{direct:["Femorales"],indirect:[]},
  "Extensión cuádr. unilateral":{direct:["Cuádriceps"],indirect:[]},
  "Extensiones lumbares":{direct:["Lumbares"],indirect:["Glúteos","Femorales"]},
  "Abductores máquina":{direct:["Glúteos"],indirect:["Aductores"]},
  "Press militar en Smith":{direct:["Hombros"],indirect:["Triceps"]},
  "Maquina de Jalon Dorsal Isolateral":{direct:["Espalda"],indirect:["Biceps"]},
  "Encogimientos de Trapecio":{direct:["Trapecio"],indirect:[]},
  "Cruces en polea alta":{direct:["Pecho"],indirect:["Hombros"]},
  "Cruces invertidos en polea":{direct:["Hombros"],indirect:["Trapecio","Espalda"]},
  "Push-up Plus":{direct:["Hombros"],indirect:["Pecho","Core"]},
  "Peso muerto mancuernas (Rumano)":{direct:["Femorales","Gluteos"],indirect:["Lumbares"]},
  "Maquina cuadriceps (Extensiones Bilaterales)":{direct:["Cuadriceps"],indirect:[]},
  "Curl femoral tumbado":{direct:["Femorales"],indirect:[]},
  "Aductores maquina":{direct:["Aductores"],indirect:[]},
  "Elevacion de Gemelos de pie":{direct:["Pantorrillas"],indirect:[]},
  "Curl Biceps Martillo mancuernas":{direct:["Biceps"],indirect:[]},
  "Triceps polea con barra":{direct:["Triceps"],indirect:[]},
  "Crunch en polea alta":{direct:["Core"],indirect:[]},
  "Pallof Press":{direct:["Core"],indirect:[]},
  "Elevaciones de Tibial":{direct:["Pantorrillas"],indirect:[]},
  "Mancuernas biceps supino":{direct:["Biceps"],indirect:[]},
  "Dominadas prono y neutras":{direct:["Espalda"],indirect:["Biceps"]},
  "Remo sentado en maquina unilateral":{direct:["Espalda"],indirect:["Biceps"]},
  "Mariposa (Pectoral)":{direct:["Pecho"],indirect:[]},
  "Facepull en Polea Alta":{direct:["Hombros"],indirect:["Trapecio","Espalda"]},
  "Hombro vuelo lateral en polea baja":{direct:["Hombros"],indirect:[]},
  "Hip Thrust con Maquina":{direct:["Gluteos"],indirect:["Femorales"]},
  "Sentadilla Bulgara en Smith":{direct:["Cuadriceps","Gluteos"],indirect:[]},
  "Curl femoral sentado":{direct:["Femorales"],indirect:[]},
  "Maquina cuadriceps unilateral":{direct:["Cuadriceps"],indirect:[]},
  "Abductores maquina":{direct:["Gluteos"],indirect:["Aductores"]},
  "Elevacion de Gemelos (Prensa)":{direct:["Pantorrillas"],indirect:[]},
  "Extensiones Lumbares en Banco Romano":{direct:["Lumbares"],indirect:["Gluteos","Femorales"]},
  "Mancuernas biceps":{direct:["Biceps"],indirect:[]},
  "Triceps polea soga":{direct:["Triceps"],indirect:[]},
  "Elevacion de rodillas colgado":{direct:["Core"],indirect:[]}
};

export const normalizeExerciseKey = (text='') =>
  String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();

export const resolveMuscleInfo = (exerciseName='') => {
  if(muscleMap[exerciseName]) return muscleMap[exerciseName];
  const target = normalizeExerciseKey(exerciseName);
  if(!target) return null;
  for (const [name, info] of Object.entries(muscleMap)) {
    const key = normalizeExerciseKey(name);
    if(key === target || key.includes(target) || target.includes(key)) return info;
  }
  return null;
};

export const MUSCLE_ALIASES = {
  'Tríceps': 'Triceps',
  'Bíceps': 'Biceps',
  'Cuádriceps': 'Cuadriceps',
  'Glúteos': 'Gluteos',
  'Abdomen': 'Core'
};

export const canonicalMuscleName = (muscle='') => {
  const raw = String(muscle || '').trim();
  if(!raw) return '';
  const normalized = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return MUSCLE_ALIASES[raw] || MUSCLE_ALIASES[normalized] || normalized;
};

export const DELOAD_REP_OVERRIDES = {
  "1": {
    "Press banca plano": ["7","6"],
    "Remo 45° con barra": ["9","7"],
    "Press militar en Smith": ["8","6"],
    "Maquina de Jalon Dorsal Isolateral": ["9","7"],
    "Hombro vuelo lateral": ["10","8"],
    "Encogimientos de Trapecio": ["10","8"],
    "Cruces en polea alta": ["10","8"],
    "Cruces invertidos en polea": ["10","8"],
    "Push-up Plus": ["8","8"]
  },
  "2": {
    "Sentadilla Smith": ["8","6"],
    "Peso muerto mancuernas (Rumano)": ["6","5"],
    "Maquina cuadriceps (Extensiones Bilaterales)": ["10","8"],
    "Curl femoral tumbado": ["10","8"],
    "Aductores maquina": ["10","8"],
    "Elevacion de Gemelos de pie": ["Metodo 5-5-5","Metodo 5-5-5"],
    "Soleos banco": ["14","12"],
    "Curl Biceps Martillo mancuernas": ["8","6"],
    "Triceps polea con barra": ["10","8"],
    "Crunch en polea alta": ["10","8"],
    "Pallof Press": ["10","8"],
    "Elevaciones de Tibial": ["10","10"]
  },
  "4": {
    "Dominadas prono y neutras": ["6","5"],
    "Press inclinado mancuernas": ["8","6"],
    "Remo sentado en maquina unilateral": ["8","6"],
    "Mariposa (Pectoral)": ["10","8"],
    "Facepull en Polea Alta": ["10","8"],
    "Hombro vuelo lateral en polea baja": ["8","8"],
    "Push-up Plus": ["8","8"]
  },
  "5": {
    "Hip Thrust con Maquina": ["8","7"],
    "Sentadilla Bulgara en Smith": ["8","6"],
    "Curl femoral sentado": ["6","8"],
    "Maquina cuadriceps unilateral": ["10","8"],
    "Abductores maquina": ["10","8"],
    "Elevacion de Gemelos (Prensa)": ["10","8"],
    "Extensiones Lumbares en Banco Romano": ["10","8"],
    "Mancuernas biceps": ["10","6"],
    "Triceps polea soga": ["10","8"],
    "Elevacion de rodillas colgado": ["8","10"],
    "Elevaciones de Tibial": ["10","10"]
  }
};

export const buildDeloadSets = (routineId, exercise) => {
  const overrides = DELOAD_REP_OVERRIDES[routineId] || {};
  const repPair = overrides[exercise.name];
  const sourceSets = Array.isArray(exercise.sets) ? exercise.sets : [];
  const baseSets = sourceSets.slice(0, 2);
  if(baseSets.length === 0) return [];
  const result = baseSets.map((set, idx) => ({
    ...set,
    reps: repPair?.[idx] || set.reps,
    rir: '4-5'
  }));
  return result;
};

export const getRoutineForWeek = (routineId, routineData, weekKey, isDeloadWeek) => {
  const baseRoutine = routineData?.[routineId];
  if(!baseRoutine) return null;
  if(!isDeloadWeek(weekKey)) return baseRoutine;
  return {
    ...baseRoutine,
    name: `${baseRoutine.name} · Descarga`,
    description: `${baseRoutine.description} · Semana de descarga`,
    exercises: baseRoutine.exercises.map(ex => ({
      ...ex,
      sets: buildDeloadSets(routineId, ex)
    }))
  };
};

export const buildPlanDayMapping = (mode='4', weekKey='', isGymClosedDate, getDayDate) => {
  const DAY_KEYS = ['1', '2', '3', '4', '5', '6', '0'];
  const split = String(mode) === '5' ? ['1','2','3','4','5'] : ['1','2','4','5'];
  const mapping = { "1":"", "2":"", "3":"", "4":"", "5":"", "6":"", "0":"", _planMode: String(mode) };
  let consecutive = 0;
  DAY_KEYS.forEach(key => {
    const closed = weekKey ? isGymClosedDate(getDayDate(weekKey, parseInt(key, 10))) : key === '0';
    if(closed) { consecutive = 0; return; }
    if(String(mode) === '4' && consecutive >= 2) { consecutive = 0; return; }
    const nextRoutine = split.shift() || '';
    if(nextRoutine) {
      mapping[key] = nextRoutine;
      consecutive += 1;
    } else {
      consecutive = 0;
    }
  });
  return mapping;
};

export const getRoutineAssignments = (weekData) => {
  const DAY_KEYS = ['1', '2', '3', '4', '5', '6', '0'];
  return DAY_KEYS.reduce((acc, key) => {
    const value = weekData?.dayMapping?.[key];
    acc[key] = typeof value === 'string' ? value : '';
    return acc;
  }, {});
};

export const didTrainDay = (weekData, dayKey) => {
  const session = weekData?.sessions?.[dayKey] || [];
  const hasCompletedSet = session.some(ex => (ex?.sets || []).some(set => !!set.completed));
  const trackerDay = weekData?.tracker?.[dayKey] || {};
  return hasCompletedSet || !!trackerDay.gymStartTime || !!trackerDay.gymEndTime;
};
