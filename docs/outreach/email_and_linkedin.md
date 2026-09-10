# Technical Outreach Package: Danfoss Drives & Power Electronics

## 1. Target Executive & Engineering Contacts
* **Primary Organization:** Danfoss Power Electronics A/S (Danfoss Drives)
* **Location:** Ulsnæs 1, 6300 Gråsten, Denmark (with additional R&D hubs in Kolding & Vaasa)
* **Department:** *Drives R&D / Power Electronics Software & Control Engineering*
* **Target Roles:**
  * Director of Drives R&D / Head of Software Engineering
  * Lead Motor Control Specialist (FOC & Sensorless Algorithms)
  * Senior Power Electronics / Firmware Architect
  * Power Electronics Control Engineering Manager
* **LinkedIn Boolean Search Query:**  
  `("Danfoss" OR "Danfoss Drives") AND ("Gråsten" OR "Kolding" OR "South Denmark") AND ("Motor Control" OR "Field Oriented Control" OR "Power Electronics" OR "Inverter") AND ("Lead" OR "Director" OR "Architect" OR "Manager")`

---

## 2. Reverse-Engineered Cold Outreach Email

**Subject:** Interactive Drive Twin: Sensorless PMSM FOC, SVPWM & Dead-Time Compensation

> Dear [First Name / Hiring Manager],
>
> In high-performance industrial drives like the Danfoss VLT and VACON series, eliminating shaft encoders while maintaining full breakout torque at zero speed requires precise rotor flux estimation and strict inverter non-linearity compensation.
>
> To explore these algorithms hands-on, I developed an interactive in-browser **Sensorless PMSM Field-Oriented Control (FOC) Digital Twin**:
>
> 🔗 **Live Simulator:** https://elomarjc.github.io/pmsm-foc-drive-twin/  
> 🔗 **Source Code & Derivations:** https://github.com/elomarjc/pmsm-foc-drive-twin
>
> **Algorithms running live in the twin:**
> * **Vector Decoupling ($dq$-control):** Decoupled current loop PI controllers running in the synchronous rotating reference frame ($i_d = 0$ control and MTPA trajectory).
> * **SVPWM Modulation:** Exact sector identification and duty-cycle generation for the 8 inverter switching vectors, maximizing DC-link voltage utilization ($V_{\text{max}} = V_{dc}/\sqrt{3}$).
> * **Sensorless Sliding Mode Observer:** Back-EMF estimation with continuous sigmoid switching functions and phase-locked loop (PLL) rotor position tracking.
> * **Dead-Time Harmonic Suppression:** Active volt-second error compensation eliminating 5th and 7th current harmonics.
>
> Having completed my Bachelor's Project in Electronic Engineering at Aalborg University with deep coursework in control theory, state-space modeling, and embedded systems, I have long followed Danfoss' power electronics leadership in Gråsten.
>
> I would love to get your feedback on the observer stability during low-speed load transients.
>
> Best regards,  
> **Jacob El-Omar**  
> Aalborg, Denmark | +45 XX XX XX XX | [LinkedIn Profile URL]

---

## 3. High-Impact LinkedIn Post

```markdown
⚡ Real-Time Sensorless Field-Oriented Control (FOC) & SVPWM in the Browser ⚡

Eliminating mechanical shaft encoders from industrial PMSM motors reduces cost and failure rates—but tracking rotor position at low speeds without back-EMF is one of power electronics' classic challenges.

I built an interactive in-browser **PMSM FOC & Inverter Digital Twin** to simulate and visualize vector control dynamics at 60 FPS:

🚀 Live Demo: https://elomarjc.github.io/pmsm-foc-drive-twin/
💻 GitHub Repo: https://github.com/elomarjc/pmsm-foc-drive-twin

Key Technical Highlights:
🔹 Clarke & Park Transformations: Real-time decomposition of 3-phase currents into direct (flux) and quadrature (torque) axes.
🔹 Space Vector PWM (SVPWM): Visualizes the voltage space vector traversing the 6 inverter sectors with dwell-time computation, achieving 15.5% higher DC-link utilization than sinusoidal PWM.
🔹 Sensorless Sliding Mode Observer (SMO): Estimates rotor angle θe and speed ωe with zero-crossing chattering suppression via boundary layer saturation.
🔹 Inverter Dead-Time Compensation: Corrects for power switch turn-off delays, extinguishing 5th and 7th order current distortion.

Check out the interactive scopes, apply load disturbances, and watch the control loops react!

#PowerElectronics #MotorControl #Danfoss #DanfossDrives #FOC #EmbeddedSystems #SVPWM #ElectricalEngineering #AalborgUniversity
```
