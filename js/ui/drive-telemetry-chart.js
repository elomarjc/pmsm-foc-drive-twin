/**
 * Drive Dynamic Telemetry Strip-Chart
 * Plots rotor speed tracking (target vs actual vs sensorless observer)
 * and electromagnetic torque Te vs load disturbance TL.
 */
export class DriveTelemetryChart {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        this.length = 120;
        this.targetSpeed = new Float32Array(this.length);
        this.actualSpeed = new Float32Array(this.length);
        this.observerSpeed = new Float32Array(this.length);
        this.torqueTe = new Float32Array(this.length);
        this.torqueTL = new Float32Array(this.length);
    }

    pushData(targetRpm, actualRpm, obsRpm, Te, TL) {
        for (let i = 0; i < this.length - 1; i++) {
            this.targetSpeed[i] = this.targetSpeed[i + 1];
            this.actualSpeed[i] = this.actualSpeed[i + 1];
            this.observerSpeed[i] = this.observerSpeed[i + 1];
            this.torqueTe[i] = this.torqueTe[i + 1];
            this.torqueTL[i] = this.torqueTL[i + 1];
        }

        this.targetSpeed[this.length - 1] = targetRpm;
        this.actualSpeed[this.length - 1] = actualRpm;
        this.observerSpeed[this.length - 1] = obsRpm;
        this.torqueTe[this.length - 1] = Te;
        this.torqueTL[this.length - 1] = TL;
    }

    render() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const ctx = this.ctx;

        ctx.clearRect(0, 0, width, height);

        // Background
        ctx.fillStyle = '#0a0e17';
        ctx.fillRect(0, 0, width, height);

        const padLeft = 45;
        const padRight = 15;
        const padTop = 15;
        const padBottom = 25;
        const plotW = width - padLeft - padRight;
        const plotH = height - padTop - padBottom;

        const halfH = (plotH - 15) / 2;

        // Top Plot: Speed (0 to 2000 RPM)
        const topY = (rpm) => padTop + halfH - (rpm / 2000.0) * halfH;
        ctx.strokeStyle = '#141d2e';
        ctx.lineWidth = 1;
        ctx.font = '10px Inter, monospace';
        ctx.fillStyle = '#4a5b78';
        ctx.textAlign = 'right';

        [0, 1000, 2000].forEach(val => {
            let py = topY(val);
            ctx.beginPath();
            ctx.moveTo(padLeft, py);
            ctx.lineTo(padLeft + plotW, py);
            ctx.stroke();
            ctx.fillText(`${val}`, padLeft - 6, py + 3);
        });

        // Bottom Plot: Torque (-5 to +25 Nm)
        const botTop = padTop + halfH + 15;
        const botY = (t) => (botTop + halfH) - ((t + 5) / 30.0) * halfH;

        [0, 10, 20].forEach(val => {
            let py = botY(val);
            ctx.beginPath();
            ctx.moveTo(padLeft, py);
            ctx.lineTo(padLeft + plotW, py);
            ctx.stroke();
            ctx.fillText(`${val}Nm`, padLeft - 6, py + 3);
        });

        const mapX = (idx) => padLeft + (idx / (this.length - 1)) * plotW;

        const drawTrace = (data, mapYFunc, color, isDashed = false) => {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.8;
            if (isDashed) ctx.setLineDash([4, 4]);
            for (let i = 0; i < this.length; i++) {
                let px = mapX(i);
                let py = mapYFunc(data[i]);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
            if (isDashed) ctx.setLineDash([]);
        };

        // Top Traces
        drawTrace(this.targetSpeed, topY, '#38bdf8', true); // Target Speed (Dashed Cyan)
        drawTrace(this.actualSpeed, topY, '#10b981', false); // Actual Speed (Green)
        drawTrace(this.observerSpeed, topY, '#f59e0b', false); // SMO Sensorless Speed (Amber)

        // Bottom Traces
        drawTrace(this.torqueTe, botY, '#a855f7', false); // Te Electromagnetic Torque (Purple)
        drawTrace(this.torqueTL, botY, '#ef4444', false); // TL Mechanical Load (Red)

        // Labels
        ctx.textAlign = 'left';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText('Rotor Speed RPM (Dashed Cyan: Target | Green: Actual | Amber: Sensorless SMO)', padLeft + 10, padTop + 14);
        ctx.fillText('Torque Dynamics (Purple: Te Electromagnetic | Red: TL Mechanical Load)', padLeft + 10, botTop + 14);
    }
}
