(function () {
  "use strict";

  const units = document.getElementById("bmi-units");
  const weightInput = document.getElementById("bmi-weight");
  const cmInput = document.getElementById("bmi-height-cm");
  const feetInput = document.getElementById("bmi-height-ft");
  const inchesInput = document.getElementById("bmi-height-in");
  const result = document.getElementById("bmi-result");
  const category = document.getElementById("bmi-category");
  const error = document.getElementById("bmi-error");
  if (!units || !weightInput || !cmInput || !feetInput || !inchesInput || !result || !category || !error) return;

  function setUnits() {
    const imperial = units.value === "imperial";
    document.querySelector('label[for="bmi-weight"]').textContent = imperial ? "Weight (lb)" : "Weight (kg)";
    document.getElementById("height-cm-wrap").hidden = imperial;
    document.getElementById("height-ft-wrap").hidden = !imperial;
    document.getElementById("height-in-wrap").hidden = !imperial;
    weightInput.value = "";
    cmInput.value = "";
    feetInput.value = "";
    inchesInput.value = "";
    result.textContent = "Enter your measurements to see an estimate.";
    category.textContent = "";
    error.textContent = "";
  }

  function calculate() {
    const weight = Number(weightInput.value);
    const feet = Number(feetInput.value);
    const inches = Number(inchesInput.value);
    const activeInputs = units.value === "metric"
      ? [weightInput, cmInput]
      : [weightInput, feetInput, inchesInput];
    const height = units.value === "metric"
      ? Number(cmInput.value) / 100
      : (feet * 12 + inches) * 0.0254;
    error.textContent = "";
    category.textContent = "";
    if (activeInputs.some((input) => input.validity.badInput ||
      (input.value.trim() !== "" && !Number.isFinite(Number(input.value))))) {
      result.textContent = "Number is too large";
      error.textContent = "Number is too large. Enter a smaller value.";
      return;
    }
    if (activeInputs.some((input) => input.value.trim() === "")) {
      result.textContent = "Enter your measurements";
      error.textContent = "Enter both weight and height measurements.";
      return;
    }
    if (!(weight > 0) || !(height > 0) || !Number.isFinite(weight) || !Number.isFinite(height)) {
      result.textContent = "Enter a valid positive weight and height.";
      error.textContent = "Both measurements must be positive numbers.";
      return;
    }
    if (units.value === "imperial" && (feet < 0 || inches < 0 || inches >= 12)) {
      result.textContent = "Enter a valid height.";
      error.textContent = "Inches must be at least 0 and less than 12.";
      return;
    }

    const bmi = weight / (height * height);
    if (!Number.isFinite(bmi)) {
      result.textContent = "The result is outside the supported range.";
      error.textContent = "Check your measurements and try again.";
      return;
    }

    let range = "Obesity range";
    if (bmi < 18.5) range = "Underweight range";
    else if (bmi < 25) range = "Healthy-weight range";
    else if (bmi < 30) range = "Overweight range";
    result.textContent = `BMI: ${bmi.toFixed(1)}`;
    category.textContent = `Adult screening category: ${range}`;
  }

  units.addEventListener("change", setUnits);
  document.getElementById("calculate-bmi").addEventListener("click", calculate);
  [weightInput, cmInput, feetInput, inchesInput].forEach((input) => input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") calculate();
  }));
})();
