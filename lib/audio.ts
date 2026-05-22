export interface CustomSound {
  id: string;
  name: string;
  description: string;
}

export const NOTIFICATION_SOUNDS: CustomSound[] = [
  { id: "classic_chord", name: "Acorde Moderno (Padrão)", description: "Acorde acústico brilhante trifônico de alta frequência" },
  { id: "double_ping", name: "Eco Metálico (Duplo)", description: "Dois toques rápidos simulando metais e obras" },
  { id: "future_asc", name: "Ascendente Digital", description: "Som futurista com varredura rápida de frequência" },
  { id: "tri_tone", name: "Tríade Tecnológica", description: "Sequência de três tons escalados limpos e precisos" },
  { id: "minim", name: "Toque Minimalista", description: "Disparo curtíssimo, limpo e direto nas frequências agudas" },
  { id: "harpa", name: "Harpa Digital", description: "Arpejo melódico ascendente cristalino de 4 notas" },
  { id: "cosmic", name: "Sintetizador Cósmico", description: "Varredura retrô suave simulando radar ou espaço" },
  { id: "zen_bell", name: "Sino Zen", description: "Nota quente e profunda com decaimento longo e meditativo" },
  { id: "crystal", name: "Brilho de Cristal", description: "Tom de altíssimo brilho com ressonância de vidro" },
  { id: "alert_double", name: "Alerta Urgente", description: "Dois bipes expressos de alta sensibilidade para atenção total" }
];

