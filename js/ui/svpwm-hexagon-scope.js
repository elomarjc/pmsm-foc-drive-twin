/**
 * Space Vector PWM (SVPWM) Hexagon Scope
 * Renders the 6 voltage sectors (V1 to V6), active reference vector,
 * and PWM dwell-time projections.
 */
export class SVPWMHexagonScope {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
    }

    render(svpwmData, vAlpha, vBeta) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const ctx = this.ctx;

        ctx.clearRect(0, 0, width, height);

        const cx = width / 2;
        const cy = height / 2;
        const maxR = Math.min(cx, cy) - 26;

        // Background
        ctx.fillStyle = '#0a0e17';
        ctx.fillRect(0, 0, width, height);

        // Hexagon Vertices (6 active switching states)
        const vertices = [];
        for (let i = 0; i < 6; i++) {
            let rad = i * (Math.PI / 3);
            vertices.push({
                x: cx + maxR * Math.cos(rad),
                y: cy - maxR * Math.sin(rad)
            });
        }

        // Draw Inverter Hexagon
        ctx.beginPath();
        vertices.forEach((v, idx) => {
            if (idx === 0) ctx.moveTo(v.x, v.y);
            else ctx.lineTo(v.x, v.y);
        });
        ctx.closePath();
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Sector Triangles & Lines
        for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(vertices[i].x, vertices[i].y);
            ctx.strokeStyle = '#141d2e';
            ctx.stroke();

            // Sector Numbers
            let midRad = (i + 0.5) * (Math.PI / 3);
            let lx = cx + (maxR * 0.6) * Math.cos(midRad);
            let ly = cy - (maxR * 0.6) * Math.sin(midRad);
            ctx.fillStyle = (i + 1 === svpwmData.sector) ? '#38bdf8' : '#334155';
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`S${i + 1}`, lx, ly + 4);
        }

        // Highlight Active Sector Triangle
        let sIdx = svpwmData.sector - 1;
        let nextIdx = (sIdx + 1) % 6;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(vertices[sIdx].x, vertices[sIdx].y);
        ctx.lineTo(vertices[nextIdx].x, vertices[nextIdx].y);
        ctx.closePath();
        ctx.fillStyle = 'rgba(14, 165, 233, 0.12)';
        ctx.fill();

        // Maximum Inscribed Circle (Linear Modulation Boundary: Vdc / sqrt(3))
        const linearRadius = maxR * (Math.sqrt(3) / 2);
        ctx.beginPath();
        ctx.arc(cx, cy, linearRadius, 0, 2 * Math.PI);
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#27354a';
        ctx.stroke();
        ctx.setLineDash([]);

        // Reference Voltage Vector (V_ref)
        let vScale = linearRadius / 320.0;
        let vx = cx + vAlpha * vScale;
        let vy = cy - vBeta * vScale;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(vx, vy);
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.arc(vx, vy, 4, 0, 2 * Math.PI);
        ctx.fill();

        // Header Info
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'left';
        ctx.fillText(`Sector ${svpwmData.sector} | |V_ref| = ${svpwmData.vRefMag.toFixed(0)} V`, 12, 20);

        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`Duty: A=${(svpwmData.dutyA*100).toFixed(0)}% B=${(svpwmData.dutyB*100).toFixed(0)}% C=${(svpwmData.dutyC*100).toFixed(0)}%`, 12, 34);
    }
}
