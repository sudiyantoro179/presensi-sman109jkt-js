// Audio service for Web Audio chimes and Gemini TTS / SpeechSynthesis

let isMuted = false;
let selectedVoice = 'Kore'; // Kore, Puck, Zephyr, Fenrir, Charon

export const setMuted = (muted: boolean) => {
  isMuted = muted;
  try {
    localStorage.setItem('sman109_audio_muted', JSON.stringify(muted));
  } catch {}
};

export const getMuted = (): boolean => {
  try {
    const val = localStorage.getItem('sman109_audio_muted');
    if (val !== null) isMuted = JSON.parse(val);
  } catch {}
  return isMuted;
};

export const setSelectedVoice = (voice: string) => {
  selectedVoice = voice;
  try {
    localStorage.setItem('sman109_voice_persona', voice);
  } catch {}
};

export const getSelectedVoice = (): string => {
  try {
    const val = localStorage.getItem('sman109_voice_persona');
    if (val) selectedVoice = val;
  } catch {}
  return selectedVoice;
};

// Play Web Audio synthetic chimes
export const playSoundEffect = (type: 'success' | 'warning' | 'error') => {
  if (getMuted()) return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'success') {
      // 3-tone harmonic chime (C5, E5, G5: 523.25, 659.25, 783.99 Hz)
      const freqs = [523.25, 659.25, 783.99];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.3);
      });
    } else if (type === 'warning') {
      // 2-tone warning chord (440Hz -> 370Hz)
      const freqs = [440, 369.99];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);

        gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + idx * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.25);
      });
    } else if (type === 'error') {
      // Buzzer (sawtooth 160Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.38);
    }
  } catch (err) {
    console.warn('Audio playback error:', err);
  }
};

// Play speech announcement using Gemini TTS or client Web Speech API fallback
export const speakAnnouncement = async (text: string) => {
  if (getMuted()) return;

  try {
    const voice = getSelectedVoice();
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.audioBase64) {
        const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
        await audio.play();
        return;
      }
    }
  } catch (err) {
    console.warn('Gemini TTS failed, falling back to browser speech synthesis:', err);
  }

  // Fallback to browser Web Speech API
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  } catch (speechErr) {
    console.warn('Speech synthesis fallback error:', speechErr);
  }
};
