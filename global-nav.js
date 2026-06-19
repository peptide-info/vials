document.addEventListener("DOMContentLoaded", () => {
    // 1. DYNAMIC ASSET DICTIONARY (Absolute web paths with cache-busting)
    const ASSET_MAP = {
        'retatrutide': 'https://peptide-info.github.io/vials/assets/retatrutide.jpg?v=1',
        'selank':      'https://peptide-info.github.io/vials/assets/default.png?v=1',
        'cjc':         'https://peptide-info.github.io/vials/assets/default.png?v=1',
        'bpc':         'https://peptide-info.github.io/vials/assets/default.png?v=1',
        'bac':         'https://peptide-info.github.io/vials/assets/default.png?v=1',
        'pt':          'https://peptide-info.github.io/vials/assets/default.png?v=1'
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

    // 3. Inject CSS for both the home button AND the splash animation
    const styles = `
        /* FLOATING HOME BUTTON */
        .home-btn {
            position: fixed;
            top: 15px;
            left: 15px;
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
            z-index: 9999;
            transition: transform 0.2s ease, border-color 0.2s ease;
        }
        .home-btn:hover {
            transform: scale(1.05);
            border-color: #58a6ff;
        }
        @media (max-width: 600px) {
            body { padding-top: 50px !important; }
        }

        /* NEW! TRANSLUCENT SPLASH SCREEN OVERLAY */
        .splash-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            /* Changes from solid to 85% opacity, so the page behind is visible */
            background-color: rgba(13, 17, 23, 0.85); 
            backdrop-filter: blur(5px); /* Adds a cool iOS-style frosted glass blur */
            display: grid; /* Grid is better for absolute centering */
            place-items: center;
            z-index: 10000;
            opacity: 1;
            transition: opacity 0.6s ease-out;
        }

        /* NEW! DYNAMICALLY SIZED ANIMATED IMAGE */
        .splash-logo {
            /* Now sets size dynamically based on the width of the viewport (vw) */
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

    // 4. Create and inject the floating home button
    const homeButton = document.createElement("a");
    // Hardcoding this URL ensures the home button works reliably anywhere
    homeButton.href = 'https://peptide-info.github.io/vials/index.html';
    homeButton.className = "home-btn";
    homeButton.title = "Back to Directory";
    homeButton.innerHTML = "🏠";
    document.body.insertBefore(homeButton, document.body.firstChild);

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
});
