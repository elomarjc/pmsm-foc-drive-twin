import { PMSMPhysics } from './engine/pmsm-physics.js';
import { FOCController } from './engine/foc-controller.js';
import { SVPWMGenerator } from './engine/svpwm-generator.js';
import { SlidingModeObserver } from './engine/sliding-mode-observer.js';

import { VectorScope } from './ui/vector-scope.js';
import { SVPWMHexagonScope } from './ui/svpwm-hexagon-scope.js';
import { HarmonicFFTScope } from './ui/harmonic-fft-scope.js';
import { DriveTelemetryChart } from './ui/drive-telemetry-chart.js';

class PMSMDriveApp {
    constructor() {
        this.motor = new PMSMPhysics();
        this.foc = new FOCController(this.motor);
        this.svpwm = new SVPWMGenerator(this.motor.Vdc, 10000);
        this.smo = new SlidingModeObserver(this.motor);

        this.vectorScope = new VectorScope('vectorCanvas');
        this.hexagonScope = new SVPWMHexagonScope('hexagonCanvas');
        this.fftScope = new HarmonicFFTScope('fftCanvas');
        this.chart = new DriveTelemetryChart('chartCanvas');

        this.useSensorlessFeedback = false;

        this.initUI();
        this.startLoop();
    }

    initUI() {
        // Speed Slider
        const speedSlider = document.getElementById('speedSlider');
        const speedVal = document.getElementById('speedVal');
        if (speedSlider) {
            speedSlider.addEventListener('input', (e) => {
                let rpm = parseFloat(e.target.value);
                this.foc.setTargetSpeed(rpm);
                if (speedVal) speedVal.innerText = `${rpm.toFixed(0)} RPM`;
            });
        }

        // Load Torque Slider
        const torqueSlider = document.getElementById('torqueSlider');
        const torqueVal = document.getElementById('torqueVal');
        if (torqueSlider) {
            torqueSlider.addEventListener('input', (e) => {
                let tl = parseFloat(e.target.value);
                this.motor.TL = tl;
                if (torqueVal) torqueVal.innerText = `${tl.toFixed(1)} Nm`;
            });
        }

        // Dead-Time Compensation Toggle
        const dtToggle = document.getElementById('deadTimeToggle');
        if (dtToggle) {
            dtToggle.addEventListener('change', (e) => {
                this.svpwm.deadTimeCompEnabled = e.target.checked;
            });
        }

        // Sensorless Mode Toggle
        const sensorlessToggle = document.getElementById('sensorlessToggle');
        if (sensorlessToggle) {
            sensorlessToggle.addEventListener('change', (e) => {
                this.useSensorlessFeedback = e.target.checked;
            });
        }

        // Step Load Injection Button
        const stepLoadBtn = document.getElementById('stepLoadBtn');
        if (stepLoadBtn) {
            stepLoadBtn.addEventListener('click', () => {
                let prevTL = this.motor.TL;
                this.motor.TL = 16.0;
                setTimeout(() => { this.motor.TL = prevTL; }, 2500);
            });
        }
    }

