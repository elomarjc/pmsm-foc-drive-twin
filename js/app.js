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
