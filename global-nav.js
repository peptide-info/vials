document.addEventListener("DOMContentLoaded", () => {
    // 1. DYNAMIC ASSET DICTIONARY
    // Maps a keyword found in the filename to its specific image inside your assets folder
    const ASSET_MAP = {
        'retatrutide': '../assets/retatrutide.jpg',
        'selank':      '../assets/default.png',
        'cjc':         '../assets/default.png',
        'bpc':         '../assets/default.png',
        'bac':         '../assets/default.png',
        'pt':          '../assets/default.png'
    };

    // Your default fallback image if no keywords match
    const DEFAULT_LOGO = '../assets/default.png'; 

    // 2. DETECT THE CURRENT PEPTIDE
    // Grab the current webpage filename (e.g., "retatrutide-10mg.html") in lowercase
    const currentFilename = window.location.pathname.toLowerCase();
    let logoUrl = DEFAULT_LOGO; // Start with the fallback

    // Loop through our map and check if the filename contains any of our target keywords
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

        /* SPLASH SCREEN OVERLAY */
        .splash-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: #0d1117;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            opacity: 1;
            transition: opacity 0.6s ease-out;
        }

        /* THE ANIMATED PNG */
        .splash-logo {
            width: 180px;
            height: auto;
            transform: scale(0);
            animation: 
                introPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                coolSpin 1.8s cubic-bezier(0.4, 0, 0.2, 1) 0.3s forwards;
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

    // 4. Create and inject the floating home button
    const homeButton = document.createElement("a");
    homeButton.href = "../index.html";
    homeButton.className = "home-btn";
    homeButton.title = "Back to Directory";
    homeButton.innerHTML = "🏠";
    document.body.insertBefore(homeButton, document.body.firstChild);

    // 5. Create and inject the Splash Screen elements using the dynamic logoUrl
    const splashContainer = document.createElement("div");
    splashContainer.className = "splash-overlay";

    const imgElement = document.createElement("img");
    imgElement.src = logoUrl; // This is now dynamic!
    imgElement.className = "splash-logo";
    imgElement.alt = "Loading...";

    splashContainer.appendChild(imgElement);
    document.body.appendChild(splashContainer);

    // 6. TIMING ENGINE: Let it spin, fade out, then destroy
    setTimeout(() => {
        splashContainer.style.opacity = "0";
        setTimeout(() => {
            splashContainer.remove();
        }, 600);
    }, 2300);
});
