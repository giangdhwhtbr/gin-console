import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";
import { resetSession } from "@/app/session";

// jsdom does not scroll: its scrollTo only logs "not implemented"
window.scrollTo = () => undefined;

// the console runs with auth off unless a test loads a session
beforeEach(() => resetSession());
