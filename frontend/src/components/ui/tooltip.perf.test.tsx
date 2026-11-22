import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HintProvider } from "../HintProvider";
import { Hint } from "./tooltip";

afterEach(cleanup);

const TEXTS = Array.from({ length: 12 }, (_, i) => `Rule ${i}.`);
const COUNT = 8000;

const timed = (draw: () => void) => {
  const started = performance.now();
  draw();
  return performance.now() - started;
};

describe("Hint cost", () => {
  it("REQ-UI-132 thousands of hints cost one description per distinct text and about the same time as plain marks", () => {
    const plain = timed(() => render(<ul>{Array.from({ length: COUNT }, (_, i) => <li key={i}><span>{TEXTS[i % 12]}</span></li>)}</ul>));
    cleanup();
    const hinted = timed(() =>
      render(
        <HintProvider>
          <ul>
            {Array.from({ length: COUNT }, (_, i) => (
              <li key={i}>
                <Hint text={TEXTS[i % 12]}>
                  <span>{TEXTS[i % 12]}</span>
                </Hint>
              </li>
            ))}
          </ul>
        </HintProvider>,
      ),
    );
    expect(document.querySelectorAll("[id^='hint-']")).toHaveLength(TEXTS.length);
    expect(document.body.children.length).toBeLessThan(5);
    expect(hinted).toBeLessThan(plain * 4 + 500);
  });
});
