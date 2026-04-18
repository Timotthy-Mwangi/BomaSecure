/**
 * Audio Service for BomaSecure
 * 
 * Provides browser-compliant sound playback for emergency alerts and notifications.
 * 
 * BROWSER POLICIES:
 * - Auto-play is blocked until user interacts with the page
 * - This service tracks user interaction state to enable sounds appropriately
 * - Sound can only play AFTER user has interacted (clicked, tapped, etc.)
 * 
 * USAGE:
 * - Call trackUserInteraction() on any user interaction (click, tap, keypress)
 * - Use playAlarm() for emergency alerts (requires prior interaction)
 * - Use playNotification() for regular notifications (requires prior interaction)
 */

class AudioService {
  constructor() {
    this.audioContext = null;
    this.sounds = {};
    this.userHasInteracted = false;
    this.initialized = false;
    
    // Initialize on first user interaction
    this.initPromise = null;
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  init() {
    if (this.initialized) return;
    
    try {
      // Create AudioContext
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Pre-generate sounds
      this.generateAlarmSound();
      this.generateNotificationSound();
      this.generateCriticalAlertSound();
      
      this.initialized = true;
      console.log('[AudioService] Initialized successfully');
    } catch (error) {
      console.error('[AudioService] Failed to initialize:', error);
    }
  }

  /**
   * Track user interaction to comply with browser autoplay policies
   * Call this on any user interaction (click, tap, keypress)
   */
  trackUserInteraction() {
    if (!this.userHasInteracted) {
      this.userHasInteracted = true;
      this.init();
      console.log('[AudioService] User interaction tracked - sounds now enabled');
    }
    
    // Resume audio context if suspended (browser autoplay policy)
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().then(() => {
        console.log('[AudioService] Audio context resumed');
      });
    }
  }

  /**
   * Generate alarm sound using Web Audio API (siren-like tone)
   */
  generateAlarmSound() {
    if (!this.audioContext) return;
    
    const duration = 1.5; // seconds
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Generate siren: alternating between two frequencies
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const freq1 = 800;
      const freq2 = 1200;
      const speed = 4; // speed of alternation
      
      // Alternating frequency (siren effect)
      const freq = (Math.floor(t * speed) % 2 === 0) ? freq1 : freq2;
      
      // Sine wave with envelope
      const envelope = Math.exp(-t * 2); // decay
      data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.5;
    }
    
    this.sounds.alarm = buffer;
  }

  /**
   * Generate notification sound (short beep)
   */
  generateNotificationSound() {
    if (!this.audioContext) return;
    
    const duration = 0.3; // seconds
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Generate pleasant notification tone
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const freq = 880; // A5 note
      
      // Envelope for soft attack and decay
      const envelope = Math.sin(Math.PI * t / duration);
      
      data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.4;
    }
    
    this.sounds.notification = buffer;
  }

  /**
   * Generate critical alert sound (urgent, repeated tone)
   */
  generateCriticalAlertSound() {
    if (!this.audioContext) return;
    
    const duration = 2.0; // seconds
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Generate urgent alert: repeated triple tone
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      
      // Triple beep pattern
      const beepDuration = 0.15;
      const beepGap = 0.15;
      const patternTime = t % (beepDuration * 3 + beepGap * 2);
      
      let freq;
      if (patternTime < beepDuration) {
        freq = 1000;
      } else if (patternTime < beepDuration * 2 + beepGap) {
        freq = 1200;
      } else {
        freq = 1500;
      }
      
      // Envelope
      const inBeep = patternTime < beepDuration;
      const envelope = inBeep ? Math.sin(Math.PI * patternTime / beepDuration) : 0;
      
      data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.5;
    }
    
    this.sounds.critical = buffer;
  }

  /**
   * Play alarm sound
   * @param {Object} options - Playback options
   * @param {number} options.volume - Volume (0-1), default 0.7
   * @param {number} options.loops - Number of times to loop, default 3
   */
  playAlarm(options = {}) {
    const { volume = 0.7, loops = 3 } = options;
    
    if (!this.userHasInteracted) {
      console.warn('[AudioService] Cannot play sound - user has not interacted with page yet');
      return false;
    }
    
    if (!this.sounds.alarm) {
      console.warn('[AudioService] Alarm sound not generated');
      return false;
    }
    
    this.playBuffer(this.sounds.alarm, volume, loops);
    return true;
  }

  /**
   * Play notification sound
   * @param {Object} options - Playback options
   * @param {number} options.volume - Volume (0-1), default 0.5
   */
  playNotification(options = {}) {
    const { volume = 0.5 } = options;
    
    if (!this.userHasInteracted) {
      console.warn('[AudioService] Cannot play sound - user has not interacted with page yet');
      return false;
    }
    
    if (!this.sounds.notification) {
      console.warn('[AudioService] Notification sound not generated');
      return false;
    }
    
    this.playBuffer(this.sounds.notification, volume, 1);
    return true;
  }

  /**
   * Play critical alert sound
   * @param {Object} options - Playback options
   * @param {number} options.volume - Volume (0-1), default 0.8
   * @param {number} options.loops - Number of times to loop, default 2
   */
  playCriticalAlert(options = {}) {
    const { volume = 0.8, loops = 2 } = options;
    
    if (!this.userHasInteracted) {
      console.warn('[AudioService] Cannot play sound - user has not interacted with page yet');
      return false;
    }
    
    if (!this.sounds.critical) {
      console.warn('[AudioService] Critical alert sound not generated');
      return false;
    }
    
    this.playBuffer(this.sounds.critical, volume, loops);
    return true;
  }

  /**
   * Play audio buffer
   */
  playBuffer(buffer, volume = 0.5, loops = 1) {
    if (!this.audioContext || !buffer) return;
    
    try {
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.loop = loops > 1;
      source.loopCount = loops;
      
      // Create gain node for volume control
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = volume;
      
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      source.start(0);
      console.log(`[AudioService] Playing sound (volume: ${volume}, loops: ${loops})`);
    } catch (error) {
      console.error('[AudioService] Error playing sound:', error);
    }
  }

  /**
   * Check if sounds are enabled (user has interacted)
   */
  isSoundEnabled() {
    return this.userHasInteracted;
  }

  /**
   * Get current state
   */
  getState() {
    return {
      initialized: this.initialized,
      userHasInteracted: this.userHasInteracted,
      audioContextState: this.audioContext?.state || 'not initialized'
    };
  }
}

// Export singleton instance
const audioService = new AudioService();

export default audioService;
