/**
 * Sensorless Sliding Mode Observer (SMO) & PLL Engine
 * Reconstructs back-EMF vectors (eAlpha, eBeta) to estimate rotor angle thetaE
 * and electrical speed omegaE without physical encoders.
 */
export class SlidingModeObserver {
    constructor(pmsmParams) {
        this.params = pmsmParams;
        this.Ls = (pmsmParams.Ld + pmsmParams.Lq) / 2.0; // Average inductance
        this.Rs = pmsmParams.Rs;

        // Estimated stator currents
        this.iAlphaHat = 0.0;
        this.iBetaHat = 0.0;

        // Sliding mode switching gain and boundary layer
        this.kSlide = 120.0;
        this.deltaBoundary = 0.5; // Boundary layer width for chattering suppression

        // Estimated back-EMF
        this.eAlphaHat = 0.0;
        this.eBetaHat = 0.0;
        this.emfFilterAlpha = 0.15; // Low-pass filter coefficient

        // Estimated rotor angle and speed
        this.thetaHat = 0.0;
        this.omegaHat = 0.0;
        this.angleError = 0.0;
    }

    /**
     * Continuous saturation function for chattering mitigation
     */
    sat(x) {
        return Math.max(-1.0, Math.min(1.0, x / this.deltaBoundary));
    }

    /**
     * Step observer by dt
     */
    update(dt, vAlpha, vBeta, iAlpha, iBeta, trueThetaE) {
        // 1. Current estimation error
        let errAlpha = this.iAlphaHat - iAlpha;
        let errBeta = this.iBetaHat - iBeta;

        // 2. Sliding control functions z
        let zAlpha = this.kSlide * this.sat(errAlpha);
        let zBeta = this.kSlide * this.sat(errBeta);

        // 3. Stator current observer dynamics
        let diAlpha_dt = (-this.Rs * this.iAlphaHat + vAlpha - zAlpha) / this.Ls;
        let diBeta_dt = (-this.Rs * this.iBetaHat + vBeta - zBeta) / this.Ls;

        this.iAlphaHat += diAlpha_dt * dt;
        this.iBetaHat += diBeta_dt * dt;

        // 4. Low-pass filter switching functions to extract back-EMF
        this.eAlphaHat += this.emfFilterAlpha * (zAlpha - this.eAlphaHat);
        this.eBetaHat += this.emfFilterAlpha * (zBeta - this.eBetaHat);

        // 5. Rotor position calculation from back-EMF:
        // eAlpha = -psi_pm * omegaE * sin(thetaE)
        // eBeta  =  psi_pm * omegaE * cos(thetaE)
        // => thetaE = atan2(-eAlpha, eBeta)
        let rawTheta = Math.atan2(-this.eAlphaHat, this.eBetaHat);
        if (rawTheta < 0) rawTheta += 2 * Math.PI;

        // Phase delay compensation from low-pass filter: Delta_phi = atan(omegaE * tau)
        this.thetaHat = rawTheta;

        // Error compared to physical truth
        let diff = this.thetaHat - trueThetaE;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        this.angleError = diff;

        // Estimated speed from back-EMF magnitude: |e| = psi_pm * omegaE
        let emfMag = Math.hypot(this.eAlphaHat, this.eBetaHat);
        this.omegaHat = emfMag / Math.max(1e-4, this.params.psiPm);

        return {
            thetaHat: this.thetaHat,
            omegaHat: this.omegaHat,
            angleError: this.angleError,
            eAlphaHat: this.eAlphaHat,
            eBetaHat: this.eBetaHat
        };
    }
}
