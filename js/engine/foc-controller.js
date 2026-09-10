/**
 * Field-Oriented Controller (FOC) Engine
 * Performs Clarke/Park vector transformations, speed PI regulation,
 * and cross-coupling voltage feedforward compensation.
 */
export class FOCController {
    constructor(pmsmParams) {
        this.params = pmsmParams;

        // Speed loop PI
        this.targetSpeedRpm = 1500.0;
        this.speedKp = 0.045;
        this.speedKi = 0.45;
        this.speedIntegral = 0.0;
        this.iqMax = 25.0; // Current limit (A)

        // Current loop PI
        this.currentKp = 8.5;
        this.currentKi = 120.0;
        this.intId = 0.0;
        this.intIq = 0.0;
        this.vMax = 320.0; // Max phase voltage (V)

        // Commands
        this.idRef = 0.0; // id* = 0 control for non-salient / baseline
        this.iqRef = 0.0;
        this.vdRef = 0.0;
        this.vqRef = 0.0;
        this.vAlphaRef = 0.0;
        this.vBetaRef = 0.0;
    }

    setTargetSpeed(rpm) {
        this.targetSpeedRpm = rpm;
    }

    /**
     * Clarke Transform: [ia, ib, ic] -> [iAlpha, iBeta]
     */
    static clarke(ia, ib, ic) {
        let iAlpha = (2.0 / 3.0) * (ia - 0.5 * ib - 0.5 * ic);
        let iBeta = (2.0 / 3.0) * ((Math.sqrt(3) / 2) * ib - (Math.sqrt(3) / 2) * ic);
        return { iAlpha, iBeta };
    }

    /**
     * Park Transform: [iAlpha, iBeta] -> [id, iq]
     */
    static park(iAlpha, iBeta, thetaE) {
        let sinT = Math.sin(thetaE);
        let cosT = Math.cos(thetaE);
        let id = iAlpha * cosT + iBeta * sinT;
        let iq = -iAlpha * sinT + iBeta * cosT;
        return { id, iq };
    }

    /**
     * Inverse Park Transform: [vd, vq] -> [vAlpha, vBeta]
     */
    static invPark(vd, vq, thetaE) {
        let sinT = Math.sin(thetaE);
        let cosT = Math.cos(thetaE);
        let vAlpha = vd * cosT - vq * sinT;
        let vBeta = vd * sinT + vq * cosT;
        return { vAlpha, vBeta };
    }

    /**
     * Run FOC control loop
     */
    update(dt, omegaM, id, iq, thetaE) {
        // 1. Outer Speed PI Loop
        let targetOmegaM = (this.targetSpeedRpm * 2 * Math.PI) / 60.0;
        let speedErr = targetOmegaM - omegaM;
        this.speedIntegral += this.speedKi * speedErr * dt;
        this.speedIntegral = Math.max(-this.iqMax, Math.min(this.iqMax, this.speedIntegral));
        this.iqRef = Math.max(-this.iqMax, Math.min(this.iqMax, this.speedKp * speedErr + this.speedIntegral));

        // 2. Inner Current PI Loops
        let idErr = this.idRef - id;
        let iqErr = this.iqRef - iq;

        this.intId += this.currentKi * idErr * dt;
        this.intIq += this.currentKi * iqErr * dt;
        this.intId = Math.max(-this.vMax, Math.min(this.vMax, this.intId));
        this.intIq = Math.max(-this.vMax, Math.min(this.vMax, this.intIq));

        // Decoupling feedforward terms
        let omegaE = this.params.p * omegaM;
        let crossD = -omegaE * this.params.Lq * iq;
        let crossQ = omegaE * (this.params.Ld * id + this.params.psiPm);

        this.vdRef = Math.max(-this.vMax, Math.min(this.vMax, this.currentKp * idErr + this.intId + crossD));
        this.vqRef = Math.max(-this.vMax, Math.min(this.vMax, this.currentKp * iqErr + this.intIq + crossQ));

        // 3. Inverse Park to get stator stationary voltage commands
        let { vAlpha, vBeta } = FOCController.invPark(this.vdRef, this.vqRef, thetaE);
        this.vAlphaRef = vAlpha;
        this.vBetaRef = vBeta;

        return { vd: this.vdRef, vq: this.vqRef, vAlpha: this.vAlphaRef, vBeta: this.vBetaRef };
    }
}
