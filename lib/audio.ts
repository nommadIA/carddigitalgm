export interface CustomSound {
  id: string;
  name: string;
  description: string;
}

export const NOTIFICATION_SOUNDS: CustomSound[] = [
  { id: "classic_chord", name: "Acorde Moderno (Padrão)", description: "Acorde acústico brilhante de alta frequência" },
  { id: "double_ping", name: "Eco Metálico (Duplo)", description: "Dois toques rápidos simulando metais e obras" },
  { id: "future_asc", name: "Ascendente Digital", description: "Som futurista com varredura rápida de frequência" },
  { id: "tri_tone", name: "Tríade Tecnológica", description: "Sequência de três tons escalados limpos e precisos" },
  { id: "minim", name: "Toque Minimalista", description: "Disparo curtíssimo, limpo e direto nas frequências agudas" },
  { id: "harpa", name: "Harpa Digital", description: "Arpejo melódico ascendente cristalino de 4 notas" },
  { id: "cosmic", name: "Sintetizador Cósmico", description: "Varredura retrô suave simulando radar ou espaço" },
  { id: "zen_bell", name: "Sino Zen", description: "Nota quente e profunda com decaimento longo e meditativo" },
  { id: "crystal", name: "Brilho de Cristal", description: "Tom de altíssimo brilho com ressonância de vidro" },
  { id: "alert_double", name: "Alerta Urgente", description: "Dois bipes expressos de alta sensibilidade para atenção total" },
  { id: "win_11_notif", name: "Notificação Windows", description: "Acorde harmônico e cristalino do Windows 11" },
  { id: "ios_note", name: "Nota de Mensagem (iOS)", description: "Clássico toque sinuoso e imediato do iPhone" },
  { id: "samsung_horizon", name: "Horizonte Suave (Samsung)", description: "Arpejo acústico otimista e elegante" },
  { id: "win_error", name: "Aviso de Sistema (Windows)", description: "Tom de erro/alerta analógico e aveludado" },
  { id: "ios_chime", name: "Trinados de Sino (iOS)", description: "Cascata tripla ultra-cristalina com brilho" },
  { id: "samsung_whisper", name: "Sussurro Moderno (Samsung)", description: "Quem-clique futurista com sweeps ressonantes" },
  { id: "ios_aurora", name: "Aurora Polar (iOS)", description: "Vibrafone envolvente e orgânico com vibrato aveludado" },
  { id: "win_calendar", name: "Compromisso (Windows)", description: "Duplo acorde brilhante para agenda corporativa" },
  { id: "ios_pulse", name: "Pulso Táctil (iOS)", description: "Dois pulsos mecânicos graves representando vibração" },
  { id: "samsung_echo", name: "Eco do Espaço (Samsung)", description: "Sino solitário com delay aéreo e decaimento" }
];

