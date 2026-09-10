/**
 * Permanent Magnet Synchronous Motor (PMSM) Physics Model
 * Models a 3-phase Interior PMSM (IPMSM) in synchronous dq coordinates:
 * - Pole pairs p = 4
 * - Stator resistance R_s = 0.45 Ohm
 * - d-axis inductance L_d = 4.2 mH
 * - q-axis inductance L_q = 6.8 mH (reluctance torque saliency)
 * - PM flux linkage psi_pm = 0.125 Wb
 * - DC link voltage V_dc = 560 V
 */
export class PMSMPhysics {
    constructor() {
        this.p = 4; // Pole pairs
        this.Rs = 0.45; // Stator resistance (Ohms)
        this.Ld = 0.0042; // d-axis inductance (H)
        this.Lq = 0.0068; // q-axis inductance (H)
        this.psiPm = 0.125; // Permanent magnet flux linkage (Wb)
        this.Vdc = 560.0; // DC bus voltage (V)
        this.J = 0.008; // Drivetrain inertia (kg*m^2)
        this.B = 0.001; // Viscous damping (N*m*s/rad)

        // Dynamic states
        this.id = 0.0; // d-axis stator current (A)
        this.iq = 0.0; // q-axis stator current (A)
        this.omegaM = 0.0; // Mechanical rotor speed (rad/s)
        this.thetaM = 0.0; // Mechanical rotor angle (rad)

        // Electrical variables
        this.omegaE = 0.0; // Electrical speed (rad/s) = p * omegaM
        this.thetaE = 0.0; // Electrical angle (rad)
        this.Te = 0.0; // Electromagnetic torque (Nm)
        this.TL = 5.0; // Mechanical load torque disturbance (Nm)

        // 3-phase currents
        this.ia = 0.0;
        this.ib = 0.0;
        this.ic = 0.0;
    }

    step(dt, vd, vq) {
        this.omegaE = this.p * this.omegaM;
        this.thetaE = (this.p * this.thetaM) % (2 * Math.PI);
        if (this.thetaE < 0) this.thetaE += 2 * Math.PI;

        // 1. Current state derivatives (dq-frame voltage equations)
        // d(id)/dt = (vd - Rs*id + omegaE*Lq*iq) / Ld
        let did_dt = (vd - this.Rs * this.id + this.omegaE * this.Lq * this.iq) / this.Ld;
        // d(iq)/dt = (vq - Rs*iq - omegaE*Ld*id - omegaE*psiPm) / Lq
        let diq_dt = (vq - this.Rs * this.iq - this.omegaE * this.Ld * this.id - this.omegaE * this.psiPm) / this.Lq;

        this.id += did_dt * dt;
        this.iq += diq_dt * dt;

        // 2. Electromagnetic Torque: Te = 1.5 * p * [psiPm * iq + (Ld - Lq) * id * iq]
        this.Te = 1.5 * this.p * (this.psiPm * this.iq + (this.Ld - this.Lq) * this.id * this.iq);

        // 3. Mechanical rotor acceleration: d(omegaM)/dt = (Te - TL - B*omegaM) / J
        let dOmegaM_dt = (this.Te - this.TL - this.B * this.omegaM) / this.J;
        this.omegaM += dOmegaM_dt * dt;
        this.thetaM = (this.thetaM + this.omegaM * dt) % (2 * Math.PI);

        // 4. Inverse Park & Clarke to synthesize 3-phase stator currents
        let sinT = Math.sin(this.thetaE);
        let cosT = Math.cos(this.thetaE);
        let iAlpha = this.id * cosT - this.iq * sinT;
        let iBeta = this.id * sinT + this.iq * cosT;

        this.ia = iAlpha;
        this.ib = -0.5 * iAlpha + (Math.sqrt(3) / 2) * iBeta;
        this.ic = -0.5 * iAlpha - (Math.sqrt(3) / 2) * iBeta;
    }
}
