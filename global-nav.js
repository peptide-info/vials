document.addEventListener("DOMContentLoaded", () => {
    // 1. Create the CSS styles dynamically
    const styles = `
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
    `;

    // 2. Inject the styles into the document head
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // 3. Create the HTML anchor element
    const homeButton = document.createElement("a");
    homeButton.href = "../index.html"; // Jumps back out of /peptides/ to root
    homeButton.className = "home-btn";
    homeButton.title = "Back to Directory";
    homeButton.innerHTML = "🏠";

    // 4. Drop the button right at the top of the body
    document.body.insertBefore(homeButton, document.body.firstChild);
});
