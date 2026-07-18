(function() {
    // Prevent duplicate injection (a double-tap on ✉️ can load this script twice,
    // creating two stacked modals with duplicate IDs and a stale subject line)
    if (document.querySelector(".email-modal-overlay")) return;

    // 1. CONFIGURATION
    const GOOGLE_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzVCehcIu4ZBFthpBpp3J4oiCtismzABk-oafrzPtXysaZn_RDjupSf7lbouQvKMEl-/exec";

    // 2. Inject Modal Stylesheets
    const modalStyles = `
        .email-modal-overlay {
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(13, 17, 23, 0.75);
            backdrop-filter: blur(4px);
            display: none; align-items: center; justify-content: center;
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

    // Hidden iframe so form POST works with Apps Script redirects (fetch + no-cors drops the body)
    let relayFrame = document.getElementById("email-apps-script-frame");
    if (!relayFrame) {
        relayFrame = document.createElement("iframe");
        relayFrame.name = "email-apps-script-frame";
        relayFrame.id = "email-apps-script-frame";
        relayFrame.title = "Email relay";
        relayFrame.style.display = "none";
        document.body.appendChild(relayFrame);
    }

    // 3. Construct Modal Markup
    const overlay = document.createElement("div");
    overlay.className = "email-modal-overlay";
    overlay.innerHTML = `
        <div class="email-modal-card">
            <h3 style="margin-top: 0; margin-bottom: 15px; color: #f0f6fc;">Email Current Fact Sheet</h3>
            <div class="email-field">
                <label for="modalSubject">Subject Line</label>
                <input type="text" id="modalSubject" value="Peptide Fact Sheet">
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

    // 4. Modal Window Logic Actions
    function openModal() {
        const pageHeading = document.querySelector('h1');
        if (pageHeading) {
            document.getElementById("modalSubject").value = `Peptide Fact Sheet: ${pageHeading.innerText.trim()}`;
        }
        overlay.style.display = "flex";
        setTimeout(() => overlay.classList.add("active"), 10);
    }

    function closeModal() {
        overlay.classList.remove("active");
        document.getElementById("modalStatusMsg").innerText = "";
        setTimeout(() => {
            overlay.style.display = "none";
            document.getElementById("submitEmailModalBtn").disabled = false;
        }, 300);
    }

    document.getElementById("closeEmailModalBtn").addEventListener("click", closeModal);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });

    // 5. Form POST into hidden iframe (reliable with Apps Script /exec redirects)
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

        const form = document.createElement("form");
        form.method = "POST";
        form.action = GOOGLE_WEB_APP_URL;
        form.target = "email-apps-script-frame";
        form.style.display = "none";

        const fields = {
            email: emailInput.trim(),
            subject: subjectInput.trim(),
            pageUrl: window.location.href
        };

        Object.keys(fields).forEach((name) => {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = name;
            input.value = fields[name];
            form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
        form.remove();

        statusMsg.style.color = "#238636";
        statusMsg.innerText = "Transmission dispatched. Check your inbox (and spam).";
        setTimeout(closeModal, 1800);
    });

    // Assign globally accessible handle
    window.openEmailModal = openModal;
})();
