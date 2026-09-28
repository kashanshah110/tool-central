(function () {
  "use strict";

  const mode = document.getElementById("percentage-mode");
  const first = document.getElementById("percentage-first");
  const second = document.getElementById("percentage-second");
  const firstLabel = document.getElementById("percentage-first-label");
  const secondLabel = document.getElementById("percentage-second-label");
  const result = document.getElementById("percentage-result");
  const error = document.getElementById("percentage-error");
  if (!mode || !first || !second || !firstLabel || !secondLabel || !result || !error) return;

  function updateLabels() {
    if (mode.value === "of") {
      firstLabel.textContent = "Percentage (X)";
      secondLabel.textContent = "Number (Y)";
      first.placeholder = "e.g. 15";
      second.placeholder = "e.g. 200";
    } else if (mode.value === "is") {
      firstLabel.textContent = "Part (X)";
      secondLabel.textContent = "Whole (Y)";
      first.placeholder = "e.g. 30";
      second.placeholder = "e.g. 200";
    } else {
      firstLabel.textContent = "Starting value (X)";
      secondLabel.textContent = "Final value (Y)";
      first.placeholder = "e.g. 80";
      second.placeholder = "e.g. 100";
    }
    result.textContent = "Enter both values to calculate.";
    error.textContent = "";
  }

  function calculate() {
    const x = Number(first.value);
    const y = Number(second.value);
    error.textContent = "";
    const inputs = [first, second];
    if (inputs.some((input) => input.validity.badInput ||
      (input.value.trim() !== "" && !Number.isFinite(Number(input.value))))) {
      result.textContent = "Number is too large";
      error.textContent = "Number is too large. Enter smaller values.";
      return;
    }
    if (first.value.trim() === "" || second.value.trim() === "" || !Number.isFinite(x) || !Number.isFinite(y)) {
      result.textContent = "Enter two valid numbers.";
      error.textContent = "Enter both values.";
      return;
    }
    if (mode.value !== "of" && y === 0) {
      result.textContent = "Cannot divide by zero.";
      error.textContent = mode.value === "is" ? "The whole value must not be zero." : "The starting value must not be zero.";
      return;
    }

    let value;
    let description;
    if (mode.value === "of") {
      value = x / 100 * y;
      description = `${x}% of ${y} is ${value}`;
    } else if (mode.value === "is") {
      value = x / y * 100;
      description = `${x} is ${value}% of ${y}`;
    } else {
      value = (y - x) / Math.abs(x) * 100;
      description = `Percentage change: ${value > 0 ? "+" : ""}${value}%`;
    }

    if (!Number.isFinite(value)) {
      result.textContent = "The result is outside the supported numeric range.";
      error.textContent = "Try smaller input values.";
      return;
    }
    result.textContent = description.replace(/-?\d+(?:\.\d+)?/g, (number) => Number(number).toLocaleString(undefined, { maximumFractionDigits: 8 }));
  }

  mode.addEventListener("change", updateLabels);
  document.getElementById("calculate-percentage").addEventListener("click", calculate);
  [first, second].forEach((input) => input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") calculate();
  }));
})();
