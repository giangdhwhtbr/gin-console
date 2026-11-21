import "@testing-library/jest-dom/vitest";

// jsdom does not scroll: its scrollTo only logs "not implemented"
window.scrollTo = () => undefined;
