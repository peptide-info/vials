(function() {
    // Prevent duplicate injections if the script is somehow called twice
    if (document.getElementById("calc-modal-overlay")) {
        return;
    }

    // ==========================================
    // 1. INJECT MODAL POPUP & INTERFACE CSS
    // ==========================================
    const calcStyles = `
        /* MODAL BACKGROUND OVERLAY */
        .calc-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(13, 17, 23, 0.7);
            backdrop-filter: blur(4px);
            z-index: 20000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
        }
        .calc-modal-overlay.active {
            opacity: 1;
            pointer-events: auto;
        }

        /* POPUP WINDOW CONTAINER */
        .calc-modal-content {
            background: #fff;
            width: 90%;
            max-width: 500px;
            max-height: 90vh;
            overflow-y: auto;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            position: relative;
            padding: 25px;
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            line-height: 1.5;
            color: #333;
            transform: translateY(20px);
            transition: transform 0.3s ease;
            background: linear-gradient(135deg, #ffeff2 0%, #fff6e5 25%, #f0fff0 50%, #e6f7ff 75%, #f9f0ff 100%);
        }
        .calc-modal-overlay.active .calc-modal-content {
            transform: translateY(0);
        }

        /* CLOSE WINDOW BUTTON */
        .calc-close-btn {
            position: absolute;
            top: 15px;
            right: 15px;
            background: rgba(0,0,0,0.05);
            border: none;
            font-size: 1.2rem;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s ease;
        }
        .calc-close-btn:hover {
            background: rgba(0,0,0,0.1);
        }

        .calc-modal-content h2 {
            border-bottom: 3px solid #ff9aa2; 
            padding-bottom: 0.3em; 
            color: #24292e; 
            margin-top: 0;
            margin-bottom: 20px;
            font-size: 1.5rem;
        }

        /* TAB CONTAINER STYLING */
        .tab-container {
            display: flex;
            gap: 5px;
            margin-bottom: -1px;
            position: relative;
            z-index: 2;
        }
        .tab-btn {
            flex: 1;
            padding: 10px;
            background: rgba(255, 255, 255, 0.6);
            border: 1px solid #d1d5da;
            border-bottom: none;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            color: #586069;
            border-top-left-radius: 8px;
            border-top-right-radius: 8px;
            text-align: center;
            transition: all 0.2s ease;
        }
        .tab-btn:hover {
            background: rgba(255, 255, 255, 0.9);
        }
        .tab-btn.active {
            background: #fff;
            color: #b30086;
            border-color: #d1d5da;
            border-bottom: 2px solid #fff;
            box-shadow: 0 -3px 0 #ff9aa2 inset;
        }

        /* PANEL FUNCTIONALITY */
        .calc-panel {
            display: none;
            background: #fff;
            border: 1px solid #d1d5da;
            border-radius: 8px;
            border-top-left-radius: 0;
            padding: 20px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        }
        .calc-panel.active {
            display: block;
        }

        /* FORM INPUT STYLING */
        .input-group {
            margin-bottom: 15px;
        }
        .input-group label {
            display: block;
            font-weight: 600;
            margin-bottom: 4px;
            font-size: 13px;
            color: #444;
        }
        .input-with-unit {
            display: flex;
            gap: 8px;
        }
        .input-with-unit input {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid #cccccc;
            border-radius: 6px;
            font-size: 15px;
            box-sizing: border-box;
        }
        .input-with-unit select {
            width: 85px;
            padding: 8px;
            border: 1px solid #cccccc;
            border-radius: 6px;
            background-color: #f6f8fa;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
        }

        /* PRESET BUTTON CHIPS */
        .preset-container {
            display: flex;
            gap: 4px;
            flex-wrap: wrap;
            margin-top: 6px;
        }
        .preset-btn {
            background-color: #fff;
            border: 1px solid #ddd;
            color: #555;
            padding: 4px 10px;
            font-size: 11px;
            font-weight: 600;
            border-radius: 20px;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .preset-btn:hover {
            border-color: #ffb7b2;
            background: linear-gradient(90deg, #ff9aa2, #ffb7b2, #ffdac1, #e2f0cb, #b5ead7, #c7ceea);
            color: #000;
        }

        /* DYNAMIC RESULTS BLOCKS */
        .result {
            margin-top: 20px;
            padding: 15px;
            background: linear-gradient(90deg, #e2f0cb, #b5ead7);
            border-left: 5px solid #28a745;
            border-radius: 6px;
            font-weight: bold;
            color: #1a622c;
            font-size: 16px;
        }
        .result.warning {
            background: linear-gradient(90deg, #ffeef0, #ffdadc);
            border-left: 5px solid #d73a49;
            color: #cb2431;
        }
        .sub-text {
            font-size: 12px; 
            font-weight: normal; 
            color: #666; 
            margin-top: 4px;
            line-height: 1.4;
        }

        /* ROUTE TOGGLE (Sub-Q / Nasal) */
        .route-toggle {
            display: flex;
            gap: 0;
            margin-bottom: 16px;
            border: 1px solid #d1d5da;
            border-radius: 8px;
            overflow: hidden;
            background: #f6f8fa;
        }
        .route-toggle label {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 10px 8px;
            font-size: 13px;
            font-weight: 600;
            color: #586069;
            cursor: pointer;
            margin: 0;
            transition: background 0.15s ease, color 0.15s ease;
            user-select: none;
        }
        .route-toggle label + label {
            border-left: 1px solid #d1d5da;
        }
        .route-toggle input {
            position: absolute;
            opacity: 0;
            pointer-events: none;
        }
        .route-toggle label:has(input:checked) {
            background: #fff;
            color: #b30086;
            box-shadow: inset 0 -3px 0 #ff9aa2;
        }
        .route-toggle label:hover {
            background: rgba(255,255,255,0.85);
        }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.innerText = calcStyles;
    document.head.appendChild(styleSheet);

    // ==========================================
    // 2. GENERATE MODAL POPUP MARKUP LAYOUT
    // ==========================================
    const overlay = document.createElement("div");
    overlay.id = "calc-modal-overlay";
    overlay.className = "calc-modal-overlay";

    overlay.innerHTML = `
        <div class="calc-modal-content">
            <button class="calc-close-btn" id="calc-close-modal">&times;</button>
            <h2>🧪 Peptide Toolkit</h2>

            <div class="tab-container">
                <button class="tab-btn active" id="pop-btn-standard">Syringe Unit Calc</button>
                <button class="tab-btn" id="pop-btn-reverse">Reverse Pen Calc</button>
            </div>

            <div id="pop-tab-standard" class="calc-panel active">
                <div class="route-toggle" role="radiogroup" aria-label="Administration route">
                    <label>
                        <input type="radio" name="pop_route" id="pop_route_subq" value="subq" checked>
                        Sub-Q
                    </label>
                    <label>
                        <input type="radio" name="pop_route" id="pop_route_nasal" value="nasal">
                        Nasal
                    </label>
                </div>
                <p class="sub-text" id="pop_route_hint" style="margin-top:-5px; margin-bottom: 15px;">Find out exactly how many units to pull based on your blend fluid ratio.</p>
                
                <div class="input-group">
                    <label>Peptide Amount</label>
                    <div class="input-with-unit">
                        <input type="number" id="pop_mg_1" value="5" step="any">
                        <select disabled><option>mg</option></select>
                    </div>
                    <div class="preset-container" data-target="pop_mg_1">
                        <button class="preset-btn" value="5">5 mg</button>
                        <button class="preset-btn" value="10">10 mg</button>
                        <button class="preset-btn" value="20">20 mg</button>
                        <button class="preset-btn" value="30">30 mg</button>
                    </div>
                </div>
                
                <div class="input-group">
                    <label>Reconstitution Volume</label>
                    <div class="input-with-unit">
                        <input type="number" id="pop_ml_1" value="2" step="any">
                        <select disabled><option>mL</option></select>
                    </div>
                    <div class="preset-container" data-target="pop_ml_1" id="pop_ml_presets">
                        <button class="preset-btn" value="1">1 mL</button>
                        <button class="preset-btn" value="2">2 mL</button>
                        <button class="preset-btn" value="3">3 mL</button>
                        <button class="preset-btn nasal-only-vol" value="4" hidden>4 mL</button>
                        <button class="preset-btn nasal-only-vol" value="10" hidden>10 mL</button>
                    </div>
                </div>
                
                <div class="input-group">
                    <label>Target Dose</label>
                    <div class="input-with-unit">
                        <input type="number" id="pop_dose_1" value="2" step="any">
                        <select id="pop_unit_1">
                            <option value="mg" selected>mg</option>
                            <option value="mcg">mcg</option>
                        </select>
                    </div>
                    <div class="preset-container" data-dose="pop_dose_1" data-unit="pop_unit_1">
                        <button class="preset-btn" data-v="2" data-u="mg">2 mg</button>
                        <button class="preset-btn" data-v="4" data-u="mg">4 mg</button>
                        <button class="preset-btn" data-v="6" data-u="mg">6 mg</button>
                        <button class="preset-btn" data-v="100" data-u="mcg">100 mcg</button>
                        <button class="preset-btn" data-v="250" data-u="mcg">250 mcg</button>
                        <button class="preset-btn" data-v="500" data-u="mcg">500 mcg</button>
                    </div>
                </div>
                
                <div id="pop_result_1" class="result">Required Pull: 80.0 units</div>
            </div>

            <div id="pop-tab-reverse" class="calc-panel">
                <p class="sub-text" style="margin-top:-5px; margin-bottom: 15px;">Find out how much water to add so your dose stays safely under your target unit cap.</p>
                
                <div class="input-group">
                    <label>Peptide Amount</label>
                    <div class="input-with-unit">
                        <input type="number" id="pop_mg_2" placeholder="e.g. 30" step="any">
                        <select disabled><option>mg</option></select>
                    </div>
                    <div class="preset-container" data-target="pop_mg_2">
                        <button class="preset-btn" value="5">5 mg</button>
                        <button class="preset-btn" value="10">10 mg</button>
                        <button class="preset-btn" value="20">20 mg</button>
                        <button class="preset-btn" value="30">30 mg</button>
                    </div>
                </div>
                
                <div class="input-group">
                    <label>Target Dose</label>
                    <div class="input-with-unit">
                        <input type="number" id="pop_dose_2" placeholder="e.g. 2" step="any">
                        <select id="pop_unit_2">
                            <option value="mg" selected>mg</option>
                            <option value="mcg">mcg</option>
                        </select>
                    </div>
                    <div class="preset-container" data-dose="pop_dose_2" data-unit="pop_unit_2">
                        <button class="preset-btn" data-v="1" data-u="mg">1 mg</button>
                        <button class="preset-btn" data-v="2" data-u="mg">2 mg</button>
                        <button class="preset-btn" data-v="4" data-u="mg">4 mg</button>
                        <button class="preset-btn" data-v="6" data-u="mg">6 mg</button>
                        <button class="preset-btn" data-v="8" data-u="mg">8 mg</button>
                        <button class="preset-btn" data-v="100" data-u="mcg">100 mcg</button>
                        <button class="preset-btn" data-v="250" data-u="mcg">250 mcg</button>
                        <button class="preset-btn" data-v="500" data-u="mcg">500 mcg</button>
                    </div>
                </div>
                
                <div class="input-group">
                    <label>Max Allowed Volume Per Dose</label>
                    <div class="input-with-unit">
                        <input type="number" id="pop_max_units" value="60" step="any">
                        <select disabled><option>units</option></select>
                    </div>
                    <div class="preset-container" data-target="pop_max_units">
                        <button class="preset-btn" value="20">20 u</button>
                        <button class="preset-btn" value="40">40 u</button>
                        <button class="preset-btn" value="60">60 u</button>
                    </div>
                </div>
                
                <div id="pop_result_2" class="result">Please enter values to calculate.</div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // ==========================================
    // 3. CORE MATHEMATICAL CALCULATION ENGINE
    // ==========================================
    const inputs = {
        mg1: document.getElementById('pop_mg_1'),
        ml1: document.getElementById('pop_ml_1'),
        dose1: document.getElementById('pop_dose_1'),
        unit1: document.getElementById('pop_unit_1'),
        mg2: document.getElementById('pop_mg_2'),
        dose2: document.getElementById('pop_dose_2'),
        unit2: document.getElementById('pop_unit_2'),
        maxUnits: document.getElementById('pop_max_units')
    };
    const result1 = document.getElementById('pop_result_1');
    const result2 = document.getElementById('pop_result_2');
    const routeHint = document.getElementById('pop_route_hint');
    const SPRAY_ML = 0.1; // standard metered nasal spray volume

    function getSelectedRoute() {
        const checked = document.querySelector('input[name="pop_route"]:checked');
        return checked ? checked.value : 'subq';
    }

    function setRoute(route) {
        const value = route === 'nasal' ? 'nasal' : 'subq';
        const radio = document.getElementById(value === 'nasal' ? 'pop_route_nasal' : 'pop_route_subq');
        if (radio) radio.checked = true;
        updateRouteHint();
        updateNasalVolumePresets();
    }

    function updateRouteHint() {
        if (!routeHint) return;
        if (getSelectedRoute() === 'nasal') {
            routeHint.textContent = 'Find out how many nasal sprays you need (0.1 mL per spray) based on your blend fluid ratio. Use total spray-bottle volume (e.g. 4 mL or 10 mL).';
        } else {
            routeHint.textContent = 'Find out exactly how many units to pull based on your blend fluid ratio.';
        }
    }

    function updateNasalVolumePresets() {
        const isNasal = getSelectedRoute() === 'nasal';
        document.querySelectorAll('.nasal-only-vol').forEach(btn => {
            btn.hidden = !isNasal;
        });
    }

    function formatDoseAmount(mcg) {
        if (mcg >= 1000) {
            const mg = mcg / 1000;
            return (Number.isInteger(mg) || Math.abs(mg - Math.round(mg)) < 0.001)
                ? `${Math.round(mg)} mg`
                : `${parseFloat(mg.toFixed(2))} mg`;
        }
        return (Number.isInteger(mcg) || Math.abs(mcg - Math.round(mcg)) < 0.1)
            ? `${Math.round(mcg)} mcg`
            : `${parseFloat(mcg.toFixed(1))} mcg`;
    }

    function formatSprayLabel(n) {
        return n === 1 ? '1 spray' : `${n} sprays`;
    }

    function calculateStandard() {
        const mgVal = parseFloat(inputs.mg1.value);
        const mlVal = parseFloat(inputs.ml1.value);
        let targetDose = parseFloat(inputs.dose1.value);

        if (!mgVal || !mlVal || !targetDose) {
            result1.innerHTML = "Please fill in all values.";
            return;
        }

        if (inputs.unit1.value === 'mg') { targetDose = targetDose * 1000; }

        const totalMcg = mgVal * 1000;
        const mlNeeded = (targetDose / totalMcg) * mlVal;
        const route = getSelectedRoute();

        result1.className = "result";

        if (route === 'nasal') {
            const spraysExact = mlNeeded / SPRAY_ML;
            const mcgPerSpray = (totalMcg / mlVal) * SPRAY_ML;
            const rounded = Math.round(spraysExact);

            // Treat near-integers as exact (floating point / rounding noise)
            if (Math.abs(spraysExact - rounded) < 0.02 && rounded > 0) {
                result1.innerHTML = `Required: ${formatSprayLabel(rounded)} <br><span class="sub-text" style="display:block; margin-top:6px;">Each spray delivers 0.1 mL (${formatDoseAmount(mcgPerSpray)}).</span>`;
                return;
            }

            const low = Math.max(0, Math.floor(spraysExact));
            const high = Math.ceil(spraysExact);
            const lowDose = low * mcgPerSpray;
            const highDose = high * mcgPerSpray;

            let nearestHtml = `Target volume is <strong>${spraysExact.toFixed(2)} sprays</strong> (not an exact spray count).<br>`;
            nearestHtml += `<span style="font-weight:normal; font-size:13px; color:#333; display:block; margin-top:8px;">Nearest options:</span>`;
            nearestHtml += `<span style="font-weight:normal; font-size:13px; color:#333; display:block; margin-top:4px;">• <strong>${formatSprayLabel(low)}</strong> → ${formatDoseAmount(lowDose)}${low === 0 ? ' (no dose)' : ''}</span>`;
            if (high !== low) {
                nearestHtml += `<span style="font-weight:normal; font-size:13px; color:#333; display:block;">• <strong>${formatSprayLabel(high)}</strong> → ${formatDoseAmount(highDose)}</span>`;
            }
            nearestHtml += `<span class="sub-text" style="display:block; margin-top:6px;">Each spray = 0.1 mL.</span>`;
            result1.innerHTML = nearestHtml;
            return;
        }

        // Sub-Q: U-100 syringe units (100 units = 1 mL)
        const unitsRequired = mlNeeded * 100;

        if (unitsRequired > 100) {
            result1.innerHTML = `Required Pull: ${unitsRequired.toFixed(1)} units <br><span style="font-size:11px; font-weight:normal; color:#555;">⚠️ Warning: Exceeds a single 100-unit syringe capacity.</span>`;
        } else {
            result1.innerHTML = `Required Pull: ${unitsRequired.toFixed(1)} units`;
        }
    }

    function calculateReverse() {
        const mgVal = parseFloat(inputs.mg2.value);
        let targetDose = parseFloat(inputs.dose2.value);
        const maxU = parseFloat(inputs.maxUnits.value);

        if (!mgVal || !targetDose || !maxU) {
            result2.className = "result warning";
            result2.innerHTML = "Please fill in all values.";
            return;
        }

        if(inputs.unit2.value === 'mg') { targetDose = targetDose * 1000; }
        const totalMcg = mgVal * 1000;
        const totalDoses = totalMcg / targetDose;

        const maxMlPerDose = maxU / 100;
        const maxWaterAllowed = totalDoses * maxMlPerDose;

        result2.className = "result";

        if (maxWaterAllowed <= 0) {
            result2.className = "result warning";
            result2.innerHTML = `⚠️ Impossible mix: The requested dose is larger than your total vial content.`;
        } 
        else if (maxWaterAllowed < 0.5) {
            result2.className = "result warning";
            result2.innerHTML = `⚠️ Warning: To stay under ${maxU} units, you must drop to ${maxWaterAllowed.toFixed(2)} mL of water. This may be too dense to fully dissolve the powder.`;
        }
        else {
            const optimalWater = Math.min(maxWaterAllowed, 3.00);
            const actualUnitsPerDose = (targetDose * (optimalWater * 100)) / totalMcg;

            result2.innerHTML = `Mix with: ${optimalWater.toFixed(2)} mL of water<br><span style="font-weight:normal; font-size:13px; color:#333;">This creates the perfect density for a dose of exactly <strong>${actualUnitsPerDose.toFixed(1)} units</strong> (safely matching or under your ${maxU} unit limit).</span>`;
        }
    }

    // ==========================================
    // 4. TAB CONTROLS, MODAL & EVENT LISTENERS
    // ==========================================
    const tabBtnStandard = document.getElementById("pop-btn-standard");
    const tabBtnReverse = document.getElementById("pop-btn-reverse");
    const panelStandard = document.getElementById("pop-tab-standard");
    const panelReverse = document.getElementById("pop-tab-reverse");

    function switchTab(mode) {
        if(mode === 'standard') {
            tabBtnStandard.classList.add('active');
            tabBtnReverse.classList.remove('active');
            panelStandard.classList.add('active');
            panelReverse.classList.remove('active');
        } else {
            tabBtnStandard.classList.remove('active');
            tabBtnReverse.classList.add('active');
            panelStandard.classList.remove('active');
            panelReverse.classList.add('active');
        }
    }

    tabBtnStandard.addEventListener("click", () => switchTab('standard'));
    tabBtnReverse.addEventListener("click", () => switchTab('reverse'));

    // Form live recalculation listeners
    [inputs.mg1, inputs.ml1, inputs.dose1].forEach(el => el.addEventListener('input', calculateStandard));
    [inputs.mg2, inputs.dose2, inputs.maxUnits].forEach(el => el.addEventListener('input', calculateReverse));
    inputs.unit1.addEventListener('change', calculateStandard);
    inputs.unit2.addEventListener('change', calculateReverse);
    document.querySelectorAll('input[name="pop_route"]').forEach(el => {
        el.addEventListener('change', () => {
            updateRouteHint();
            updateNasalVolumePresets();
            calculateStandard();
        });
    });
    updateRouteHint();
    updateNasalVolumePresets();

    // Dynamic preset chip listeners
    document.querySelectorAll(".preset-container").forEach(container => {
        container.addEventListener("click", (e) => {
            if (!e.target.classList.contains("preset-btn")) return;
            
            const singleTarget = container.getAttribute("data-target");
            if (singleTarget) {
                document.getElementById(singleTarget).value = e.target.value;
            } else {
                const doseId = container.getAttribute("data-dose");
                const unitId = container.getAttribute("data-unit");
                document.getElementById(doseId).value = e.target.getAttribute("data-v");
                document.getElementById(unitId).value = e.target.getAttribute("data-u");
            }
            calculateStandard();
            calculateReverse();
        });
    });

    // Modal Closing Interactions
    const closeModalBtn = document.getElementById("calc-close-modal");
    function closePopup() {
        overlay.classList.remove("active");
    }
    closeModalBtn.addEventListener("click", closePopup);
    overlay.addEventListener("click", (e) => {
        if(e.target === overlay) closePopup();
    });

// ==========================================
    // 5. GLOBAL EXPOSURE HOOK (Called by Nav file)
    // ==========================================
    window.openPeptideCalculator = function() {
        // Read defaults passed from the nav file if they exist
        if (window.activeCalcDefaults) {
            const defs = window.activeCalcDefaults;
            
            // Re-verify element references are fresh
            const targetInputs = {
                mg1: document.getElementById('pop_mg_1'),
                ml1: document.getElementById('pop_ml_1'),
                dose1: document.getElementById('pop_dose_1'),
                unit1: document.getElementById('pop_unit_1'),
                mg2: document.getElementById('pop_mg_2'),
                dose2: document.getElementById('pop_dose_2'),
                unit2: document.getElementById('pop_unit_2')
            };
            
            // Apply to Tab 1 (Standard)
            if (targetInputs.mg1) targetInputs.mg1.value = defs.mg;
            if (targetInputs.ml1) targetInputs.ml1.value = defs.ml;
            if (targetInputs.dose1) targetInputs.dose1.value = defs.dose;
            if (targetInputs.unit1) targetInputs.unit1.value = defs.unit;
            
            // Apply to Tab 2 (Reverse)
            if (targetInputs.mg2) targetInputs.mg2.value = defs.mg;
            if (targetInputs.dose2) targetInputs.dose2.value = defs.dose;
            if (targetInputs.unit2) targetInputs.unit2.value = defs.unit;

            // Page default route: Sub-Q vs Nasal
            setRoute(defs.route || 'subq');
        }

        overlay.classList.add("active");
        calculateStandard();
        calculateReverse();
    };

})();
