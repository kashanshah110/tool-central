(function () {
  "use strict";

  const birthInput = document.getElementById("birth-date");
  const asOfInput = document.getElementById("age-as-of");
  const result = document.getElementById("age-result");
  const error = document.getElementById("age-error");
  if (!birthInput || !asOfInput || !result || !error) return;

  const today = new Date();
  const todayString = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
  asOfInput.value = todayString;
  asOfInput.min = "1000-01-01";
  asOfInput.max = todayString;
  birthInput.min = "1000-01-01";
  birthInput.max = todayString;

  function readDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    const [, year, month, day] = match.map(Number);
    if (year < 1000 || year > today.getFullYear()) return null;
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
      ? { year, month, day }
      : null;
  }

  function calculateAge() {
    error.textContent = "";
    const birth = readDate(birthInput.value);
    const asOf = readDate(asOfInput.value);
    if (!birth || !asOf) {
      result.textContent = "Choose valid birth and end dates.";
      error.textContent = "Please enter both dates.";
      return;
    }

    const birthStamp = Date.UTC(birth.year, birth.month - 1, birth.day);
    const asOfStamp = Date.UTC(asOf.year, asOf.month - 1, asOf.day);
    const todayStamp = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    if (asOfStamp > todayStamp) {
      result.textContent = "The end date cannot be in the future.";
      error.textContent = "Choose today or an earlier end date.";
      return;
    }
    if (birthStamp > asOfStamp) {
      result.textContent = "The date of birth must be on or before the end date.";
      error.textContent = "Choose a date of birth that is not in the future.";
      return;
    }

    let years = asOf.year - birth.year;
    let months = asOf.month - birth.month;
    let days = asOf.day - birth.day;
    if (days < 0) {
      months -= 1;
      days += new Date(Date.UTC(asOf.year, asOf.month - 1, 0)).getUTCDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    result.textContent = `${years} ${years === 1 ? "year" : "years"}, ${months} ${months === 1 ? "month" : "months"}, and ${days} ${days === 1 ? "day" : "days"}`;
  }

  document.getElementById("calculate-age").addEventListener("click", calculateAge);
  [birthInput, asOfInput].forEach((input) => input.addEventListener("change", calculateAge));
})();
