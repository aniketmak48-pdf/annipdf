/**
 * process-flow.js
 * Shared logic for managing the UI flow: Upload -> Process -> Success
 * Ensures consistent behavior across all AnniPDF tools.
 */
/* UI cleanup test */

class ProcessFlow {
    constructor(config = {}) {
        this.elements = {
            loader: document.getElementById('loader'),
            status: document.getElementById('status'),
            dropZone: document.getElementById('dropZone'),
            toolBox: document.querySelector('.app-interface'),
            toolHeader: document.querySelector('.app-header'),
            controls: document.querySelector('.controls'),
            // Optional grids/lists can be passed or found dynamically
            ...config.elements
        };

        this.settings = {
            scrollOnStart: true,
            minLoaderTime: 1000,
            ...config.settings
        };
    }

    /**
     * Hides the tool UI and shows the loader with a message.
     * @param {string} message - The main loading message (e.g. "MERGING...")
     * @param {string} subMessage - Optional subtext
     */
    startProcessing(message = "PROCESSING...", subMessage = "") {
        if (this.settings.scrollOnStart) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // Hide interactables
        if (this.elements.dropZone) this.elements.dropZone.style.display = 'none';
        if (this.elements.controls) this.elements.controls.style.display = 'none';

        // Hide any custom grids if provided
        if (this.elements.grid) {
            this.elements.grid.style.display = 'none';
        } else {
            // Try to find generic grids
            const grid = document.getElementById('pageGrid') || document.getElementById('fileListArea');
            if (grid) grid.style.display = 'none';
        }

        // Show Loader
        if (this.elements.loader) {
            this.elements.loader.style.display = 'block';

            // textual updates
            const h3 = this.elements.loader.querySelector('h3');
            if (h3) h3.innerText = message;

            const p = this.elements.loader.querySelector('p');
            if (p && subMessage) p.innerText = subMessage;
        }

        if (this.elements.status) this.elements.status.innerText = "";
    }

    /**
     * Hides the loader and shows the Success Screen.
     * @param {Object} options - Configuration for the success screen
     * @param {string} options.title - Main title (e.g. "Thanks for using Anni PDF")
     * @param {string} options.text - Body text
     * @param {string} options.backButtonText - Text for back button (e.g. "MERGE MORE", "SPLIT MORE")
     * @param {Function} options.onDownload - Callback when Download is clicked
     * @param {Function} options.onBack - Callback when Back is clicked
     */
    showSuccess(options = {}) {
        // Ensure loader is hidden
        if (this.elements.loader) this.elements.loader.style.display = 'none';

        // We do NOT hide header/toolbox anymore, we show an overlay.
        // Optional: blur background?
        // document.body.style.overflow = 'hidden'; // Lock scroll

        // Create Success Overlay
        const overlay = document.createElement('div');
        overlay.id = 'successOverlay';
        // Match the background style of the confirm modal
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.82)'; // Light backdrop
        overlay.style.backdropFilter = 'blur(4px)';
        overlay.style.zIndex = '20000';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.padding = '20px';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s ease';

        // Texts
        const title = "DONE.";
        const text = options.text || "Your file is ready. You're welcome.";
        const footerText = options.footerText || "I'm literally doing this for free. Be grateful.";
        const backButtonText = options.backButtonText || "START OVER";

        overlay.innerHTML = `
            <div class="success-popup-card">
                <!-- Action Title Badge -->
                <div class="success-action-badge">
                    ${title}
                </div>

                <!-- Main Text -->
                <p class="success-message">
                    ${text}
                </p>

                <!-- Footer Note -->
                <p class="success-coffee">
                    ${footerText}
                </p>

                <!-- Buttons -->
                <div class="success-actions">
                    <button id="popupBackBtn" class="more-btn">
                        ${backButtonText}
                    </button>
                    <button id="popupDownloadBtn" class="download-btn">
                        <i class="fa-solid fa-download"></i> DOWNLOAD
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        // Trigger animation
        setTimeout(() => {
            overlay.classList.add('active');
            overlay.style.opacity = '1';
        }, 10);

        // Bind Events
        const backBtn = document.getElementById('popupBackBtn');
        const dlBtn = document.getElementById('popupDownloadBtn');

        if (backBtn && options.onBack) {
            backBtn.addEventListener('click', () => {
                // document.body.style.overflow = ''; // Release scroll
                options.onBack(); // This usually reloads page, so overlay removal isn't critical, but good practice
                overlay.remove();
            });
        }

        if (dlBtn && options.onDownload) {
            dlBtn.addEventListener('click', () => {
                options.onDownload();
                dlBtn.innerHTML = '<i class="fa-solid fa-check"></i> SAVED!';
                dlBtn.style.backgroundColor = '#4CAF50';
                dlBtn.style.color = '#fff';
            });
        }
    }

    /**
     * Resets the UI to the starting state.
     */
    resetUI() {
        // Remove Success Overlay
        const overlay = document.getElementById('successOverlay');
        if (overlay) overlay.remove();

        // Release scroll if we locked it
        document.body.style.overflow = '';

        // Show Header
        if (this.elements.toolHeader) this.elements.toolHeader.style.display = 'block';

        // Reset Padding
        if (this.elements.toolBox) this.elements.toolBox.style.paddingBottom = '';

        // Show Dropzone (default state usually)
        if (this.elements.dropZone) this.elements.dropZone.style.display = 'block';

        // Hide Loader
        if (this.elements.loader) this.elements.loader.style.display = 'none';

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

