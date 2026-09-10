/**
 * Space Vector Pulse Width Modulation (SVPWM) Generator
 * Computes 6-sector hexagon dwell times (T1, T2, T0) and duty cycles,
 * with inverter dead-time compensation.
 */
export class SVPWMGenerator {
    constructor(Vdc = 560.0, switchingFreq = 10000) {
        this.Vdc = Vdc;
        this.Ts = 1.0 / switchingFreq; // 100 microseconds
        this.deadTimeSec = 2.0e-6; // 2 microseconds dead-time
        this.deadTimeCompEnabled = true;

        this.sector = 1;
        this.T1 = 0;
        this.T2 = 0;
        this.T0 = 0;
        this.dutyA = 0.5;
        this.dutyB = 0.5;
        this.dutyC = 0.5;
    }

    /**
     * Modulate voltage space vector [vAlpha, vBeta]
     */
    modulate(vAlpha, vBeta, ia = 0, ib = 0, ic = 0) {
        // Sector determination in alpha-beta plane
        let angle = Math.atan2(vBeta, vAlpha);
        if (angle < 0) angle += 2 * Math.PI;

        this.sector = Math.floor(angle / (Math.PI / 3)) + 1;
        if (this.sector > 6) this.sector = 6;

        // Projection calculations for sector dwell times
        const sqrt3 = Math.sqrt(3);
        let vRefMag = Math.hypot(vAlpha, vBeta);
        let vMaxHex = this.Vdc / sqrt3; // Maximum linear modulation limit

        // Over-modulation scaling
        if (vRefMag > vMaxHex) {
            vAlpha = (vAlpha / vRefMag) * vMaxHex;
            vBeta = (vBeta / vRefMag) * vMaxHex;
        }

        let rad = angle - (this.sector - 1) * (Math.PI / 3);
        let t1Norm = (sqrt3 * vRefMag / this.Vdc) * Math.sin(Math.PI / 3 - rad);
        let t2Norm = (sqrt3 * vRefMag / this.Vdc) * Math.sin(rad);
        let t0Norm = 1.0 - t1Norm - t2Norm;

        this.T1 = Math.max(0, t1Norm * this.Ts);
        this.T2 = Math.max(0, t2Norm * this.Ts);
        this.T0 = Math.max(0, t0Norm * this.Ts);

        // Center-aligned symmetric 7-segment duty cycles
        let ta, tb, tc;
        let t0_half = this.T0 / 2;
        let t1 = this.T1;
        let t2 = this.T2;

        switch (this.sector) {
            case 1:
                ta = t0_half + t1 + t2;
                tb = t0_half + t2;
                tc = t0_half;
                break;
            case 2:
                ta = t0_half + t1;
                tb = t0_half + t1 + t2;
                tc = t0_half;
                break;
            case 3:
                ta = t0_half;
                tb = t0_half + t1 + t2;
                tc = t0_half + t2;
                break;
            case 4:
                ta = t0_half;
                tb = t0_half + t1;
                tc = t0_half + t1 + t2;
                break;
            case 5:
                ta = t0_half + t2;
                tb = t0_half;
                tc = t0_half + t1 + t2;
                break;
            case 6:
            default:
                ta = t0_half + t1 + t2;
                tb = t0_half;
                tc = t0_half + t1;
                break;
        }

        this.dutyA = ta / this.Ts;
        this.dutyB = tb / this.Ts;
        this.dutyC = tc / this.Ts;

        // Dead-time compensation: delta_V = sign(i_phase) * (t_d / T_s) * V_dc
        if (this.deadTimeCompEnabled) {
            let dtDuty = this.deadTimeSec / this.Ts;
            this.dutyA += (ia > 0 ? dtDuty : -dtDuty);
            this.dutyB += (ib > 0 ? dtDuty : -dtDuty);
            this.dutyC += (ic > 0 ? dtDuty : -dtDuty);
        }

        return {
            sector: this.sector,
            dutyA: this.dutyA,
            dutyB: this.dutyB,
            dutyC: this.dutyC,
            vRefMag: vRefMag,
            vMaxHex: vMaxHex
        };
    }
}
