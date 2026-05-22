export function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    
    // Create an oscillator for a pleasant chime (resembling Windows notification)
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode1 = audioCtx.createGain();
    const gainNode2 = audioCtx.createGain();
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(830.61, audioCtx.currentTime + 0.1); // G#5

    // Envelope for first tone
    gainNode1.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode1.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
    gainNode1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

    // Envelope for second tone
    gainNode2.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode2.gain.setValueAtTime(0, audioCtx.currentTime + 0.1);
    gainNode2.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.12);
    gainNode2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
    
    osc1.connect(gainNode1);
    gainNode1.connect(audioCtx.destination);
    
    osc2.connect(gainNode2);
    gainNode2.connect(audioCtx.destination);
    
    osc1.start(audioCtx.currentTime);
    osc1.stop(audioCtx.currentTime + 0.3);

    osc2.start(audioCtx.currentTime + 0.1);
    osc2.stop(audioCtx.currentTime + 0.6);

  } catch (error) {
    console.error('Audio play failed:', error);
  }
}
