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
        { filename: 'dsip',                                mg: 5,   ml: 2,   dose: 100,   unit: 'mcg', route: 'subq' }
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

        /* CHEERLEADER SQUAD SPELLING OUT THE PAGE NAME */
        .cheer-squad {
            display: flex;
            flex-wrap: wrap;
            align-items: flex-end;
            justify-content: center;
            gap: 0.35em 0.9em;
            max-width: 94vw;
            pointer-events: none;
        }

        .cheer-word {
            display: flex;
            align-items: flex-end;
            gap: 0.18em;
        }

        .cheer-unit {
            display: flex;
            flex-direction: column;
            align-items: center;
            transform: translateY(120vh);
            animation:
                cheerRunIn 0.55s cubic-bezier(0.22, 1.35, 0.4, 1) forwards,
                cheerFlip 0.75s cubic-bezier(0.45, 0, 0.3, 1) forwards;
        }

        .cheer-letter {
            font-family: "Fraunces", Georgia, serif;
            font-weight: 700;
            line-height: 1;
            color: #14261d;
            background: linear-gradient(160deg, #ffffff 0%, #d8efe6 100%);
            border: 2px solid rgba(15, 122, 95, 0.55);
            border-radius: 0.22em;
            padding: 0.28em 0.3em;
            min-width: 0.7em;
            text-align: center;
            box-shadow: 0 0.18em 0.5em rgba(0, 0, 0, 0.45);
        }

        .cheer-person {
            font-size: 0.85em;
            line-height: 1;
            margin-top: 0.12em;
            filter: drop-shadow(0 0.15em 0.3em rgba(0, 0, 0, 0.5));
        }

        @keyframes cheerRunIn {
            0%   { transform: translateY(120vh); }
            70%  { transform: translateY(-0.35em); }
            85%  { transform: translateY(0.08em); }
            100% { transform: translateY(0); }
        }

        @keyframes cheerFlip {
            0%   { transform: translateY(0) rotate(0deg); }
            45%  { transform: translateY(-1.1em) rotate(200deg); }
            80%  { transform: translateY(0.05em) rotate(360deg); }
            90%  { transform: translateY(0) rotate(360deg) scale(1.06, 0.92); }
            100% { transform: translateY(0) rotate(360deg) scale(1, 1); }
        }

        @media (prefers-reduced-motion: reduce) {
            .cheer-unit {
                animation: none;
                transform: none;
            }
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

    // 5. Create and inject the Splash Screen (cheerleaders spelling the page name)
    const splashContainer = document.createElement("div");
    splashContainer.className = "splash-overlay";

    // Page name: prefer the page's <h1>, fall back to <title> minus "Protocol"
    const h1El = document.querySelector('h1');
    let pageName = (h1El && h1El.textContent.trim())
        || document.title.replace(/\s*Protocol\s*$/i, '').trim()
        || 'Peptide Info';

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const CHEER_RUN = ['🏃‍♀️', '🏃‍♂️'];
    const CHEER_HOLD = ['🙆‍♀️', '🙆‍♂️'];
    const CHEER_FLIP = ['🤸‍♀️', '🤸‍♂️'];

    const squad = document.createElement('div');
    squad.className = 'cheer-squad';
    squad.setAttribute('aria-label', 'Loading ' + pageName);

    // Scale letters down so long names still fit on one or two rows
    const charCount = pageName.replace(/\s/g, '').length;
    const fitSize = Math.floor(Math.min(window.innerWidth * 0.9, 900) / Math.max(charCount, 1) * 1.15);
    squad.style.fontSize = Math.max(18, Math.min(64, fitSize)) + 'px';

    const STAGGER = 80;   // ms between each cheerleader arriving
    const RUN_MS = 550;   // matches cheerRunIn duration
    const FLIP_DELAY = 800;  // pause after landing before the flip
    const FLIP_MS = 750;  // matches cheerFlip duration

    let unitIndex = 0;
    const personTimers = [];

    pageName.split(/\s+/).forEach((word) => {
        const wordEl = document.createElement('div');
        wordEl.className = 'cheer-word';

        for (const ch of word) {
            const i = unitIndex++;
            const delay = i * STAGGER;

            const unit = document.createElement('div');
            unit.className = 'cheer-unit';
            unit.style.animationDelay = delay + 'ms, ' + (delay + RUN_MS + FLIP_DELAY) + 'ms';

            const letter = document.createElement('div');
            letter.className = 'cheer-letter';
            letter.textContent = ch;

            const person = document.createElement('div');
            person.className = 'cheer-person';
            person.textContent = reducedMotion ? CHEER_HOLD[i % 2] : CHEER_RUN[i % 2];

            unit.appendChild(letter);
            unit.appendChild(person);
            wordEl.appendChild(unit);

            if (!reducedMotion) {
                // Swap the emoji in sync with the run-in, flip, and landing
                personTimers.push(setTimeout(() => { person.textContent = CHEER_HOLD[i % 2]; }, delay + RUN_MS));
                personTimers.push(setTimeout(() => { person.textContent = CHEER_FLIP[i % 2]; }, delay + RUN_MS + FLIP_DELAY));
                personTimers.push(setTimeout(() => { person.textContent = CHEER_HOLD[i % 2]; }, delay + RUN_MS + FLIP_DELAY + FLIP_MS));
            }
        }

        squad.appendChild(wordEl);
    });

    splashContainer.appendChild(squad);
    document.body.appendChild(splashContainer);

    function dismissSplash() {
        personTimers.forEach(clearTimeout);
        splashContainer.style.opacity = "0";
        setTimeout(() => {
            splashContainer.remove();
        }, 600);
    }

    splashContainer.addEventListener("click", () => {
        dismissSplash();
    });

    // 6. TIMING ENGINE — hold briefly after the last cheerleader lands her flip
    const lastDelay = Math.max(unitIndex - 1, 0) * STAGGER;
    const showFor = reducedMotion
        ? 1200
        : Math.min(lastDelay + RUN_MS + FLIP_DELAY + FLIP_MS + 500, 4500);
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

        console.log("Initializing email setup module injection...");
        const emailScript = document.createElement("script");
        // This is where your external script file will live in your repository
        emailScript.src = navBase + "js/email-popup.js?v=4";

        emailScript.onload = () => {
            isEmailScriptLoaded = true;
            if (typeof window.openEmailModal === "function") {
                window.openEmailModal();
            }
        };

        emailScript.onerror = () => {
            alert("Failed to load email tool. Please check your connection or repository paths.");
        };

        document.body.appendChild(emailScript);
    });
});
