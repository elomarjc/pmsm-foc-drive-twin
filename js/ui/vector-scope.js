/**
 * Rotating Vector Space Scope
 * Renders the stator current vector (iAlpha, iBeta) and direct/quadrature
 * decoupled axes (id, iq) rotating with electrical angle thetaE.
 */
export class VectorScope {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
    }

    render(iAlpha, iBeta, id, iq, thetaE) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const ctx = this.ctx;

        ctx.clearRect(0, 0, width, height);

        const cx = width / 2;
        const cy = height / 2;
        const maxR = Math.min(cx, cy) - 24;

        // Background
        ctx.fillStyle = '#0a0e17';
        ctx.fillRect(0, 0, width, height);

        // Concentric circles (current levels: 5A, 10A, 15A, 20A)
        const iLevels = [5, 10, 15, 20];
        ctx.textAlign = 'left';
        ctx.font = '10px Inter, monospace';
        iLevels.forEach((amps, idx) => {
            let r = (amps / 20.0) * maxR;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, 2 * Math.PI);
            ctx.strokeStyle = '#141d2e';
            ctx.stroke();
            ctx.fillStyle = '#4a5b78';
            ctx.fillText(`${amps}A`, cx + 4, cy - r + 10);
        });

        // Stationary alpha-beta axes (Gray)
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - maxR, cy); ctx.lineTo(cx + maxR, cy);
        ctx.moveTo(cx, cy - maxR); ctx.lineTo(cx, cy + maxR);
        ctx.stroke();

        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'center';
        ctx.fillText('+α', cx + maxR + 12, cy + 3);
        ctx.fillText('+β', cx, cy - maxR - 6);

        // Rotating d-q axes (Cyan d-axis, Amber q-axis)
        const cosT = Math.cos(thetaE);
        const sinT = Math.sin(thetaE);

        // d-axis (rotor flux orientation)
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - maxR * cosT, cy + maxR * sinT);
        ctx.lineTo(cx + maxR * cosT, cy - maxR * sinT);
        ctx.stroke();

        // q-axis (torque orientation, 90 deg ahead)
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
        ctx.beginPath();
        ctx.moveTo(cx + maxR * sinT, cy + maxR * cosT);
        ctx.lineTo(cx - maxR * sinT, cy - maxR * cosT);
        ctx.stroke();

        // Current Space Vector: i_s = iAlpha + j*iBeta
        let scale = maxR / 20.0;
        let isX = cx + iAlpha * scale;
        let isY = cy - iBeta * scale;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(isX, isY);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Vector tip
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(isX, isY, 4, 0, 2 * Math.PI);
        ctx.fill();

        // Telemetry readouts
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(`|i_s| = ${Math.hypot(iAlpha, iBeta).toFixed(1)} A`, 12, 20);

        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`id = ${id.toFixed(1)} A (Flux)`, 12, 34);
        ctx.fillStyle = '#f59e0b';
        ctx.fillText(`iq = ${iq.toFixed(1)} A (Torque)`, 12, 48);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`θe = ${(thetaE * 180 / Math.PI).toFixed(0)}°`, 12, 62);
    }
}
