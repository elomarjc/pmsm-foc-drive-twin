/**
 * Inverter Current Harmonic FFT Spectrum Scope
 * Visualizes fundamental and parasitic 5th / 7th harmonics caused by inverter
 * switching dead-time and demonstrates active volt-second error compensation.
 */
export class HarmonicFFTScope {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.harmonics = [1, 5, 7, 11, 13, 17, 19];
        this.powerDb = new Float32Array(this.harmonics.length);
    }

    update(deadTimeCompEnabled) {
        // Fundamental (1st): 0 dB
        this.powerDb[0] = 0.0;

        // 5th harmonic (250 Hz) & 7th harmonic (350 Hz)
        if (deadTimeCompEnabled) {
            this.powerDb[1] = -42.0 + Math.random() * 2.0;
            this.powerDb[2] = -45.0 + Math.random() * 2.0;
            this.powerDb[3] = -52.0;
            this.powerDb[4] = -55.0;
            this.powerDb[5] = -60.0;
            this.powerDb[6] = -62.0;
        } else {
            // Without dead-time compensation, 5th and 7th harmonics rise by 20 dB
            this.powerDb[1] = -21.0 + Math.random() * 2.0;
            this.powerDb[2] = -24.0 + Math.random() * 2.0;
            this.powerDb[3] = -34.0;
            this.powerDb[4] = -38.0;
            this.powerDb[5] = -48.0;
            this.powerDb[6] = -50.0;
        }
    }

    render() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const ctx = this.ctx;

        ctx.clearRect(0, 0, width, height);

        // Background
        ctx.fillStyle = '#0a0e17';
        ctx.fillRect(0, 0, width, height);

        const padLeft = 40;
        const padRight = 15;
        const padTop = 15;
        const padBottom = 25;
        const plotW = width - padLeft - padRight;
        const plotH = height - padTop - padBottom;

        // Coordinates mapping (-60 dB to 0 dB)
        const mapY = (db) => (padTop + plotH) - ((db + 60) / 60.0) * plotH;

        // Horizontal grid lines
        ctx.strokeStyle = '#141d2e';
        ctx.lineWidth = 1;
        ctx.font = '10px Inter, monospace';
        ctx.fillStyle = '#4a5b78';
        ctx.textAlign = 'right';

        for (let db = -60; db <= 0; db += 15) {
            let py = mapY(db);
            ctx.beginPath();
            ctx.moveTo(padLeft, py);
            ctx.lineTo(padLeft + plotW, py);
            ctx.stroke();
            ctx.fillText(`${db}`, padLeft - 6, py + 3);
        }

        // Harmonic Bars
        const barWidth = 24;
        const stepX = plotW / this.harmonics.length;

        this.harmonics.forEach((h, idx) => {
            let cx = padLeft + (idx + 0.5) * stepX;
            let valDb = Math.max(-60, this.powerDb[idx]);
            let py = mapY(valDb);
            let barH = (padTop + plotH) - py;

            // Bar fill (Amber for 5th/7th, Green for fundamental, Blue for others)
            let color = (h === 1) ? '#10b981' : (h === 5 || h === 7) ? '#f59e0b' : '#38bdf8';
            ctx.fillStyle = color;
            ctx.fillRect(cx - barWidth / 2, py, barWidth, barH);

            // Harmonic label
            ctx.fillStyle = '#94a3b8';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${h}h`, cx, padTop + plotH + 14);

            // Value text
            ctx.fillStyle = '#f8fafc';
            ctx.font = '9px Inter, monospace';
            ctx.fillText(`${valDb.toFixed(0)}dB`, cx, py - 4);
        });

        // Header
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'left';
        ctx.fillText('Stator Current Harmonic FFT (5th & 7th Inverter Dead-Time Distortion)', padLeft + 10, padTop + 14);
    }
}
