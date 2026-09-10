import test from 'node:test';
import assert from 'node:assert/strict';

import { PMSMPhysics } from '../js/engine/pmsm-physics.js';
import { FOCController } from '../js/engine/foc-controller.js';
import { SVPWMGenerator } from '../js/engine/svpwm-generator.js';
import { SlidingModeObserver } from '../js/engine/sliding-mode-observer.js';

test('FOCController: Clarke and Park transformation accuracy and orthogonality', () => {
    // 1. Balanced 3-phase currents at peak phase A
    const ia = 10.0;
    const ib = -5.0;
    const ic = -5.0;
    const { iAlpha, iBeta } = FOCController.clarke(ia, ib, ic);

    assert.ok(Math.abs(iAlpha - 10.0) < 1e-5, `iAlpha should equal 10.0, got ${iAlpha}`);
    assert.ok(Math.abs(iBeta) < 1e-5, `iBeta should equal 0.0, got ${iBeta}`);

    // 2. Park transform at thetaE = 0
    const { id, iq } = FOCController.park(iAlpha, iBeta, 0.0);
    assert.ok(Math.abs(id - 10.0) < 1e-5, `id should equal 10.0 at theta=0, got ${id}`);
    assert.ok(Math.abs(iq) < 1e-5, `iq should equal 0.0 at theta=0, got ${iq}`);

    // 3. Inverse Park reconstruction
    const { vAlpha, vBeta } = FOCController.invPark(120.0, 60.0, 0.5);
    const reco = FOCController.park(vAlpha, vBeta, 0.5);
    assert.ok(Math.abs(reco.id - 120.0) < 1e-5, 'Reconstructed vd should equal 120.0');
    assert.ok(Math.abs(reco.iq - 60.0) < 1e-5, 'Reconstructed vq should equal 60.0');
});

test('SVPWMGenerator: sector determination and duty cycle bounding', () => {
    const svpwm = new SVPWMGenerator(560.0, 10000);

    // Vector in Sector 1 (angle 30 deg = PI/6)
    const vMag = 200.0;
    const vAlpha = vMag * Math.cos(Math.PI / 6);
    const vBeta = vMag * Math.sin(Math.PI / 6);

    const mod = svpwm.modulate(vAlpha, vBeta, 5.0, -2.5, -2.5);

    assert.equal(mod.sector, 1, `Sector should be 1, got ${mod.sector}`);
    assert.ok(mod.dutyA >= 0 && mod.dutyA <= 1.0, 'dutyA should be within [0, 1]');
    assert.ok(mod.dutyB >= 0 && mod.dutyB <= 1.0, 'dutyB should be within [0, 1]');
    assert.ok(mod.dutyC >= 0 && mod.dutyC <= 1.0, 'dutyC should be within [0, 1]');
    assert.ok(mod.vRefMag <= mod.vMaxHex, 'Reference voltage magnitude should be bounded by hexagon limit');
});

test('PMSMPhysics: electromagnetic torque generation and drivetrain acceleration', () => {
    const motor = new PMSMPhysics();
    motor.iq = 10.0; // 10A torque current
    motor.id = 0.0;
    motor.TL = 2.0;

    // Provide steady-state equilibrium voltages (vd = 0, vq = Rs * iq = 4.5V) so iq stays at 10A
    motor.step(0.001, 0.0, 4.5);

    // Te = 1.5 * p * psi_pm * iq = 1.5 * 4 * 0.125 * 10 = 7.5 Nm
    assert.ok(Math.abs(motor.Te - 7.5) < 0.2, `Te should be ~7.5 Nm, got ${motor.Te}`);
    assert.ok(motor.omegaM > 0.0, 'Rotor should accelerate under net positive torque');
});

test('SlidingModeObserver: sensorless rotor angle tracking', () => {
    const motor = new PMSMPhysics();
    const smo = new SlidingModeObserver(motor);

    // Simulate steady rotation at 1500 RPM for 100 ms
    motor.omegaM = (1500 * 2 * Math.PI) / 60.0;
    const dt = 0.0001; // 10 kHz observer rate

    for (let step = 0; step < 1000; step++) {
        motor.thetaM = (motor.thetaM + motor.omegaM * dt) % (2 * Math.PI);
        motor.thetaE = (motor.p * motor.thetaM) % (2 * Math.PI);

        // Synthesize ideal back-EMF voltages and currents
        let eAlpha = -motor.psiPm * motor.omegaE * Math.sin(motor.thetaE);
        let eBeta = motor.psiPm * motor.omegaE * Math.cos(motor.thetaE);

        let iAlpha = 10.0 * Math.cos(motor.thetaE);
        let iBeta = 10.0 * Math.sin(motor.thetaE);

        smo.update(dt, eAlpha, eBeta, iAlpha, iBeta, motor.thetaE);
    }

    assert.ok(smo.omegaHat > 100.0, `Estimated electrical speed should exceed 100 rad/s, got ${smo.omegaHat.toFixed(1)}`);
});
