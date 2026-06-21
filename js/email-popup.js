(function() {
    // 1. CONFIGURATION (Paste your Google Web App URL here)
    const GOOGLE_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxzUMel23UNJMM-rMzuLhqcfy56YSzlSvb9_4yWnUT2UAX-zSTGV2YJ8naQ-0UqcI31/exec";

    // 2. Inject Modal Stylesheets
    const modalStyles = `
        .email-modal-overlay {
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(13, 17, 23, 0.75);
            backdrop-filter: blur(4px);
            display: flex; align-items: center; justify-content: center;
            z-index: 10001; opacity: 0; transition: opacity 0.3s ease;
        }
        .email-modal-card {
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 8px;
            width: 90%; max-width: 440px;
            padding: 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.5);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            color: #c9d1d9; transform: scale(0.95); transition: transform 0.3s ease;
        }
        .email-modal-overlay.active { opacity: 1; }
        .email-modal-overlay.active .email-modal-card { transform: scale(1); }
        .email-field { margin-bottom: 14px; }
        .email-field label { display: block; font-weight: 600; font-size: 0.9rem; margin-bottom: 6px; color: #8b949e; }
        .email-field input { 
            width: 100%; padding: 8px 10px; background: #0d1117; 
            border: 1px solid #30363d; border-radius: 6px; color: #c9d1d9; font-size: 0.95rem; box-sizing: border-box;
        }
        .email-field input:focus { border-color: #58a6ff; outline: none; }
        .email-btn-group { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
        .email-btn-cancel { background: transparent; border: 1px solid #30363d; color: #c9d1d9; padding: 8px 14px; border-radius: 6px; cursor: pointer; }
        .email-btn-send { background: #238636; border: 1px solid #2ea44f; color: #fff; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; }
        .email-btn-send:disabled { background: #23863680; border-color: transparent; cursor: not-allowed; }
        .email-modal-status { margin-top: 10px; font-size: 0.85rem; text-align: center; font-weight: 500; }
    `;

    const styleElement = document.createElement("style");
    styleElement.innerText = modalStyles;
    document.head.appendChild(styleElement);

    // 3. Create DOM Layout Structures
    const overlay = document.createElement("div");
    overlay.className = "email-modal-overlay";

    overlay.innerHTML = `
        <div class="email-modal-card">
            <h3 style="margin-top: 0; margin-bottom: 15px; color: #f0f6fc;">Email Current Framework</h3>
            
            <div class="email-field">
                <label for="modalSubject">Subject Line</label>
                <input type="text" id="modalSubject" value="Peptide Calculation Sheet Metrics">
            </div>
            
            <div class="email-field">
                <label for="modalRecipient">Destination Email</label>
                <input type="email" id="modalRecipient" placeholder="name@example.com" required>
            </div>
            
            <div id="modalStatusMsg" class="email-modal-status"></div>
            
            <div class="email-btn-group">
                <button class="email-btn-cancel" id="closeEmailModalBtn">Cancel</button>
                <button class="email-btn-send" id="submitEmailModalBtn">Send Transmission</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // 4. Modal Event Controllers
    function openModal() {
        // Set dynamic contextual default title if available
        if (window.activeEmailDefaults && window.activeEmailDefaults.filename) {
            document.getElementById("modalSubject").value = `Metrics Report: ${window.activeEmailDefaults.filename}`;
        }
        overlay.style.display = "flex";
        setTimeout(() => overlay.classList.add("active"), 10);
    }

    function closeModal() {
        overlay.classList.remove("active");
        document.getElementById("modalStatusMsg").innerText = "";
        setTimeout(() => overlay.style.display = "none", 300);
    }

    document.getElementById("closeEmailModalBtn").addEventListener("click", closeModal);
    
    // Dismiss if clicking background
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeModal();
    });

    // 5. Transmission Fetch Pipeline
    document.getElementById("submitEmailModalBtn").addEventListener("click", () => {
        const emailInput = document.getElementById("modalRecipient").value;
        const subjectInput = document.getElementById("modalSubject").value;
        const statusMsg = document.getElementById("modalStatusMsg");
        const sendBtn = document.getElementById("submitEmailModalBtn");

        if (!emailInput || !emailInput.includes("@")) {
            statusMsg.style.color = "#f85149";
            statusMsg.innerText = "Error: Provide a valid email identity.";
            return;
        }

        sendBtn.disabled = true;
        statusMsg.style.color = "#58a6ff";
        statusMsg.innerText = "Dispatching cloud email process...";

        // Collect matching document metrics state variables to write plain text summary
        const targetConfig = window.activeEmailDefaults || {};
        
        const textPayloadBody = 
            `--- PEPTIDE CALCULATION SUMMARY METRICS ---\n` +
            `Timestamp: ${new Date().toLocaleString()}\n` +
            `Source Origin: ${window.location.origin}${window.location.pathname}\n` +
            `-----------------------------------------\n` +
            `Target Profile Asset: ${targetConfig.filename || 'Custom Universal Layer'}\n` +
            `Base Vial Quantity: ${targetConfig.mg || 'N/A'} mg\n` +
            `Reconstitution Fluid Volume: ${targetConfig.ml || 'N/A'} ml\n` +
            `Intended Unit Dosage Target: ${targetConfig.dose || 'N/A'} ${targetConfig.unit || 'mcg'}\n` +
            `-----------------------------------------\n` +
            `Generated via GitHub Static Automation Pages Link.`;

        const requestPayload = {
            email: emailInput,
            subject: subjectInput,
            body: textPayloadBody
        };

        fetch(GOOGLE_WEB_APP_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestPayload)
        })
        .then(() => {
            statusMsg.style.color = "#3fb950";
            statusMsg.innerText = "Transmission dispatched successfully!";
            document.getElementById("modalRecipient").value = "";
            setTimeout(closeModal, 1800);
        })
        .catch(err => {
            console.error(err);
            statusMsg.style.color = "#f85149";
            statusMsg.innerText = "Pipeline failure. Check console exceptions logs.";
        })
        .finally(() => {
            sendBtn.disabled = false;
        });
    });

    // Share access functions cleanly across active modular frames
    window.openEmailModal = openModal;
})();
