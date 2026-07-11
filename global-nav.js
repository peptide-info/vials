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
        themeLink.href = navBase + 'css/protocol-theme.css?v=8';
        document.head.appendChild(themeLink);
    }
    document.body.classList.add('protocol-page');

    // 1. DYNAMIC ASSET DICTIONARY (Absolute web paths with cache-busting)
    const ASSET_MAP = {
        'retatrutide': 'https://peptide-info.github.io/vials/assets/retatrutide.jpg?v=1',
        'tirzepatide': 'https://peptide-info.github.io/vials/assets/default.png?v=1',
        'semaglutide': 'https://peptide-info.github.io/vials/assets/default.png?v=1',
        'cagrilintide': 'https://peptide-info.github.io/vials/assets/default.png?v=1',
        'tesamorelin': 'https://peptide-info.github.io/vials/assets/default.png?v=1',
        'ipamorelin': 'https://peptide-info.github.io/vials/assets/default.png?v=1',
        'ghk':         'https://peptide-info.github.io/vials/assets/default.png?v=1',
        'selank':      'https://peptide-info.github.io/vials/assets/default.png?v=1',
        'semax':       'https://peptide-info.github.io/vials/assets/default.png?v=1',
        'cjc':          'https://peptide-info.github.io/vials/assets/default.png?v=1',
        'bpc':          'https://peptide-info.github.io/vials/assets/default.png?v=1',
        'tb-500':       'https://peptide-info.github.io/vials/assets/default.png?v=1',
        'bac':          'https://peptide-info.github.io/vials/assets/default.png?v=1',
        'pt':           'https://peptide-info.github.io/vials/assets/default.png?v=1',
        'epitalon':     'https://peptide-info.github.io/vials/assets/default.png?v=1',
        'mots':         'https://peptide-info.github.io/vials/assets/default.png?v=1',
        'nad':          'https://peptide-info.github.io/vials/assets/default.png?v=1',
        'kpv':          'https://peptide-info.github.io/vials/assets/default.png?v=1',
        'melanotan':    'https://peptide-info.github.io/vials/assets/default.png?v=1',
        'dsip':         'https://peptide-info.github.io/vials/assets/default.png?v=1',
        'thymosin':     'https://peptide-info.github.io/vials/assets/default.png?v=1'
    };

    // Your absolute default fallback image
    const DEFAULT_LOGO = 'https://peptide-info.github.io/vials/assets/default.png?v=1'; 

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
        { filename: 'tesamorelin',                         mg: 10,  ml: 1,   dose: 2,     unit: 'mg',  route: 'subq' },
        { filename: 'ipamorelin',                          mg: 5,   ml: 2,   dose: 200,   unit: 'mcg', route: 'subq' },
        { filename: 'bpc-157',                             mg: 5,   ml: 2,   dose: 375,   unit: 'mcg', route: 'subq' },
        { filename: 'tb-500',                              mg: 5,   ml: 2,   dose: 2,     unit: 'mg',  route: 'subq' },
        { filename: 'ghk-cu',                              mg: 100, ml: 3,   dose: 2,     unit: 'mg',  route: 'subq' },
        { filename: 'kpv',                                 mg: 5,   ml: 2,   dose: 500,   unit: 'mcg', route: 'subq' },
        { filename: 'pt-141',                              mg: 10,  ml: 4,   dose: 1,     unit: 'mg',  route: 'nasal' },
        { filename: 'selank',                              mg: 5,   ml: 4,   dose: 250,   unit: 'mcg', route: 'nasal' },
        { filename: 'semax',                               mg: 5,   ml: 4,   dose: 300,   unit: 'mcg', route: 'nasal' },
        { filename: 'epitalon',                            mg: 10,  ml: 2,   dose: 5,     unit: 'mg',  route: 'subq' },
        { filename: 'mots-c',                              mg: 10,  ml: 2,   dose: 5,     unit: 'mg',  route: 'subq' },
        { filename: 'nad',                                 mg: 500, ml: 5,   dose: 50,    unit: 'mg',  route: 'subq' },
        { filename: 'dsip',                                mg: 5,   ml: 2,   dose: 100,   unit: 'mcg', route: 'subq' }
    ];

    // ABSOLUTE SYSTEM FALLBACKS (If a page isn't in the list above)
    let calcDefaults = { mg: 5, ml: 2, dose: 2, unit: 'mg', route: 'subq' }; 
    let logoUrl = DEFAULT_LOGO;

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

    // Find the matching logo asset from your existing ASSET_MAP
    for (const [keyword, assetPath] of Object.entries(ASSET_MAP)) {
        if (currentFilename.includes(keyword)) {
            logoUrl = assetPath;
            break;
        }
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
        }

       /* DYNAMICALLY SIZED ANIMATED IMAGE */
        .splash-logo {
            width: 70vw !important; 
            max-width: 400px !important; 
            height: auto !important;
            object-fit: contain; 
            
            display: block !important;
            transform: scale(0);
            
            animation: 
                introPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                coolSpin 1.8s cubic-bezier(0.4, 0, 0.2, 1) 1.2s forwards;

            pointer-events: none; 
        }

        @keyframes introPop {
            0% { transform: scale(0); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
        }

        @keyframes coolSpin {
            0% { transform: scale(1) rotate(0deg); }
            100% { transform: scale(1) rotate(1080deg); }
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

    // 5. Create and inject the Splash Screen elements
    const splashContainer = document.createElement("div");
    splashContainer.className = "splash-overlay";

    const imgElement = document.createElement("img");
    imgElement.src = logoUrl;
    imgElement.className = "splash-logo";
    imgElement.alt = "Loading...";

    imgElement.onerror = function() {
        this.style.display = 'none';
        const fallbackText = document.createElement('div');
        fallbackText.style.color = '#c9d1d9';
        fallbackText.style.fontSize = '1.4rem';
        fallbackText.style.fontWeight = 'bold';
        fallbackText.innerText = '✨ Loading Protocol ✨';
        splashContainer.appendChild(fallbackText);
    };

    splashContainer.appendChild(imgElement);
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

    // 6. TIMING ENGINE
    setTimeout(() => {
        if (document.body.contains(splashContainer)) {
            dismissSplash();
        }
    }, 3300);

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