export function playNotificationSound(soundId?: string) {
  try {
    if (localStorage.getItem("gm.notificationsMuted") === "true") return;
    const selected = soundId || localStorage.getItem("gm.notificationSound") || "classic_chord";
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();

    // Master Gain for clean, crisp, compression-free output
    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.85, audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);

    // Helper to create a premium lowpass filter for warm, analog-like feel
    const createFilter = (type: BiquadFilterType = 'lowpass', freq = 2000, Q = 1) => {
      const filter = audioCtx.createBiquadFilter();
      filter.type = type;
      filter.frequency.setValueAtTime(freq, audioCtx.currentTime);
      filter.Q.setValueAtTime(Q, audioCtx.currentTime);
      filter.connect(masterGain);
      return filter;
    };

    const playClassicChord = () => {
      // Warm, expensive Major 9th chime (Eb5 - Bb5 - C6 - G6)
      const freqs = [622.25, 932.33, 1046.50, 1567.98];
      const delayer = [0.0, 0.06, 0.12, 0.18];
      const filter = createFilter('lowpass', 1800, 1.5);
      
      // Dynamic filter sweep
      filter.frequency.exponentialRampToValueAtTime(700, audioCtx.currentTime + 0.82);

      freqs.forEach((f, index) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        // Blend sine and soft triangle for premium glass-analog feel
        osc.type = index % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(f, audioCtx.currentTime + delayer[index]);
        
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime + delayer[index]);
        gainNode.gain.linearRampToValueAtTime(0.55, audioCtx.currentTime + delayer[index] + 0.03);
        // Exponential fade out
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + delayer[index] + 0.7);

        osc.connect(gainNode);
        gainNode.connect(filter);
        
        osc.start(audioCtx.currentTime + delayer[index]);
        osc.stop(audioCtx.currentTime + delayer[index] + 0.8);
      });
    };

    const playDoublePing = () => {
      // Luxury car chime double pulse (crisp metallic bells)
      const times = [0, 0.12];
      const freqs = [1318.51, 1318.51]; // E6 high bar
      
      const filter = createFilter('bandpass', 1320, 4); // sharp resonance

      times.forEach((t, index) => {
        const osc = audioCtx.createOscillator();
        const subOsc = audioCtx.createOscillator(); // Subharmonic for body
        const gainNode = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freqs[index], audioCtx.currentTime + t);
        
        // High harmonic sparkle
        subOsc.type = 'triangle';
        subOsc.frequency.setValueAtTime(freqs[index] * 1.5, audioCtx.currentTime + t);

        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime + t);
        gainNode.gain.linearRampToValueAtTime(0.65, audioCtx.currentTime + t + 0.005);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + t + 0.28);

        osc.connect(gainNode);
        subOsc.connect(gainNode);
        gainNode.connect(filter);

        osc.start(audioCtx.currentTime + t);
        osc.stop(audioCtx.currentTime + t + 0.3);
        subOsc.start(audioCtx.currentTime + t);
        subOsc.stop(audioCtx.currentTime + t + 0.3);
      });
    };

    const playFutureAsc = () => {
      // Smooth digital bubble swell with resonance tracking
      const osc = audioCtx.createOscillator();
      const harmonic = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      const filter = createFilter('lowpass', 600, 2);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1400, audioCtx.currentTime + 0.38);

      harmonic.type = 'sine';
      harmonic.frequency.setValueAtTime(600, audioCtx.currentTime);
      harmonic.frequency.exponentialRampToValueAtTime(2100, audioCtx.currentTime + 0.38);

      filter.frequency.setValueAtTime(500, audioCtx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(2800, audioCtx.currentTime + 0.38);

      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.7, audioCtx.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.25);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.42);

      osc.connect(gainNode);
      harmonic.connect(gainNode);
      gainNode.connect(filter);

      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.45);
      harmonic.start(audioCtx.currentTime);
      harmonic.stop(audioCtx.currentTime + 0.45);
    };

    const playTriTone = () => {
      // Velvet Smart-speaker greeting chime (D5 - A5 - D6)
      const times = [0, 0.09, 0.18];
      const freqs = [587.33, 880.00, 1174.66];
      const filter = createFilter('lowpass', 1500, 1.2);

      times.forEach((t, index) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = 'triangle'; // Soft timber
        osc.frequency.setValueAtTime(freqs[index], audioCtx.currentTime + t);

        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime + t);
        gainNode.gain.linearRampToValueAtTime(0.6, audioCtx.currentTime + t + 0.015);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + t + 0.45);

        osc.connect(gainNode);
        gainNode.connect(filter);

        osc.start(audioCtx.currentTime + t);
        osc.stop(audioCtx.currentTime + t + 0.5);
      });
    };

    const playMinim = () => {
      // Highly aesthetic, organic "wooden tap" or "water drop" click
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      const filter = createFilter('bandpass', 1600, 1.5);

      osc.type = 'sine';
      // Extremely rapid downward pitch modulation mimics a wooden block strike
      osc.frequency.setValueAtTime(2600, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.045);

      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.9, audioCtx.currentTime + 0.004);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.055);

      osc.connect(gainNode);
      gainNode.connect(filter);

      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.06);
    };

    const playHarpa = () => {
      // Heavenly string pluck-arpeggio (Major Pentatonic pluck sequence)
      const times = [0, 0.07, 0.14, 0.21];
      const freqs = [698.46, 880.00, 1046.50, 1318.51]; // F5 - A5 - C6 - E6
      const filter = createFilter('lowpass', 2400, 1.5);

      times.forEach((t, idx) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = 'sine';
        // Add a subtle tactile pitch drop (pluck release) to each string note
        osc.frequency.setValueAtTime(freqs[idx] * 1.05, audioCtx.currentTime + t);
        osc.frequency.exponentialRampToValueAtTime(freqs[idx], audioCtx.currentTime + t + 0.03);

        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime + t);
        gainNode.gain.linearRampToValueAtTime(0.65, audioCtx.currentTime + t + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + t + 0.55);

        osc.connect(gainNode);
        gainNode.connect(filter);

        osc.start(audioCtx.currentTime + t);
        osc.stop(audioCtx.currentTime + t + 0.6);
      });
    };

    const playCosmic = () => {
      // Luxurious sci-fi swoop (ambient hover sweep)
      const osc = audioCtx.createOscillator();
      const sweepOsc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      const filter = createFilter('lowpass', 3000, 4); // high resonance Q
      
      // Sweep the filter cutoff to create the classic cosmic resonant effect
      filter.frequency.setValueAtTime(2500, audioCtx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(350, audioCtx.currentTime + 0.55);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(330, audioCtx.currentTime + 0.55);

      sweepOsc.type = 'sine';
      sweepOsc.frequency.setValueAtTime(660, audioCtx.currentTime);
      sweepOsc.frequency.linearRampToValueAtTime(495, audioCtx.currentTime + 0.55);

      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.6, audioCtx.currentTime + 0.08);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.55);

      osc.connect(gainNode);
      sweepOsc.connect(gainNode);
      gainNode.connect(filter);

      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.58);
      sweepOsc.start(audioCtx.currentTime);
      sweepOsc.stop(audioCtx.currentTime + 0.58);
    };

    const playZenBell = () => {
      // Extremely rich, vibrating Tibetan Temple bowl using multi-layer additive synthesis
      const freqRoots = [261.63, 523.25, 783.99, 1177.66]; // Sub, Core, Harmonic, High sparkle (slightly detuned)
      const gains = [0.45, 0.65, 0.25, 0.12];
      const decays = [1.8, 1.6, 1.1, 0.75];
      
      const filter = createFilter('lowpass', 1100, 1.1);

      freqRoots.forEach((f, idx) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, audioCtx.currentTime);
        
        // Subtle vibrato (9Hz) on core signals for rich, authentic acoustic resonance
        if (idx === 1) {
          const lfo = audioCtx.createOscillator();
          const lfoGain = audioCtx.createGain();
          lfo.type = 'sine';
          lfo.frequency.setValueAtTime(9, audioCtx.currentTime);
          lfoGain.gain.setValueAtTime(3, audioCtx.currentTime); // 3Hz vibrato depth
          lfo.connect(lfoGain);
          lfoGain.connect(osc.frequency);
          lfo.start(audioCtx.currentTime);
          lfo.stop(audioCtx.currentTime + decays[idx]);
        }

        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(gains[idx], audioCtx.currentTime + 0.04);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + decays[idx]);

        osc.connect(gainNode);
        gainNode.connect(filter);
        
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + decays[idx] + 0.1);
      });
    };

    const playCrystal = () => {
      // Glass sparkle / crystal droplet
      // Triggering 3 hyper-fast high-frequency chime pings
      const times = [0, 0.035, 0.07];
      const freqs = [2100, 3150, 4200];
      
      const filter = createFilter('bandpass', 3200, 1.8);

      times.forEach((t, idx) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freqs[idx], audioCtx.currentTime + t);

        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime + t);
        gainNode.gain.linearRampToValueAtTime(0.75, audioCtx.currentTime + t + 0.002);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + t + 0.3);

        osc.connect(gainNode);
        gainNode.connect(filter);

        osc.start(audioCtx.currentTime + t);
        osc.stop(audioCtx.currentTime + t + 0.35);
      });
    };

    const playAlertDouble = () => {
      // Premium Attention Seeker double-beep (modern, direct, non-piercing)
      const times = [0, 0.14];
      const freqs = [920, 920];
      
      // Filter the square/sine mix to soften the edge
      const filter = createFilter('lowpass', 1400, 1.8);

      times.forEach((t, index) => {
        const osc = audioCtx.createOscillator();
        const harmonic = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freqs[index], audioCtx.currentTime + t);
        
        // Add low triangle to give body and weight
        harmonic.type = 'triangle';
        harmonic.frequency.setValueAtTime(freqs[index] / 2, audioCtx.currentTime + t);

        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime + t);
        gainNode.gain.linearRampToValueAtTime(0.75, audioCtx.currentTime + t + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + t + 0.13);

        osc.connect(gainNode);
        harmonic.connect(gainNode);
        gainNode.connect(filter);

        osc.start(audioCtx.currentTime + t);
        osc.stop(audioCtx.currentTime + t + 0.15);
        harmonic.start(audioCtx.currentTime + t);
        harmonic.stop(audioCtx.currentTime + t + 0.15);
      });
    };

    const playWin11Notif = () => {
      // Warm, delicate and cascading modern Windows 11-style notification chime
      const freqs = [554.37, 830.61, 1046.50, 1244.51]; // Db5 - Ab5 - C6 - Eb6
      const delayer = [0.0, 0.05, 0.10, 0.15];
      const filter = createFilter('lowpass', 2200, 1.2);
      
      freqs.forEach((f, idx) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, audioCtx.currentTime + delayer[idx]);
        
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime + delayer[idx]);
        gainNode.gain.linearRampToValueAtTime(0.48, audioCtx.currentTime + delayer[idx] + 0.04);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + delayer[idx] + 0.55);
        
        osc.connect(gainNode);
        gainNode.connect(filter);
        osc.start(audioCtx.currentTime + delayer[idx]);
        osc.stop(audioCtx.currentTime + delayer[idx] + 0.7);
      });
    };

    const playIosNote = () => {
      // Sweet, brief glass chime reminiscent of classic iOS Note
      const filter = createFilter('bandpass', 1318.51, 3);
      const osc = audioCtx.createOscillator();
      const subOsc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1318.51, audioCtx.currentTime); // E6
      
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(2637.02, audioCtx.currentTime); // E7 harmonic

      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.70, audioCtx.currentTime + 0.005);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.3);

      osc.connect(gainNode);
      subOsc.connect(gainNode);
      gainNode.connect(filter);

      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.35);
      subOsc.start(audioCtx.currentTime);
      subOsc.stop(audioCtx.currentTime + 0.35);
    };

    const playSamsungHorizon = () => {
      // Warm rising acoustic pattern
      const freqs = [783.99, 932.33, 1046.50]; // G5 - Bb5 - C6
      const delayer = [0.0, 0.12, 0.24];
      const filter = createFilter('lowpass', 1600, 1);

      freqs.forEach((f, idx) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, audioCtx.currentTime + delayer[idx]);

        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime + delayer[idx]);
        gainNode.gain.linearRampToValueAtTime(0.55, audioCtx.currentTime + delayer[idx] + 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + delayer[idx] + 0.45);

        osc.connect(gainNode);
        gainNode.connect(filter);
        osc.start(audioCtx.currentTime + delayer[idx]);
        osc.stop(audioCtx.currentTime + delayer[idx] + 0.5);
      });
    };

    const playWinError = () => {
      // Modern system warning double-note (lower pitches)
      const filter = createFilter('lowpass', 700, 2);
      const times = [0, 0.08];
      const rootFreqs = [220, 165]; // A3, E3

      times.forEach((t, idx) => {
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator(); // Detune spread
        const gainNode = audioCtx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(rootFreqs[idx], audioCtx.currentTime + t);
        
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(rootFreqs[idx] + 3, audioCtx.currentTime + t); // slightly sharp

        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime + t);
        gainNode.gain.linearRampToValueAtTime(0.65, audioCtx.currentTime + t + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + t + 0.25);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(filter);

        osc1.start(audioCtx.currentTime + t);
        osc1.stop(audioCtx.currentTime + t + 0.3);
        osc2.start(audioCtx.currentTime + t);
        osc2.stop(audioCtx.currentTime + t + 0.3);
      });
    };

    const playIosChime = () => {
      // Classic triplet of cascading glassy chimes
      const freqs = [1567.98, 1760.00, 2093.00]; // G6 - A6 - C7
      const delayer = [0.0, 0.06, 0.12];
      const filter = createFilter('bandpass', 1800, 1.5);

      freqs.forEach((f, idx) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, audioCtx.currentTime + delayer[idx]);

        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime + delayer[idx]);
        gainNode.gain.linearRampToValueAtTime(0.68, audioCtx.currentTime + delayer[idx] + 0.003);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + delayer[idx] + 0.15);

        osc.connect(gainNode);
        gainNode.connect(filter);
        osc.start(audioCtx.currentTime + delayer[idx]);
        osc.stop(audioCtx.currentTime + delayer[idx] + 0.2);
      });
    };

    const playSamsungWhisper = () => {
      // Bubbly futuristic wind whisper transition
      const filter = createFilter('lowpass', 500, 3.5); // High resonance
      const osc = audioCtx.createOscillator();
      const harmonic = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(680, audioCtx.currentTime + 0.22);

      harmonic.type = 'sine';
      harmonic.frequency.setValueAtTime(480, audioCtx.currentTime);
      harmonic.frequency.exponentialRampToValueAtTime(1020, audioCtx.currentTime + 0.22);

      filter.frequency.setValueAtTime(450, audioCtx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(1800, audioCtx.currentTime + 0.22);

      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.70, audioCtx.currentTime + 0.04);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.28);

      osc.connect(gainNode);
      harmonic.connect(gainNode);
      gainNode.connect(filter);

      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.3);
      harmonic.start(audioCtx.currentTime);
      harmonic.stop(audioCtx.currentTime + 0.3);
    };

    const playIosAurora = () => {
      // Organic vibraphone chord with a warm pitch sweep and decay
      const freqs = [783.99, 987.77]; // G5 - B5
      const filter = createFilter('lowpass', 1400, 1);

      freqs.forEach((f) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, audioCtx.currentTime);
        
        // Add subtle pitch vibration
        const vibrato = audioCtx.createOscillator();
        const vibratoGain = audioCtx.createGain();
        vibrato.frequency.setValueAtTime(6, audioCtx.currentTime); // 6Hz
        vibratoGain.gain.setValueAtTime(4, audioCtx.currentTime);
        vibrato.connect(vibratoGain);
        vibratoGain.connect(osc.frequency);

        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.55, audioCtx.currentTime + 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.2);

        osc.connect(gainNode);
        gainNode.connect(filter);
        
        vibrato.start(audioCtx.currentTime);
        osc.start(audioCtx.currentTime);
        
        vibrato.stop(audioCtx.currentTime + 1.2);
        osc.stop(audioCtx.currentTime + 1.3);
      });
    };

    const playWinCalendar = () => {
      // Optimistic 2-tone business agenda chime
      const filter = createFilter('lowpass', 2000, 1);
      const times = [0, 0.15];
      const chord1 = [659.25, 987.77]; // E5, B5
      const chord2 = [830.61, 1318.51]; // G#5, E6

      times.forEach((t, step) => {
        const notes = step === 0 ? chord1 : chord2;
        notes.forEach((f) => {
          const osc = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, audioCtx.currentTime + t);

          gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
          gainNode.gain.setValueAtTime(0, audioCtx.currentTime + t);
          gainNode.gain.linearRampToValueAtTime(0.40, audioCtx.currentTime + t + 0.02);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + t + 0.45);

          osc.connect(gainNode);
          gainNode.connect(filter);
          osc.start(audioCtx.currentTime + t);
          osc.stop(audioCtx.currentTime + t + 0.5);
        });
      });
    };

    const playIosPulse = () => {
      // Tactile, low frequency mechanic click/haptic response
      const filter = createFilter('lowpass', 400, 1.5);
      const times = [0, 0.11];

      times.forEach((t) => {
        const osc = audioCtx.createOscillator();
        const sub = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, audioCtx.currentTime + t);
        
        sub.type = 'triangle';
        sub.frequency.setValueAtTime(70, audioCtx.currentTime + t);

        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime + t);
        gainNode.gain.linearRampToValueAtTime(0.85, audioCtx.currentTime + t + 0.003);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + t + 0.045);

        osc.connect(gainNode);
        sub.connect(gainNode);
        gainNode.connect(filter);

        osc.start(audioCtx.currentTime + t);
        osc.stop(audioCtx.currentTime + t + 0.06);
        sub.start(audioCtx.currentTime + t);
        sub.stop(audioCtx.currentTime + t + 0.06);
      });
    };

    const playSamsungEcho = () => {
      // Pure chime with rhythmic space delay echoes
      const baseFreq = 1174.66; // D6
      const delayTimes = [0, 0.14, 0.28, 0.42];
      const gains = [0.65, 0.32, 0.16, 0.08];
      const filter = createFilter('bandpass', 1175, 2.5);

      delayTimes.forEach((t, idx) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, audioCtx.currentTime + t);

        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime + t);
        gainNode.gain.linearRampToValueAtTime(gains[idx], audioCtx.currentTime + t + 0.005);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + t + 0.22);

        osc.connect(gainNode);
        gainNode.connect(filter);
        osc.start(audioCtx.currentTime + t);
        osc.stop(audioCtx.currentTime + t + 0.3);
      });
    };

    switch (selected) {
      case "classic_chord": playClassicChord(); break;
      case "double_ping": playDoublePing(); break;
      case "future_asc": playFutureAsc(); break;
      case "tri_tone": playTriTone(); break;
      case "minim": playMinim(); break;
      case "harpa": playHarpa(); break;
      case "cosmic": playCosmic(); break;
      case "zen_bell": playZenBell(); break;
      case "crystal": playCrystal(); break;
      case "alert_double": playAlertDouble(); break;
      case "win_11_notif": playWin11Notif(); break;
      case "ios_note": playIosNote(); break;
      case "samsung_horizon": playSamsungHorizon(); break;
      case "win_error": playWinError(); break;
      case "ios_chime": playIosChime(); break;
      case "samsung_whisper": playSamsungWhisper(); break;
      case "ios_aurora": playIosAurora(); break;
      case "win_calendar": playWinCalendar(); break;
      case "ios_pulse": playIosPulse(); break;
      case "samsung_echo": playSamsungEcho(); break;
      default: playClassicChord(); break;
    }

  } catch (error) {
    console.error('Audio play failed:', error);
  }
}