export function playNotificationSound(soundId?: string) {
  try {
    const selected = soundId || localStorage.getItem("gm.notificationSound") || "classic_chord";
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();

    // Master Gain para volume limpo, amplificado e sem distorção
    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.95, audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);

    const playClassicChord = () => {
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const osc3 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      const gain2 = audioCtx.createGain();
      const gain3 = audioCtx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(783.99, audioCtx.currentTime); // G5 

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, audioCtx.currentTime + 0.08); // B5

      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(1318.51, audioCtx.currentTime + 0.16); // E6

      gain1.gain.setValueAtTime(0, audioCtx.currentTime);
      gain1.gain.linearRampToValueAtTime(0.75, audioCtx.currentTime + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);

      gain2.gain.setValueAtTime(0, audioCtx.currentTime);
      gain2.gain.setValueAtTime(0, audioCtx.currentTime + 0.08);
      gain2.gain.linearRampToValueAtTime(0.75, audioCtx.currentTime + 0.10);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.50);

      gain3.gain.setValueAtTime(0, audioCtx.currentTime);
      gain3.gain.setValueAtTime(0, audioCtx.currentTime + 0.16);
      gain3.gain.linearRampToValueAtTime(0.85, audioCtx.currentTime + 0.18);
      gain3.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.75);

      osc1.connect(gain1); gain1.connect(masterGain);
      osc2.connect(gain2); gain2.connect(masterGain);
      osc3.connect(gain3); gain3.connect(masterGain);

      osc1.start(audioCtx.currentTime); osc1.stop(audioCtx.currentTime + 0.4);
      osc2.start(audioCtx.currentTime + 0.08); osc2.stop(audioCtx.currentTime + 0.6);
      osc3.start(audioCtx.currentTime + 0.16); osc3.stop(audioCtx.currentTime + 0.85);
    };

    const playDoublePing = () => {
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      const gain2 = audioCtx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(1200, audioCtx.currentTime);
      gain1.gain.setValueAtTime(0, audioCtx.currentTime);
      gain1.gain.linearRampToValueAtTime(0.8, audioCtx.currentTime + 0.01);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.08);
      gain2.gain.setValueAtTime(0, audioCtx.currentTime);
      gain2.gain.setValueAtTime(0, audioCtx.currentTime + 0.08);
      gain2.gain.linearRampToValueAtTime(0.8, audioCtx.currentTime + 0.09);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.28);

      osc1.connect(gain1); gain1.connect(masterGain);
      osc2.connect(gain2); gain2.connect(masterGain);

      osc1.start(audioCtx.currentTime); osc1.stop(audioCtx.currentTime + 0.21);
      osc2.start(audioCtx.currentTime + 0.08); osc2.stop(audioCtx.currentTime + 0.3);
    };

    const playFutureAsc = () => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.35);

      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.8, audioCtx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);

      osc.connect(gain); gain.connect(masterGain);
      osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.4);
    };

    const playTriTone = () => {
      const times = [0, 0.08, 0.16];
      const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5

      times.forEach((t, index) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freqs[index], audioCtx.currentTime + t);

        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.setValueAtTime(0, audioCtx.currentTime + t);
        gain.gain.linearRampToValueAtTime(0.7, audioCtx.currentTime + t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + t + 0.25);

        osc.connect(gain); gain.connect(masterGain);
        osc.start(audioCtx.currentTime + t);
        osc.stop(audioCtx.currentTime + t + 0.26);
      });
    };

    const playMinim = () => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1500, audioCtx.currentTime);
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.9, audioCtx.currentTime + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);

      osc.connect(gain); gain.connect(masterGain);
      osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.09);
    };

    const playHarpa = () => {
      const times = [0, 0.06, 0.12, 0.18];
      const freqs = [392.00, 523.25, 659.25, 1046.50]; // G4, C5, E5, C6

      times.forEach((t, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freqs[idx], audioCtx.currentTime + t);

        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.setValueAtTime(0, audioCtx.currentTime + t);
        gain.gain.linearRampToValueAtTime(0.65, audioCtx.currentTime + t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + t + 0.45);

        osc.connect(gain); gain.connect(masterGain);
        osc.start(audioCtx.currentTime + t);
        osc.stop(audioCtx.currentTime + t + 0.5);
      });
    };

    const playCosmic = () => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(500, audioCtx.currentTime + 0.5);

      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.7, audioCtx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

      osc.connect(gain); gain.connect(masterGain);
      osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.5);
    };

    const playZenBell = () => {
      const osc = audioCtx.createOscillator();
      const harm = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const gainHarm = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5

      harm.type = 'triangle';
      harm.frequency.setValueAtTime(1046.50, audioCtx.currentTime); // Harmônico C6

      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.8, audioCtx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);

      gainHarm.gain.setValueAtTime(0, audioCtx.currentTime);
      gainHarm.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + 0.03);
      gainHarm.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);

      osc.connect(gain); gain.connect(masterGain);
      harm.connect(gainHarm); gainHarm.connect(masterGain);

      osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 1.3);
      harm.start(audioCtx.currentTime); harm.stop(audioCtx.currentTime + 0.65);
    };

    const playCrystal = () => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, audioCtx.currentTime);
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.8, audioCtx.currentTime + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);

      osc.connect(gain); gain.connect(masterGain);
      osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.36);
    };

    const playAlertDouble = () => {
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      const gain2 = audioCtx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain1.gain.setValueAtTime(0, audioCtx.currentTime);
      gain1.gain.linearRampToValueAtTime(0.85, audioCtx.currentTime + 0.01);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12);
      gain2.gain.setValueAtTime(0, audioCtx.currentTime);
      gain2.gain.setValueAtTime(0, audioCtx.currentTime + 0.12);
      gain2.gain.linearRampToValueAtTime(0.85, audioCtx.currentTime + 0.13);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.27);

      osc1.connect(gain1); gain1.connect(masterGain);
      osc2.connect(gain2); gain2.connect(masterGain);

      osc1.start(audioCtx.currentTime); osc1.stop(audioCtx.currentTime + 0.16);
      osc2.start(audioCtx.currentTime + 0.12); osc2.stop(audioCtx.currentTime + 0.28);
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
      default: playClassicChord(); break;
    }

  } catch (error) {
    console.error('Audio play failed:', error);
  }
}
