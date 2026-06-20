document.addEventListener("DOMContentLoaded", () => {
    // 1. DYNAMIC ASSET DICTIONARY (Absolute web paths with cache-busting)
    const ASSET_MAP = {
        'retatrutide': 'https://peptide-info.github.io/vials/assets/retatrutide.jpg?v=1',
        'selank':      'https://peptide-info.github.io/vials/assets/default.png?v=1',
        'cjc':          'https://peptide-info.github.io/vials/assets/default.png?v=1',
        'bpc':          'https://peptide-info.github.io/vials/assets/default.png?v=1',
        'bac':          'https://peptide-info.github.io/vials/assets/default.png?v=1',
        'pt':           'https://peptide-info.github.io/vials/assets/default.png?v=1'
    };

    // Your absolute default fallback image
    const DEFAULT_LOGO = 'https://peptide-info.github.io/vials/assets/default.png?v=1'; 

    // 2. DETECT THE CURRENT PEPTIDE (Bulletproof check)
    const urlParts = window.location.pathname.split('/');
    const currentFilename = urlParts[urlParts.length - 1].toLowerCase();
    
    let logoUrl = DEFAULT_LOGO; // Start with the fallback

    for (const [keyword, assetPath] of Object.entries(ASSET_MAP)) {
        if (currentFilename.includes(keyword)) {
            logoUrl = assetPath; // Found a match! Use the specific asset
            break; // Stop looking once we find the first match
        }
    }

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
        .home-btn, .nav-calc-btn {
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
        .home-btn:hover, .nav-calc-btn:hover {
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
            backdrop-filter: blur(5px); /* Adds a cool iOS-style frosted glass blur */
            display: grid; /* Grid is better for absolute centering */
            place-items: center;
            z-index: 10000;
            opacity: 1;
            transition: opacity 0.6s ease-out;
        }

        /* DYNAMICALLY SIZED ANIMATED IMAGE */
        .splash-logo {
            width: 70vw !important; 
            max-width: 400px !important; /* Prevents it from getting too large on desktop */
            height: auto !important;
            object-fit: contain; /* Ensures the image doesn't stretch weirdly */
            
            display: block !important;
            transform: scale(0);
            
            /* Combine pop-in and spin animations */
            animation: 
               introPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
               coolSpin 1.8s cubic-bezier(0.4, 0, 0.2, 1) 1.2s forwards;
        }

        /* Pop the image into existence */
        @keyframes introPop {
            0% { transform: scale(0); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
        }

        /* Spin it around 3 times with style */
        @keyframes coolSpin {
            0% { transform: scale(1) rotate(0deg); }
            100% { transform: scale(1) rotate(1080deg); } /* 360 * 3 = 1080 degrees */
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

    // Assemble buttons into top bar container layout
    navContainer.appendChild(homeButton);
    navContainer.appendChild(calcButton);
    document.body.insertBefore(navContainer, document.body.firstChild);

    // 5. Create and inject the Splash Screen elements
    const splashContainer = document.createElement("div");
    splashContainer.className = "splash-overlay";

    const imgElement = document.createElement("img");
    imgElement.src = logoUrl; // This is dynamic!
    imgElement.className = "splash-logo";
    imgElement.alt = "Loading...";

    // If it STILL somehow fails, this text will instantly let us know
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

    // 6. TIMING ENGINE: Let it spin, fade out, then destroy
    setTimeout(() => {
        splashContainer.style.opacity = "0";
        setTimeout(() => {
            splashContainer.remove();
        }, 600);
    }, 3300);

    // ==========================================
    // 7. POPUP SCRIPT LAUNCHER LOGIC
    // ==========================================
    let isCalcScriptLoaded = false;

    calcButton.addEventListener("click", () => {
        // If script was already downloaded, pass event cleanly to open the modal layout
        if (isCalcScriptLoaded) {
            if (typeof window.openPeptideCalculator === "function") {
                window.openPeptideCalculator();
            }
            return;
        }

        // Dynamically fetch and download your calculator asset logic code
        console.log("Initializing toolkit setup module injection...");
        const calcScript = document.createElement("script");
        calcScript.src = "https://peptide-info.github.io/vials/js/calculator-popup.js";
        
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
});
