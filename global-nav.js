document.addEventListener("DOMContentLoaded", () => {
    // 1. DYNAMIC ASSET DICTIONARY
    // Appending '?v=1' forces the browser to bypass any old cached broken images
    const ASSET_MAP = {
        'retatrutide': 'https://peptide-info.github.io/vials/assets/retatrutide.jpg?v=1',
        'selank':      'https://peptide-info.github.io/vials/assets/default.png?v=1',
        'cjc':         'https://peptide-info.github.io/vials/assets/default.png?v=1',
        'bpc':         'https://peptide-info.github.io/vials/assets/default.png?v=1',
        'bac':         'https://peptide-info.github.io/vials/assets/default.png?v=1',
        'pt':          'https://peptide-info.github.io/vials/assets/default.png?v=1'
    };

    const DEFAULT_LOGO = 'https://peptide-info.github.io/vials/assets/default.png?v=1'; 

    // 2. FILENAME EXTRACTION
    const urlParts = window.location.pathname.split('/');
    const currentFilename = urlParts[urlParts.length - 1].toLowerCase();
    
    let logoUrl = DEFAULT_LOGO; 

    for (const [keyword, assetPath] of Object.entries(ASSET_MAP)) {
        if (currentFilename.includes(keyword)) {
            logoUrl = assetPath; 
            break; 
        }
    }

    // 3. Inject CSS (Adding forced display constraints to the wrapper)
    const styles = `
        .home-btn {
            position: fixed; top: 15px; left: 15px; width: 36px; height: 36px;
            background: #161b22; border: 1px solid #30363d; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            text-decoration: none; font-size: 1.1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            z-index: 9999; transition: transform 0.2s ease, border-color 0.2s ease;
        }
        .home-btn:hover { transform: scale(1.05); border-color: #58a6ff; }
        @media (max-width: 600px) { body { padding-top: 50px !important; } }

        .splash-overlay {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background-color: #0d1117 !important; display: flex !important; 
            align-items: center !important; justify-content: center !important; 
            z-index: 10000 !important; opacity: 1;
            transition: opacity 0.6s ease-out;
        }
        .splash-logo {
            width: 220px !important; /* Bumped size up slightly */
            height: auto !important; 
            display: block !important;
            transform: scale(0);
            animation: 
                introPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                coolSpin 1.8s cubic-bezier(0.4, 0, 0.2, 1) 0.3s forwards;
        }
        @keyframes introPop { 0% { transform: scale(0); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes coolSpin { 0% { transform: scale(1) rotate(0deg); } 100% { transform: scale(1) rotate(1080deg); } }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // 4. Inject Home Button
    const homeButton = document.createElement("a");
    homeButton.href = 'https://peptide-info.github.io/vials/index.html';
    homeButton.className = "home-btn";
    homeButton.title = "Back to Directory";
    homeButton.innerHTML = "🏠";
    document.body.insertBefore(homeButton, document.body.firstChild);

    // 5. Create Splash Screen
    const splashContainer = document.createElement("div");
    splashContainer.className = "splash-overlay";

    const imgElement = document.createElement("img");
    imgElement.src = logoUrl; 
    imgElement.className = "splash-logo";
    
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

    // 6. Timing Engine
    setTimeout(() => {
        splashContainer.style.opacity = "0";
        setTimeout(() => { splashContainer.remove(); }, 600);
    }, 2300);
});
