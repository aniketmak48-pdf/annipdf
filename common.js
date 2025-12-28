/**
 * ANNI PDF - Common Shared Script
 * Handles UI component loading, global utilities, and tool-specific file logic.
 */


document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    highlightActiveNavLink();

    // Auto-bind Back Button for Preview Engine
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', (e) => {
            if (e.defaultPrevented) return;
            if (window.PreviewEngine) window.PreviewEngine.reset(e);
        });
    }

    // Initialize Tool Logic
    initToolController();
});

/**
 * Mobile Menu Toggle Logic
 */
function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    if (!mobileMenuBtn || !mobileMenu) return;

    const icon = mobileMenuBtn.querySelector('i');

    mobileMenuBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const isActive = mobileMenu.classList.toggle('active');

        if (isActive) {
            document.body.style.overflow = 'hidden';
            if (icon) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-xmark');
            }
        } else {
            document.body.style.overflow = '';
            if (icon) {
                icon.classList.remove('fa-xmark');
                icon.classList.add('fa-bars');
            }
        }
    });

    // Close menu on link click
    const mobileLinks = mobileMenu.querySelectorAll('a');
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
            document.body.style.overflow = '';
            if (icon) {
                icon.classList.remove('fa-xmark');
                icon.classList.add('fa-bars');
            }
        });
    });
}


/**
 * Highlights active page in nav
 */
function highlightActiveNavLink() {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.desktop-dropdown a, .mobile-menu-links a, .nav-link'); // Added .nav-link to scope
    navLinks.forEach(link => {
        // Reset
        link.classList.remove('active-nav');

        const linkPath = link.getAttribute('href');
        if (linkPath === currentPath) {
            link.classList.add('active-nav');
        }
    });
}

/**
 * TOOL CONTROLLER
 * Detects current tool and configures file upload settings.
 */
function initToolController() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    if (!uploadArea || !fileInput) return;

    const currentPath = window.location.pathname.split('/').pop();
    const config = getToolConfig(currentPath);

    // Update Input Attributes
    if (config.multiple) fileInput.setAttribute('multiple', '');
    if (config.accept) fileInput.setAttribute('accept', config.accept);

    // Update uploadArea UI Message
    const uploadAreaTitle = uploadArea.querySelector('h2');
    const uploadAreaDesc = uploadArea.querySelector('p');
    if (uploadAreaDesc && config.label) uploadAreaDesc.innerText = `Supported Format: ${config.label}`;

    // Setup Event Listeners
    uploadArea.addEventListener('click', () => fileInput.click());

    setupUploadArea(uploadArea, (files) => {
        handleToolUpload(files, config);
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleToolUpload(fileInput.files, config);
            fileInput.value = ''; // Reset to allow re-selecting same file
        }
    });
}

/**
 * Returns configuration based on tool filename
 */
function getToolConfig(filename) {
    const configs = {
        'merge.html': { multiple: true, accept: '.pdf', label: 'PDF' },
        'jpg-to-pdf.html': { multiple: true, accept: 'image/*', label: 'JPG, PNG, WEBP' },
        'pdf-to-jpg.html': { multiple: false, accept: '.pdf', label: 'PDF' },
        'word-to-pdf.html': { multiple: true, accept: '.doc,.docx', label: 'Word' },
        'excel-to-pdf.html': { multiple: true, accept: '.xls,.xlsx', label: 'Excel' },
        'pdf-to-word.html': { multiple: false, accept: '.pdf', label: 'PDF' },
        'compress.html': { multiple: false, accept: '.pdf', label: 'PDF' },
        'unlock.html': { multiple: false, accept: '.pdf', label: 'PDF' },
        'protect.html': { multiple: false, accept: '.pdf', label: 'PDF' },
        'split.html': { multiple: false, accept: '.pdf', label: 'PDF' }
    };
    return configs[filename] || { multiple: false, accept: '.pdf', label: 'PDF' };
}

