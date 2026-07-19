document.addEventListener("DOMContentLoaded", () => {
    // Resolve asset paths relative to this script (works locally + GitHub Pages)
    const navScriptEl = document.querySelector('script[src*="global-nav"]');
    const navBase = navScriptEl
        ? navScriptEl.src.replace(/global-nav\.js(\?.*)?$/, '')
        : 'https://peptide-info.github.io/vials/';

    // Shared protocol sheet theme (single file to restyle all peptide pages)
    if (!document.getElementById('protocol-theme-css')) {
        const themeLink = document.createElement('link');
        themeLink.id = 'protocol-theme-css';
        themeLink.rel = 'stylesheet';
        themeLink.href = navBase + 'css/protocol-theme.css?v=9';
        document.head.appendChild(themeLink);
    }
    document.body.classList.add('protocol-page');

    // ==========================================
    // 2. PEPTIDE CONFIGURATION ARRAY (Add New Pages Here)
    // ==========================================
    // route: 'subq' (syringe units) or 'nasal' (0.1 mL sprays)
    // NOTE: more-specific filenames must be listed before shorter prefixes they contain
    const PEPTIDE_CONFIGS = [
        { filename: 'bac-water-3ml',                      mg: '',  ml: '',  dose: '',   unit: 'mg',  route: 'subq' },
        { filename: '5-amino-1mq',                         mg: 50,  ml: 2,   dose: 2,     unit: 'mg',  route: 'subq' },
        { filename: 'ghk-cu-100mg-with-bpc-157-10mg',      mg: 50,  ml: 3,   dose: 2.5,   unit: 'mg',  route: 'subq' },
        { filename: 'cjc-1295-no-dac-with-ipamorelin',     mg: 10,  ml: 2,   dose: 300,   unit: 'mcg', route: 'subq' },
        { filename: 'bpc-157-tb-500',                      mg: 10,  ml: 2,   dose: 250,   unit: 'mcg', route: 'subq' },
        { filename: 'glow',                                mg: 70,  ml: 2,   dose: 3.5,   unit: 'mg',  route: 'subq' },
        { filename: 'klow',                                mg: 80,  ml: 2,   dose: 4,     unit: 'mg',  route: 'subq' },
        { filename: 'cjc-1295-no-dac',                     mg: 5,   ml: 2,   dose: 100,   unit: 'mcg', route: 'subq' },
        { filename: 'cjc-1295-dac',                        mg: 5,   ml: 2,   dose: 2,     unit: 'mg',  route: 'subq' },
        { filename: 'thymosin-alpha-1',                    mg: 5,   ml: 2,   dose: 1.6,   unit: 'mg',  route: 'subq' },
        { filename: 'melanotan-2',                         mg: 10,  ml: 2,   dose: 250,   unit: 'mcg', route: 'subq' },
        { filename: 'tirzepatide',                         mg: 30,  ml: 3,   dose: 2.5,   unit: 'mg',  route: 'subq' },
        { filename: 'semaglutide',                         mg: 10,  ml: 2,   dose: 0.25,  unit: 'mg',  route: 'subq' },
        { filename: 'cagrilintide',                        mg: 5,   ml: 2,   dose: 0.6,   unit: 'mg',  route: 'subq' },
        { filename: 'retatrutide-cagrilintide',            mg: 10,  ml: 1,   dose: 0.5,   unit: 'mg',  route: 'subq' },
        { filename: 'retatrutide',                         mg: 30,  ml: 3,   dose: 2,     unit: 'mg',  route: 'subq' },
        { filename: 'tesamorelin',                         mg: 10,  ml: 2,   dose: 2,     unit: 'mg',  route: 'subq' },
        { filename: 'ipamorelin',                          mg: 5,   ml: 2,   dose: 200,   unit: 'mcg', route: 'subq' },
        { filename: 'bpc-157',                             mg: 5,   ml: 2,   dose: 375,   unit: 'mcg', route: 'subq' },
        { filename: 'tb-500',                              mg: 5,   ml: 2,   dose: 2,     unit: 'mg',  route: 'subq' },
        { filename: 'ghk-cu',                              mg: 100, ml: 3,   dose: 2,     unit: 'mg',  route: 'subq' },
        { filename: 'kpv',                                 mg: 5,   ml: 2,   dose: 500,   unit: 'mcg', route: 'subq' },
        { filename: 'pt-141',                              mg: 10,  ml: 4,   dose: 1,     unit: 'mg',  route: 'nasal' },
        { filename: 'selank',                              mg: 5,   ml: 4,   dose: 250,   unit: 'mcg', route: 'nasal' },
        { filename: 'semax',                               mg: 5,   ml: 4,   dose: 300,   unit: 'mcg', route: 'nasal' },
        { filename: 'epitalon',                            mg: 10,  ml: 2,   dose: 5,     unit: 'mg',  route: 'subq' },
        { filename: 'mots-c',                              mg: 10,  ml: 1,   dose: 5,     unit: 'mg',  route: 'subq' },
        { filename: 'nad',                                 mg: 500, ml: 5,   dose: 50,    unit: 'mg',  route: 'subq' },
        { filename: 'dsip',                                mg: 5,   ml: 2,   dose: 100,   unit: 'mcg', route: 'subq' },
        { filename: 'ghrp-2',                              mg: 5,   ml: 2,   dose: 100,   unit: 'mcg', route: 'subq' },
        { filename: 'ghrp-6',                              mg: 5,   ml: 2,   dose: 100,   unit: 'mcg', route: 'subq' },
        { filename: 'pe-22-28',                            mg: 10,  ml: 2,   dose: 250,   unit: 'mcg', route: 'subq' },
        { filename: 'pinealon',                            mg: 10,  ml: 2,   dose: 100,   unit: 'mcg', route: 'subq' },
        { filename: 'pnc-27',                              mg: 5,   ml: 2,   dose: 250,   unit: 'mcg', route: 'subq' },
        { filename: 'peg-mgf',                             mg: 2,   ml: 1,   dose: 200,   unit: 'mcg', route: 'subq' },
        { filename: 'mgf',                                 mg: 2,   ml: 1,   dose: 200,   unit: 'mcg', route: 'subq' },
        { filename: 'cagrisema',                           mg: 5,   ml: 1,   dose: 0.25,  unit: 'mg',  route: 'subq' },
        { filename: 'survodutide',                         mg: 10,  ml: 1,   dose: 0.3,   unit: 'mg',  route: 'subq' },
        { filename: 'mazdutide',                           mg: 5,   ml: 1,   dose: 1.5,   unit: 'mg',  route: 'subq' },
        { filename: 'mt-1',                                mg: 10,  ml: 2,   dose: 500,   unit: 'mcg', route: 'subq' },
        { filename: 'thymalin',                            mg: 10,  ml: 2,   dose: 5,     unit: 'mg',  route: 'subq' },
        { filename: 'ss-31',                               mg: 10,  ml: 2,   dose: 5,     unit: 'mg',  route: 'subq' },
        { filename: 'll-37',                               mg: 5,   ml: 2,   dose: 100,   unit: 'mcg', route: 'subq' },
        { filename: 'vip',                                 mg: 5,   ml: 4,   dose: 50,    unit: 'mcg', route: 'nasal' }
    ];

    // ABSOLUTE SYSTEM FALLBACKS (If a page isn't in the list above)
    let calcDefaults = { mg: 5, ml: 2, dose: 2, unit: 'mg', route: 'subq' };

    // AUTOMATIC DETECTION ENGINE
    const urlParts = window.location.pathname.split('/');
    const currentFilename = urlParts[urlParts.length - 1].toLowerCase();

    // Find the matching configuration block for defaults
    const matchedConfig = PEPTIDE_CONFIGS.find(config => currentFilename.includes(config.filename.toLowerCase()));
    if (matchedConfig) {
        calcDefaults = { 
            mg: matchedConfig.mg, 
            ml: matchedConfig.ml, 
            dose: matchedConfig.dose, 
            unit: matchedConfig.unit,
            route: matchedConfig.route || 'subq'
        };
    }

    // ==========================================
    
    // 3. Inject CSS for the navigation bar container, buttons, and splash animation
    const styles = `
        /* FLOATING NAVIGATION LAYER CONTAINER */
        .header-nav-container {
            position: fixed;
            top: 15px;
            left: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
            z-index: 9999;
        }

/* FIXED BUTTON ELEMENTS BASE */
.home-btn, .nav-calc-btn, .nav-email-btn {
    width: 36px;
    height: 36px;
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    font-size: 1.1rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    cursor: pointer;
    box-sizing: border-box;
    padding: 0;
    transition: transform 0.2s ease, border-color 0.2s ease;
}

.home-btn:hover, .nav-calc-btn:hover, .nav-email-btn:hover {
    transform: scale(1.05);
    border-color: #58a6ff;
}
        @media (max-width: 600px) {
            body { padding-top: 50px !important; }
        }

        /* TRANSLUCENT SPLASH SCREEN OVERLAY */
        .splash-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: rgba(13, 17, 23, 0.85); 
            backdrop-filter: blur(5px);
            display: grid;
            place-items: center;
            z-index: 10000;
            opacity: 1;
            transition: opacity 0.6s ease-out;
            overflow: hidden;
        }

        /* VIAL + SYRINGE LOADING SCENE (Nyan-rainbow liquid) */
        .vial-scene {
            position: relative;
            font-size: min(4.5vw, 17px);
            display: flex;
            flex-direction: column;
            align-items: center;
            pointer-events: none;
        }

        /* --- Syringe (descends from top, needle pierces the cap) --- */
        .splash-syringe {
            position: relative;
            width: 3em;
            height: 12.5em;
            margin-bottom: -1.5em;
            z-index: 2;
            transform: translateY(-95vh);
            animation: syringeIn 0.7s cubic-bezier(0.4, 1.25, 0.55, 1) 0.45s forwards;
        }

        .syringe-plunger {
            position: absolute;
            bottom: 3.15em;
            left: 50%;
            width: 0.55em;
            height: 6.2em;
            margin-left: -0.275em;
            background: linear-gradient(90deg, #6c7a88, #aeb9c4, #6c7a88);
            border-radius: 0.1em;
            animation: plungerPull 1.5s cubic-bezier(0.45, 0, 0.3, 1) 1.35s forwards;
        }

        .syringe-plunger::before {
            content: "";
            position: absolute;
            top: -0.4em;
            left: 50%;
            width: 2.2em;
            height: 0.45em;
            margin-left: -1.1em;
            background: linear-gradient(180deg, #cfd6dd, #8a949e);
            border-radius: 0.2em;
        }

        .syringe-barrel {
            position: absolute;
            bottom: 2.3em;
            left: 50%;
            width: 2.4em;
            height: 5.6em;
            margin-left: -1.2em;
            border: 2px solid rgba(255, 255, 255, 0.75);
            border-radius: 0.35em 0.35em 0.15em 0.15em;
            background: rgba(255, 255, 255, 0.10);
            overflow: hidden;
            box-sizing: border-box;
        }

        .syringe-flange {
            position: absolute;
            bottom: 7.75em;
            left: 50%;
            width: 3.7em;
            height: 0.3em;
            margin-left: -1.85em;
            background: rgba(255, 255, 255, 0.8);
            border-radius: 0.15em;
        }

        .syringe-liquid {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 0.25em;
            animation:
                syringeFill 1.5s cubic-bezier(0.45, 0, 0.3, 1) 1.35s forwards,
                nyanScroll 0.9s linear infinite;
        }

        .syringe-stopper {
            position: absolute;
            bottom: 0.25em;
            left: 0;
            width: 100%;
            height: 0.6em;
            background: #2e3942;
            border-radius: 0.12em;
            animation: plungerPull 1.5s cubic-bezier(0.45, 0, 0.3, 1) 1.35s forwards;
        }

        .syringe-needle {
            position: absolute;
            bottom: 0;
            left: 50%;
            width: 0.16em;
            height: 2.3em;
            margin-left: -0.08em;
            background: linear-gradient(90deg, #9aa5b1, #eef2f6, #9aa5b1);
        }

        /* --- Vial --- */
        .splash-vial {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            transform: scale(0);
            animation: vialPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .vial-cap {
            width: 3.4em;
            height: 1.1em;
            background: linear-gradient(180deg, #cfd6dd, #8a949e);
            border-radius: 0.3em 0.3em 0.12em 0.12em;
        }

        .vial-neck {
            width: 2.4em;
            height: 0.7em;
            background: rgba(255, 255, 255, 0.18);
            border-left: 2px solid rgba(255, 255, 255, 0.55);
            border-right: 2px solid rgba(255, 255, 255, 0.55);
            box-sizing: border-box;
        }

        .vial-body {
            position: relative;
            width: 8em;
            height: 9.5em;
            border: 2px solid rgba(255, 255, 255, 0.65);
            border-radius: 0.8em 0.8em 1.6em 1.6em;
            background: rgba(255, 255, 255, 0.08);
            overflow: hidden;
            box-sizing: border-box;
        }

        .vial-liquid {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 84%;
            animation:
                vialDrain 1.5s cubic-bezier(0.45, 0, 0.3, 1) 1.35s forwards,
                nyanScroll 0.9s linear infinite;
        }

        /* Nyan Cat rainbow trail */
        .vial-liquid,
        .syringe-liquid {
            background-image: linear-gradient(180deg,
                #ff2222 0%,     #ff2222 16.66%,
                #ff9900 16.66%, #ff9900 33.33%,
                #ffee00 33.33%, #ffee00 50%,
                #33dd22 50%,    #33dd22 66.66%,
                #0099ff 66.66%, #0099ff 83.33%,
                #6633ff 83.33%, #6633ff 100%);
            background-size: 100% 2.7em;
            background-repeat: repeat;
        }

        .vial-label {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 82%;
            box-sizing: border-box;
            background: rgba(255, 255, 255, 0.94);
            border-radius: 0.35em;
            padding: 0.45em 0.3em;
            font-family: "Outfit", Arial, sans-serif;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            text-align: center;
            color: #1c2a24;
            line-height: 1.2;
            box-shadow: 0 0.1em 0.4em rgba(0, 0, 0, 0.35);
        }

        .nyan-star {
            position: absolute;
            color: #fff;
            font-size: 1.2em;
            text-shadow: 0 0 0.45em rgba(255, 255, 255, 0.9);
            opacity: 0;
            animation: starTwinkle 1.4s ease-in-out infinite;
        }

        @keyframes vialPop {
            0%   { transform: scale(0); }
            100% { transform: scale(1); }
        }

        @keyframes syringeIn {
            0%   { transform: translateY(-95vh); }
            100% { transform: translateY(0); }
        }

        @keyframes plungerPull {
            to { transform: translateY(-4.3em); }
        }

        @keyframes syringeFill {
            to { height: 4.55em; }
        }

        @keyframes vialDrain {
            to { height: 16%; }
        }

        @keyframes nyanScroll {
            to { background-position-y: 2.7em; }
        }

        @keyframes starTwinkle {
            0%, 100% { opacity: 0; transform: scale(0.55); }
            50%      { opacity: 1; transform: scale(1.1); }
        }

        @media (prefers-reduced-motion: reduce) {
            .splash-syringe, .splash-vial {
                animation: none;
                transform: none;
            }
            .syringe-plunger, .syringe-stopper, .syringe-liquid,
            .vial-liquid, .nyan-star {
                animation: none;
            }
            .nyan-star { opacity: 0.8; }
        }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // 4. Create Navigation wrapper block
    const navContainer = document.createElement("div");
    navContainer.className = "header-nav-container";

    // Create the floating home button
    const homeButton = document.createElement("a");
    homeButton.href = 'https://peptide-info.github.io/vials/index.html';
    homeButton.className = "home-btn";
    homeButton.title = "Back to Directory";
    homeButton.innerHTML = "🏠";

    // Create the new calculator button
    const calcButton = document.createElement("button");
    calcButton.className = "nav-calc-btn";
    calcButton.title = "Open Dosing Calculator";
    calcButton.innerHTML = "🧮";

    // Create the new email button
    const emailButton = document.createElement("button");
    emailButton.className = "nav-email-btn";
    emailButton.title = "Email Sheet Results";
    emailButton.innerHTML = "✉️";

    // Assemble buttons into top bar container layout
    navContainer.appendChild(homeButton);
    navContainer.appendChild(calcButton);
    navContainer.appendChild(emailButton); // Added next to calculator
    document.body.insertBefore(navContainer, document.body.firstChild);

    // 5. Create and inject the Splash Screen (syringe drawing rainbow liquid from a labeled vial)
    const splashContainer = document.createElement("div");
    splashContainer.className = "splash-overlay";

    // Page name: prefer the page's <h1>, fall back to <title> minus "Protocol"
    const h1El = document.querySelector('h1');
    let pageName = (h1El && h1El.textContent.trim())
        || document.title.replace(/\s*Protocol\s*$/i, '').trim()
        || 'Peptide Info';

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const scene = document.createElement('div');
    scene.className = 'vial-scene';
    scene.setAttribute('role', 'img');
    scene.setAttribute('aria-label', 'Loading ' + pageName);
    scene.innerHTML = `
        <div class="nyan-star" style="top: 4%;  left: -3em;    animation-delay: 0s;">✦</div>
        <div class="nyan-star" style="top: 30%; right: -3.2em; animation-delay: 0.35s;">✦</div>
        <div class="nyan-star" style="top: 58%; left: -3.8em;  animation-delay: 0.7s;">✦</div>
        <div class="nyan-star" style="top: 82%; right: -2.6em; animation-delay: 1.05s;">✦</div>
        <div class="splash-syringe">
            <div class="syringe-plunger"></div>
            <div class="syringe-barrel">
                <div class="syringe-liquid"></div>
                <div class="syringe-stopper"></div>
            </div>
            <div class="syringe-flange"></div>
            <div class="syringe-needle"></div>
        </div>
        <div class="splash-vial">
            <div class="vial-cap"></div>
            <div class="vial-neck"></div>
            <div class="vial-body">
                <div class="vial-liquid"></div>
                <div class="vial-label"></div>
            </div>
        </div>
    `;

    // Label the vial with the page name, shrinking to fit long names
    const labelEl = scene.querySelector('.vial-label');
    labelEl.textContent = pageName;
    labelEl.style.fontSize = Math.max(0.55, Math.min(1.05, 9 / pageName.length)) + 'em';

    splashContainer.appendChild(scene);
    document.body.appendChild(splashContainer);

    function dismissSplash() {
        splashContainer.style.opacity = "0";
        setTimeout(() => {
            splashContainer.remove();
        }, 600);
    }

    splashContainer.addEventListener("click", () => {
        dismissSplash();
    });

    // 6. TIMING ENGINE — pop-in (0.5s) + syringe descent (0.45–1.15s) + draw (1.35–2.85s) + brief hold
    const showFor = reducedMotion ? 1200 : 3500;
    setTimeout(() => {
        if (document.body.contains(splashContainer)) {
            dismissSplash();
        }
    }, showFor);

    // ==========================================
    // 7. POPUP SCRIPT LAUNCHER LOGIC (Calculator)
    // ==========================================
    let isCalcScriptLoaded = false;

    calcButton.addEventListener("click", () => {
        window.activeCalcDefaults = calcDefaults;

        if (isCalcScriptLoaded) {
            if (typeof window.openPeptideCalculator === "function") {
                window.openPeptideCalculator();
            }
            return;
        }

        console.log("Initializing toolkit setup module injection...");
        const calcScript = document.createElement("script");
        calcScript.src = navBase + 'js/calculator-popup.js?v=13';
        
        calcScript.onload = () => {
            isCalcScriptLoaded = true;
            if (typeof window.openPeptideCalculator === "function") {
                window.openPeptideCalculator();
            }
        };

        calcScript.onerror = () => {
            alert("Failed to load calculator tool. Please check your connection or repository paths.");
        };

        document.body.appendChild(calcScript);
    });

    // ==========================================
    // 8. NEW: EMAIL POPUP SCRIPT LAUNCHER LOGIC
    // ==========================================
    let isEmailScriptLoaded = false;
    let isEmailScriptLoading = false;

    emailButton.addEventListener("click", () => {
        // Pass the current page's contextual data over to the email handler
        window.activeEmailDefaults = calcDefaults;

        // If the script was already injected, just fire the UI opening function
        if (isEmailScriptLoaded) {
            if (typeof window.openEmailModal === "function") {
                window.openEmailModal();
            }
            return;
        }

        // A second tap while the script is still downloading would inject it twice
        if (isEmailScriptLoading) return;
        isEmailScriptLoading = true;

        console.log("Initializing email setup module injection...");
        const emailScript = document.createElement("script");
        // This is where your external script file will live in your repository
        emailScript.src = navBase + "js/email-popup.js?v=5";

        emailScript.onload = () => {
            isEmailScriptLoaded = true;
            isEmailScriptLoading = false;
            if (typeof window.openEmailModal === "function") {
                window.openEmailModal();
            }
        };

        emailScript.onerror = () => {
            isEmailScriptLoading = false;
            alert("Failed to load email tool. Please check your connection or repository paths.");
        };

        document.body.appendChild(emailScript);
    });
});
