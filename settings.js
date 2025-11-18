// Settings management
const Settings = {
    // Default settings
    defaults: {
        language: 'sv',
        theme: 'light'
    },

    // Cache for current settings (loaded from .ini file)
    _cachedSettings: null,

    // Load settings from .ini file via Python API
    async load() {
        try {
            // Check if pywebview API is available
            if (typeof pywebview !== 'undefined' && pywebview.api && pywebview.api.getSettings) {
                const settings = await pywebview.api.getSettings();
                this._cachedSettings = settings;
                return settings;
            } else {
                // Fallback to defaults if API not available yet
                return { ...this.defaults };
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            return { ...this.defaults };
        }
    },

    // Save settings to .ini file via Python API
    async save(settings) {
        try {
            if (typeof pywebview !== 'undefined' && pywebview.api && pywebview.api.saveSettings) {
                const result = await pywebview.api.saveSettings(settings);
                if (result.success) {
                    this._cachedSettings = settings;
                    return true;
                } else {
                    console.error('Error saving settings:', result.message);
                    return false;
                }
            } else {
                console.warn('Settings API not available');
                return false;
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
        }
    },

    // Get current settings (synchronous - returns cached or defaults)
    get() {
        return this._cachedSettings || { ...this.defaults };
    },

    // Update a specific setting (async)
    async update(key, value) {
        const settings = await this.load();
        settings[key] = value;
        await this.save(settings);
        return settings;
    }
};

// Translation dictionary
const translations = {
    sv: {
        yourTranscriptions: 'Dina transkriberingar',
        newTranscription: 'Ny transkribering',
        selectOrCreate: 'Välj eller skapa en transkribering',
        selectOrCreateDesc: 'Välj eller skapa en transkribering i den vänstra panelen',
        settings: 'Inställningar',
        general: 'Allmänt',
        appLanguage: 'Språk för applikationen',
        themeMode: 'Tema',
        swedish: 'Svenska',
        english: 'English',
        lightMode: 'Ljust läge',
        darkMode: 'Mörkt läge',
        backToOverview: 'Tillbaka till översikt',
        selectFile: 'Välj audio- eller videofil',
        languageAndModel: 'Välj Språk & Modell',
        startTranscription: 'Starta transkribering',
        activity: 'Aktivitet',
        languageOption1: 'Svenska',
        languageOption2: 'Engelska',
        modelOption1: 'Liten Modell (Snabb, mindre exakt)',
        modelOption2: 'Medium Modell (Bra resultat, långsam)',
        modelOption3: 'Stor Modell (Bäst resultat, väldigt långsam)'
    },
    en: {
        yourTranscriptions: 'Your Transcriptions',
        newTranscription: 'New Transcription',
        selectOrCreate: 'Select or create a transcription',
        selectOrCreateDesc: 'Select or create a transcription in the left panel',
        settings: 'Settings',
        general: 'General',
        appLanguage: 'Application Language',
        themeMode: 'Theme',
        swedish: 'Svenska',
        english: 'English',
        lightMode: 'Light Mode',
        darkMode: 'Dark Mode',
        backToOverview: 'Back to overview',
        selectFile: 'Choose audio or video file',
        languageAndModel: 'Select Language & Model',
        startTranscription: 'Start Transcription',
        activity: 'Activity',
        languageOption1: 'Swedish',
        languageOption2: 'Engelska',
        modelOption1: 'Small Model (Fast, less accurate)',
        modelOption2: 'Medium Model (Good results, slow)',
        modelOption3: 'Big Model (Best results, very slow)'
    }
};

// Apply theme
function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

// Apply language
function applyLanguage(lang) {
    const t = translations[lang] || translations['sv'];
    
    // Update all translatable elements
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (t[key]) {
            element.textContent = t[key];
        }
    });
}

// Initialize settings on page load
async function initializeSettings() {
    // Load settings from .ini file
    const settings = await Settings.load();
    
    // Apply theme
    applyTheme(settings.theme);
    
    // Apply language
    applyLanguage(settings.language);
    
    // Update settings form if it exists
    const languageSelect = document.getElementById('languageSelect');
    const themeSelect = document.getElementById('themeSelect');
    
    if (languageSelect) {
        languageSelect.value = settings.language;
        languageSelect.addEventListener('change', async (e) => {
            const newSettings = await Settings.update('language', e.target.value);
            applyLanguage(newSettings.language);
        });
    }
    
    if (themeSelect) {
        themeSelect.value = settings.theme;
        themeSelect.addEventListener('change', async (e) => {
            const newSettings = await Settings.update('theme', e.target.value);
            applyTheme(newSettings.theme);
        });
    }
}

// Modal functionality
function initializeSettingsModal() {
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeModalBtn = document.getElementById('closeModalBtn');

    if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener('click', () => {
            settingsModal.classList.add('show');
        });
    }

    if (closeModalBtn && settingsModal) {
        closeModalBtn.addEventListener('click', () => {
            settingsModal.classList.remove('show');
        });
    }

    // Close modal when clicking outside
    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.classList.remove('show');
            }
        });
    }
}

// Initialize when DOM is ready and pywebview is available
async function waitForPyWebview() {
    // Wait for pywebview to be available
    if (typeof pywebview === 'undefined' || !pywebview.api) {
        return new Promise((resolve) => {
            if (typeof window.addEventListener !== 'undefined') {
                window.addEventListener('pywebviewready', resolve, { once: true });
            } else {
                // Fallback: poll for pywebview
                const checkInterval = setInterval(() => {
                    if (typeof pywebview !== 'undefined' && pywebview.api) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            }
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for pywebview to be ready before initializing settings
    await waitForPyWebview();
    await initializeSettings();
    initializeSettingsModal();
});