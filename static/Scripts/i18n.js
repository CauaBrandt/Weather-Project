const SUPPORTED_LANGS = ["en", "pt-BR", "de"];
let translations = {};
let currentLang = "en";

// Resolves once the first language file has loaded (data.js waits for this)
let resolveI18nReady;
const i18nReady = new Promise(resolve => { resolveI18nReady = resolve; });

function t(key) {
    return translations[key] ?? key;
}

function applyTranslations() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
        el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
        el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    document.title = t("pageTitle");
}

async function setLanguage(lang) {
    try {
        const res = await fetch(`${window.LANG_PATH}/${lang}.json`);
        translations = await res.json();
    } catch (err) {
        console.error("Could not load language file:", lang, err);
        resolveI18nReady(); // don't block the app if the file is missing
        return;
    }

    currentLang = lang;
    document.documentElement.lang = lang;
    applyTranslations();

    try {
        localStorage.setItem("lang", lang);
    } catch (e) {}

    resolveI18nReady();

    document.dispatchEvent(new CustomEvent("i18n:changed", { detail: lang }));
}

function pickInitialLanguage() {
    try {
        const saved = localStorage.getItem("lang");
        if (SUPPORTED_LANGS.includes(saved)) return saved;
    } catch (e) {}
    if (navigator.language.toLowerCase().startsWith("pt")) return "pt-BR";
    if (navigator.language.toLowerCase().startsWith("de")) return "de";
    return "en";
}

document.addEventListener("DOMContentLoaded", () => {
    const select = document.getElementById("lang-select");
    const initial = pickInitialLanguage();
    select.value = initial;
    setLanguage(initial);
    select.addEventListener("change", () => setLanguage(select.value));
});