    startLoop() {
        let lastTime = performance.now();

        const loop = (time) => {
            let dt = Math.min(0.01, (time - lastTime) / 1000.0);
            lastTime = time;

            // Run sub-cycles for accurate current dynamics (1 kHz inner integration)
            const subSteps = 10;
            const subDt = dt / subSteps;

            let svpwmData;
            for (let i = 0; i < subSteps; i++) {
                // 1. Determine feedback rotor angle
                let feedbackTheta = this.useSensorlessFeedback ? this.smo.thetaHat : this.motor.thetaE;

                // 2. FOC Controller executes
                let { vd, vq, vAlpha, vBeta } = this.foc.update(
                    subDt,
                    this.motor.omegaM,
                    this.motor.id,
                    this.motor.iq,
                    feedbackTheta
                );

                // 3. Space Vector PWM
                svpwmData = this.svpwm.modulate(vAlpha, vBeta, this.motor.ia, this.motor.ib, this.motor.ic);

                // 4. PMSM Motor dynamic step
                this.motor.step(subDt, vd, vq);

                // 5. Sliding Mode Observer update
                let { iAlpha, iBeta } = FOCController.clarke(this.motor.ia, this.motor.ib, this.motor.ic);
                this.smo.update(subDt, vAlpha, vBeta, iAlpha, iBeta, this.motor.thetaE);
            }

            // UI Render
            let { iAlpha, iBeta } = FOCController.clarke(this.motor.ia, this.motor.ib, this.motor.ic);
            this.vectorScope.render(iAlpha, iBeta, this.motor.id, this.motor.iq, this.motor.thetaE);
            this.hexagonScope.render(svpwmData, this.foc.vAlphaRef, this.foc.vBetaRef);

            this.fftScope.update(this.svpwm.deadTimeCompEnabled);
            this.fftScope.render();

            let targetRpm = this.foc.targetSpeedRpm;
            let actualRpm = this.motor.omegaM * 60.0 / (2 * Math.PI);
            let obsRpm = this.smo.omegaHat * 60.0 / (2 * Math.PI * this.motor.p);
            this.chart.pushData(targetRpm, actualRpm, obsRpm, this.motor.Te, this.motor.TL);
            this.chart.render();

            this.updateTelemetryDOM(actualRpm, obsRpm);

            requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
    }

    updateTelemetryDOM(actualRpm, obsRpm) {
        let speedElem = document.getElementById('telemSpeed');
        if (speedElem) speedElem.innerText = `${actualRpm.toFixed(0)} RPM`;

        let torqueElem = document.getElementById('telemTorque');
        if (torqueElem) torqueElem.innerText = `${this.motor.Te.toFixed(1)} Nm`;

        let errElem = document.getElementById('telemSmoErr');
        if (errElem) {
            let errDeg = Math.abs(this.smo.angleError * 180 / Math.PI);
            errElem.innerText = `Δθ: ${errDeg.toFixed(1)}°`;
            errElem.className = errDeg < 5.0 ? 'status-pill success' : 'status-pill warning';
        }

        let modeElem = document.getElementById('telemMode');
        if (modeElem) {
            modeElem.innerText = this.useSensorlessFeedback ? 'SENSORLESS SMO' : 'ENCODER CLOSED-LOOP';
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.app = new PMSMDriveApp();
});


// ==========================================
// MOBILE FLOATING HUD & DRAWER CONTROLLER
// ==========================================
(function initMobileFloatingHUD() {
  const drawer = document.getElementById('telemetryDrawer');
  const backdrop = document.getElementById('telemetryBackdrop');
  const btnSettings = document.getElementById('btn-hud-settings');
  const btnTrigger = document.getElementById('btn-trigger-controls-drawer');
  const btnClose = document.getElementById('btn-close-telemetry');
  const btnFullscreen = document.getElementById('btn-hud-fullscreen');
  const btnMenu = document.getElementById('btn-hud-menu');

  function openDrawer() {
    if (drawer) drawer.classList.add('open');
    if (backdrop) backdrop.classList.add('active');
  }

  function closeDrawer() {
    if (drawer) drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
  }

  if (btnSettings) btnSettings.addEventListener('click', openDrawer);
  if (btnTrigger) btnTrigger.addEventListener('click', openDrawer);
  if (btnClose) btnClose.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  if (btnMenu) {
    btnMenu.addEventListener('click', () => {
      const guideBtn = document.getElementById('guideBtn') || document.getElementById('btnTourLauncher');
      if (guideBtn) guideBtn.click();
    });
  }

  // Cross-platform Universal Fullscreen
  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {
            document.body.classList.toggle('immersive-fullscreen');
          });
        } else if (document.documentElement.webkitRequestFullscreen) {
          document.documentElement.webkitRequestFullscreen();
        } else {
          document.body.classList.toggle('immersive-fullscreen');
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
        document.body.classList.remove('immersive-fullscreen');
      }
    });
  }

  // Left Rail: Target Speed (100 to 2000 RPM)
  const vSpeed = document.getElementById('slider-speed-vertical');
  const dSpeed = document.getElementById('speedSlider');
  const valSpeed = document.getElementById('hud-speed-val');
  const fillSpeed = document.getElementById('rail-fill-speed');

  function updateSpeedHUD(val) {
    const num = parseFloat(val);
    if (valSpeed) valSpeed.textContent = Math.round(num) + ' RPM';
    if (fillSpeed) {
      // Range is 100 to 2000 (span = 1900)
      const pct = Math.max(0, Math.min(100, ((num - 100) / 1900) * 100));
      fillSpeed.style.height = pct + '%';
    }
    if (vSpeed && Math.abs(parseFloat(vSpeed.value) - num) > 1) {
      vSpeed.value = num;
    }
  }

  if (vSpeed && dSpeed) {
    vSpeed.min = dSpeed.min || '100';
    vSpeed.max = dSpeed.max || '2000';
    vSpeed.step = dSpeed.step || '50';
    vSpeed.value = dSpeed.value;
    updateSpeedHUD(dSpeed.value);

    vSpeed.addEventListener('input', (e) => {
      dSpeed.value = e.target.value;
      dSpeed.dispatchEvent(new Event('input', { bubbles: true }));
      updateSpeedHUD(e.target.value);
    });

    dSpeed.addEventListener('input', (e) => {
      updateSpeedHUD(e.target.value);
    });
  }

  // Right Rail: Load Torque Disturbance (0 to 18 Nm)
  const vTorque = document.getElementById('slider-torque-vertical');
  const dTorque = document.getElementById('torqueSlider');
  const valTorque = document.getElementById('hud-torque-val');
  const fillTorque = document.getElementById('rail-fill-torque');

  function updateTorqueHUD(val) {
    const num = parseFloat(val);
    if (valTorque) valTorque.textContent = num.toFixed(1) + ' Nm';
    if (fillTorque) {
      // Range is 0 to 18 (span = 18)
      const pct = Math.max(0, Math.min(100, (num / 18) * 100));
      fillTorque.style.height = pct + '%';
    }
    if (vTorque && Math.abs(parseFloat(vTorque.value) - num) > 0.1) {
      vTorque.value = num;
    }
  }

  if (vTorque && dTorque) {
    vTorque.min = dTorque.min || '0';
    vTorque.max = dTorque.max || '18';
    vTorque.step = dTorque.step || '0.5';
    vTorque.value = dTorque.value;
    updateTorqueHUD(dTorque.value);

    vTorque.addEventListener('input', (e) => {
      dTorque.value = e.target.value;
      dTorque.dispatchEvent(new Event('input', { bubbles: true }));
      updateTorqueHUD(e.target.value);
    });

    dTorque.addEventListener('input', (e) => {
      updateTorqueHUD(e.target.value);
    });
  }

  // Transport and Play/Pause
  let isSimPaused = false;
  const railPauseBtn = document.getElementById('btn-rail-pause');
  const transPauseBtn = document.getElementById('btn-transport-pause');
  const pauseIcon1 = document.getElementById('rail-pause-icon');
  const pauseIcon2 = document.getElementById('hud-pause-icon');
  const pauseText = document.getElementById('hud-pause-text');

  function toggleSimPause() {
    isSimPaused = !isSimPaused;
    const symbol = isSimPaused ? '▶' : '⏸';
    const text = isSimPaused ? 'RESUME' : 'PAUSE';
    if (pauseIcon1) pauseIcon1.textContent = symbol;
    if (pauseIcon2) pauseIcon2.textContent = symbol;
    if (pauseText) pauseText.textContent = text;
    if (transPauseBtn) transPauseBtn.classList.toggle('active', isSimPaused);
  }

  if (railPauseBtn) railPauseBtn.addEventListener('click', toggleSimPause);
  if (transPauseBtn) transPauseBtn.addEventListener('click', toggleSimPause);

  const stepBack = document.getElementById('btn-transport-step-back');
  const stepFwd = document.getElementById('btn-transport-step-fwd');
  if (stepBack && dSpeed) {
    stepBack.addEventListener('click', () => {
      let v = Math.max(100, parseFloat(dSpeed.value) - 100);
      dSpeed.value = v;
      dSpeed.dispatchEvent(new Event('input', { bubbles: true }));
      updateSpeedHUD(v);
    });
  }
  if (stepFwd && dSpeed) {
    stepFwd.addEventListener('click', () => {
      let v = Math.min(2000, parseFloat(dSpeed.value) + 100);
      dSpeed.value = v;
      dSpeed.dispatchEvent(new Event('input', { bubbles: true }));
      updateSpeedHUD(v);
    });
  }

  // Mode Cards
  const modeNominal = document.getElementById('hud-mode-nominal');
  const modeStepLoad = document.getElementById('hud-mode-stepload');
  const modeSmo = document.getElementById('hud-mode-smo');
  const modeDeadTime = document.getElementById('hud-mode-deadtime');
  const stepLoadBtn = document.getElementById('stepLoadBtn');
  const sensorlessToggle = document.getElementById('sensorlessToggle');
  const deadTimeToggle = document.getElementById('deadTimeToggle');
  const modeIndicator = document.getElementById('hud-mode-indicator');
  const statusSummary = document.getElementById('hud-status-summary');

  function clearActiveModes() {
    [modeNominal, modeStepLoad, modeSmo, modeDeadTime].forEach(m => m && m.classList.remove('active'));
  }

  if (modeNominal) {
    modeNominal.addEventListener('click', () => {
      clearActiveModes();
      modeNominal.classList.add('active');
      if (dSpeed) {
        dSpeed.value = '1500';
        dSpeed.dispatchEvent(new Event('input', { bubbles: true }));
        updateSpeedHUD('1500');
      }
      if (dTorque) {
        dTorque.value = '0';
        dTorque.dispatchEvent(new Event('input', { bubbles: true }));
        updateTorqueHUD('0');
      }
      if (sensorlessToggle && sensorlessToggle.checked) {
        sensorlessToggle.checked = false;
        sensorlessToggle.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (modeIndicator) modeIndicator.textContent = 'dq DECOUPLED';
      if (statusSummary) statusSummary.textContent = '10 kHz NOMINAL';
    });
  }

  if (modeStepLoad) {
    modeStepLoad.addEventListener('click', () => {
      clearActiveModes();
      modeStepLoad.classList.add('active');
      if (stepLoadBtn) stepLoadBtn.click();
      if (modeIndicator) modeIndicator.textContent = 'TRANSIENT';
      if (statusSummary) statusSummary.textContent = '+10 Nm STEP';
      setTimeout(() => {
        if (modeStepLoad.classList.contains('active')) {
          modeNominal.classList.add('active');
          modeStepLoad.classList.remove('active');
        }
      }, 3000);
    });
  }

  function updateSmoState() {
    if (sensorlessToggle && modeSmo) {
      modeSmo.classList.toggle('active', sensorlessToggle.checked);
      if (sensorlessToggle.checked) {
        if (modeIndicator) modeIndicator.textContent = 'SMO SENSORLESS';
        if (statusSummary) statusSummary.textContent = 'BACK-EMF EST';
      }
    }
  }

  if (sensorlessToggle) {
    sensorlessToggle.addEventListener('change', updateSmoState);
  }

  if (modeSmo) {
    modeSmo.addEventListener('click', () => {
      if (sensorlessToggle) {
        sensorlessToggle.checked = !sensorlessToggle.checked;
        sensorlessToggle.dispatchEvent(new Event('change', { bubbles: true }));
        updateSmoState();
      }
    });
  }

  function updateDeadTimeState() {
    if (deadTimeToggle && modeDeadTime) {
      modeDeadTime.classList.toggle('active', deadTimeToggle.checked);
    }
  }

  if (deadTimeToggle) {
    deadTimeToggle.addEventListener('change', updateDeadTimeState);
    updateDeadTimeState();
  }

  if (modeDeadTime) {
    modeDeadTime.addEventListener('click', () => {
      if (deadTimeToggle) {
        deadTimeToggle.checked = !deadTimeToggle.checked;
        deadTimeToggle.dispatchEvent(new Event('change', { bubbles: true }));
        updateDeadTimeState();
      }
    });
  }
})();