/**
 * Handles the actual file upload/select event
 */
async function handleToolUpload(files, config) {
    // This is where specific tools will hook in.
    // We emit a custom event that tools can listen for.
    const event = new CustomEvent('anniFilesSelected', {
        detail: { files: Array.from(files), config: config }
    });
    window.dispatchEvent(event);
}

/**
 * Global Drop Zone Logic
 */
function setupUploadArea(uploadArea, onFiles) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => {
        uploadArea.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); });
    });

    ['dragenter', 'dragover'].forEach(ev => {
        uploadArea.addEventListener(ev, () => uploadArea.classList.add('drag-over'));
    });

    ['dragleave', 'drop'].forEach(ev => {
        uploadArea.addEventListener(ev, () => uploadArea.classList.remove('drag-over'));
    });

    uploadArea.addEventListener('drop', e => {
        const files = e.dataTransfer.files;
        if (files.length > 0) onFiles(files);
    });
}

/**
 * Shared PDF Rendering Util
 */
async function renderPdfPageToCanvas(page, canvas, scale = 0.5) {
    const viewport = page.getViewport({ scale });
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: context, viewport: viewport }).promise;
}


/* =========================================
   PREVIEW ENGINE (Shared Animation Logic)
   ========================================= */
const PreviewEngine = {
    ANIMATION_DURATION: 500,

    /**
     * Handles the standard "Loader -> Wait -> FLIP Animation -> Preview" flow.
     * @param {Object} options Configuration object
     * @param {string} options.loaderText (Optional) Text to show on the loader
     * @param {Function} options.generatePreview Async function(files) -> returns DocumentFragment
     * @param {Function} options.onSuccess (Optional) Function called after preview is generated but before animation
     * @param {Array} options.files The files to process
     */
    init: async (options) => {
        const ui = PreviewEngine.getUI();

        // 1. Show Loader
        ui.uploadArea.style.display = 'none';
        ui.loader.style.display = 'flex';
        if (options.loaderText && ui.loaderTitle) ui.loaderTitle.innerText = options.loaderText;

        const startTime = Date.now();

        // Safety Timeout for Preview Generation (15s max)
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Preview generation timed out")), 15000)
        );

        try {
            // 2. Generate Content (Delegated to specific tool)
            // Race against timeout to prevent endless spinner
            const contentFragment = await Promise.race([
                options.generatePreview(options.files),
                timeoutPromise
            ]);

            // 3. Minimum Delay Enforcement (1 second)
            const elapsed = Date.now() - startTime;
            if (elapsed < 1000) {
                await new Promise(resolve => setTimeout(resolve, 1000 - elapsed));
            }

            // 4. Update Header/Metadata (Hook)
            if (options.onSuccess) options.onSuccess();

            // 5. Run FLIP Animation
            PreviewEngine.runFlip(contentFragment);

        } catch (err) {
            console.error("Preview Engine Error:", err);
            PreviewEngine.reset();
            alert("An error occurred processing your file. Please try again.");
            // Ensure loader is gone
            ui.loader.style.setProperty('display', 'none', 'important');
            ui.uploadArea.style.display = 'block';
        }
    },

    getUI: () => ({
        toolBox: document.querySelector('.app-interface'),
        uploadArea: document.getElementById('uploadArea'),
        loader: document.getElementById('loader'),
        pageGrid: document.getElementById('pageGrid'),
        fileNameDisplay: document.getElementById('fileNameDisplay'),
        pageCountDisplay: document.getElementById('pageCountDisplay'),
        fileInput: document.getElementById('fileInput'),
        loaderTitle: document.querySelector('#loader h3')
    }),

    // Core FLIP Animation Logic - Clone Measurement to prevent Blinking
    runFlip: (contentFragment) => {
        const ui = PreviewEngine.getUI();
        if (!ui.toolBox || !ui.pageGrid) return;

        // 1. Lock the current height
        const startHeight = ui.toolBox.offsetHeight;
        ui.toolBox.style.height = `${startHeight}px`;
        ui.toolBox.style.overflow = 'hidden';
        ui.toolBox.style.transition = 'none';

        // 2. Perform the DOM Swap (Live Element)
        // We will swap instantly to avoid any gaps
        ui.pageGrid.innerHTML = '';
        ui.pageGrid.appendChild(contentFragment);

        // Ensure Grid is ready
        ui.pageGrid.style.display = 'grid';
        ui.pageGrid.style.opacity = '';

        // HIDE LOADER IMMEDIATELY (Do not wait for RAF)
        // We have locked the height, so this is safe and prevents stuck spinners
        ui.loader.style.setProperty('display', 'none', 'important');

        // 3. Measure Final Height utilizing a Clone
        const clone = ui.toolBox.cloneNode(true);
        clone.classList.add('preview-active');
        clone.style.height = 'auto';
        clone.style.visibility = 'hidden';
        clone.style.position = 'absolute';
        clone.style.zIndex = '-9999';
        clone.style.width = '100%';

        // Clone state clean up (just in case)
        const cloneLoader = clone.querySelector('#loader');
        if (cloneLoader) cloneLoader.style.display = 'none';

        const cloneDrop = clone.querySelector('#uploadArea');
        if (cloneDrop) cloneDrop.style.display = 'none';

        ui.toolBox.parentElement.appendChild(clone);
        const targetHeight = clone.scrollHeight;
        ui.toolBox.parentElement.removeChild(clone);

        // 4. Start the Animation
        void ui.toolBox.offsetHeight; // Force Layout

        requestAnimationFrame(() => {
            // Restore transitions for height/layout
            ui.toolBox.style.transition = 'all 0.5s cubic-bezier(0.22, 1, 0.36, 1)';

            // Animate Height & Width (via class)
            ui.toolBox.style.height = `${targetHeight}px`;
            ui.toolBox.classList.add('is-preview');
        });

        // 5. Cleanup
        setTimeout(() => {
            ui.toolBox.style.height = '';
            ui.toolBox.style.transition = '';
            ui.toolBox.style.overflow = '';
        }, 500);
    },

    reset: (e) => {
        const ui = PreviewEngine.getUI();
        // Only verify if we are in preview mode, otherwise let the link work
        if (ui.toolBox.classList.contains('is-preview')) {
            if (e) e.preventDefault();

            ui.toolBox.classList.remove('is-preview');
            ui.uploadArea.style.display = '';
            ui.pageGrid.style.display = 'none';
            ui.pageGrid.innerHTML = '';

            if (ui.fileNameDisplay) ui.fileNameDisplay.innerText = '';
            if (ui.pageCountDisplay) ui.pageCountDisplay.innerText = '';
            if (ui.fileInput) ui.fileInput.value = '';

            ui.toolBox.style.height = 'auto';
            ui.toolBox.style.overflow = '';
        }
    }
};

/**
 * Custom Confirmation Popup
 */
function showConfirm(message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    // Create Modal
    const modal = document.createElement('div');
    modal.className = 'confirm-modal';

    modal.innerHTML = `
        <div class="confirm-content">
            <h2 class="confirm-title">HOLD ON!</h2>
            <p class="confirm-msg" style="margin-bottom: 25px; font-weight: bold; font-family: 'Space Mono', monospace;">${message}</p>
            <div class="confirm-actions">
                <button class="action-btn" id="confirmCancel" style="background: #eee;">NO, WAIT</button>
                <button class="action-btn primary" id="confirmOk">YES, DO IT</button>
            </div>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Trigger animation
    setTimeout(() => overlay.classList.add('active'), 10);

    const close = () => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 300);
    };

    document.getElementById('confirmCancel').onclick = close;
    document.getElementById('confirmOk').onclick = () => {
        close();
        onConfirm();
    };
}

// Expose to window for inline scripts
window.PreviewEngine = PreviewEngine;
window.showConfirm = showConfirm;
