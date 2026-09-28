(function () {
  "use strict";

  const characterGroups = {
    uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    lowercase: "abcdefghijklmnopqrstuvwxyz",
    numbers: "0123456789",
    symbols: "!@#$%^&*()-_=+[]{};:,.?/",
  };
  const ambiguousCharacters = new Set("0O1Il|`'\"");
  const strengthLabels = ["Weak", "Fair", "Good", "Strong", "Very strong"];
  const commonPatterns = [
    "password",
    "qwerty",
    "letmein",
    "welcome",
    "admin",
    "123456",
    "111111",
    "abc123",
  ];

  const lengthInput = document.getElementById("password-length");
  const lengthValue = document.getElementById("password-length-value");
  const generatedInput = document.getElementById("generated-password");
  const generatedToggle = document.getElementById("toggle-generated-password");
  const generatorStatus = document.getElementById("generator-status");
  const checkedInput = document.getElementById("password-to-check");
  const characterOptions = [
    ["include-uppercase", "uppercase"],
    ["include-lowercase", "lowercase"],
    ["include-numbers", "numbers"],
    ["include-symbols", "symbols"],
  ];

  function secureRandomIndex(max) {
    if (!Number.isSafeInteger(max) || max < 1 || max > 256) {
      throw new RangeError("Random selection range is invalid.");
    }
    if (!window.crypto || typeof window.crypto.getRandomValues !== "function") {
      throw new Error("Secure random generation is not available in this browser.");
    }

    const limit = Math.floor(256 / max) * max;
    const randomValues = new Uint8Array(64);
    while (true) {
      window.crypto.getRandomValues(randomValues);
      for (const value of randomValues) {
        if (value < limit) return value % max;
      }
    }
  }

  function shuffleSecurely(characters) {
    for (let i = characters.length - 1; i > 0; i -= 1) {
      const swapIndex = secureRandomIndex(i + 1);
      [characters[i], characters[swapIndex]] = [characters[swapIndex], characters[i]];
    }
    return characters;
  }

  function selectedGroups() {
    const excludeAmbiguous = document.getElementById("exclude-ambiguous").checked;
    return characterOptions
      .filter(([checkboxId]) => document.getElementById(checkboxId).checked)
      .map(([, groupName]) => {
        const characters = Array.from(characterGroups[groupName]);
        return excludeAmbiguous
          ? characters.filter((character) => !ambiguousCharacters.has(character)).join("")
          : characters.join("");
      })
      .filter((characters) => characters.length > 0);
  }

  function makePassword(length, groups, noRepeats) {
    if (!groups.length) {
      throw new Error("Select at least one character group.");
    }
    if (length < groups.length) {
      throw new Error("Choose a longer password or fewer character groups.");
    }

    const available = Array.from(new Set(groups.join("")));
    if (noRepeats && length > available.length) {
      throw new Error("There are not enough unique characters for this length. Allow repeats or select more character types.");
    }

    const password = groups.map((group) => group[secureRandomIndex(group.length)]);
    const remaining = available.filter((character) => !password.includes(character));
    const fillCharacters = noRepeats ? remaining : available;
    while (password.length < length) {
      password.push(fillCharacters[secureRandomIndex(fillCharacters.length)]);
      if (noRepeats) fillCharacters.splice(fillCharacters.indexOf(password[password.length - 1]), 1);
    }
    return shuffleSecurely(password).join("");
  }

  function analyzePassword(password) {
    const suggestions = [];
    const classes = [
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /\d/.test(password),
      /[^A-Za-z0-9]/.test(password),
    ].filter(Boolean).length;
    const hasCommonPattern = commonPatterns.some((pattern) =>
      password.toLowerCase().includes(pattern)
    );
    const hasRepeatedRun = /(.)\1{2,}/u.test(password);
    const hasSequence =
      /(?:0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|qwer|asdf|zxcv)/i.test(password);

    let score = 0;
    if (password.length >= 8) score = 1;
    if (password.length >= 12) score = 2;
    if (password.length >= 16) score = 3;
    if (classes >= 3) score = Math.min(4, score + 1);
    if (password.length >= 20 && classes >= 3) score = 4;
    if (hasCommonPattern) score -= 2;
    if (hasRepeatedRun) score -= 1;
    if (hasSequence) score -= 1;
    score = Math.max(0, Math.min(4, score));

    if (password.length < 16) suggestions.push("Use at least 16 characters; longer passwords are harder to guess.");
    if (classes < 3) suggestions.push("Add more character types, such as uppercase letters, numbers, or symbols.");
    if (hasCommonPattern) suggestions.push("Avoid common words or patterns such as “password,” “qwerty,” or “123456.”");
    if (hasRepeatedRun) suggestions.push("Avoid repeating the same character several times in a row.");
    if (hasSequence) suggestions.push("Avoid predictable sequences such as “1234,” “abcd,” or “qwer.”");
    suggestions.push("Use a different password for every account; a password manager can help.");

    return { score, label: strengthLabels[score], suggestions };
  }

  function updateStrength(password, prefix) {
    const label = document.getElementById(`${prefix}-strength-label`);
    const meter = document.getElementById(`${prefix}-strength-meter`);
    const tips = document.getElementById(`${prefix}-password-tips`);
    const strengthPanel = document.getElementById(`${prefix}-strength`);
    if (!password) {
      label.textContent = "Enter a password";
      meter.value = 0;
      meter.textContent = "0 out of 4";
      strengthPanel.removeAttribute("data-strength");
      tips.replaceChildren();
      return;
    }

    const result = analyzePassword(password);
    label.textContent = result.label;
    meter.value = result.score;
    meter.textContent = `${result.score} out of 4`;
    strengthPanel.dataset.strength = result.label.toLowerCase().replace(/\s+/g, "-");
    tips.replaceChildren(
      ...result.suggestions.map((suggestion) => {
        const item = document.createElement("li");
        item.textContent = suggestion;
        return item;
      })
    );
  }

  function updateToggleState(input, button) {
    if (!input.value) input.type = "password";
    const visible = input.type === "text";
    button.textContent = visible ? "Hide" : "Show";
    button.setAttribute("aria-pressed", String(visible));
  }

  function generatePassword() {
    generatedInput.value = "";
    updateToggleState(generatedInput, generatedToggle);
    generatorStatus.textContent = "";
    generatorStatus.classList.remove("is-error");
    try {
      const password = makePassword(
        Number(lengthInput.value),
        selectedGroups(),
        document.getElementById("no-repeats").checked
      );
      generatedInput.value = password;
      document.getElementById("copy-password").disabled = false;
      updateStrength(password, "generated");
    } catch (error) {
      generatedInput.value = "";
      document.getElementById("copy-password").disabled = true;
      updateStrength("", "generated");
      generatorStatus.textContent = error.message;
      generatorStatus.classList.add("is-error");
    }
  }

  lengthInput.addEventListener("input", () => {
    lengthValue.value = lengthInput.value;
  });
  document.getElementById("generate-password").addEventListener("click", generatePassword);

  document.getElementById("copy-password").addEventListener("click", async () => {
    if (!generatedInput.value) return;
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
      generatorStatus.textContent = "Clipboard access is unavailable. Select the password to copy it.";
      generatorStatus.classList.add("is-error");
      return;
    }
    try {
      await navigator.clipboard.writeText(generatedInput.value);
      generatorStatus.textContent = "Password copied. Paste it only into the intended password manager or account.";
      generatorStatus.classList.remove("is-error");
    } catch (error) {
      generatorStatus.textContent = "Could not copy the password. Check clipboard permissions.";
      generatorStatus.classList.add("is-error");
    }
  });

  [
    ["toggle-generated-password", generatedInput],
    ["toggle-checked-password", checkedInput],
  ].forEach(([buttonId, input]) => {
    const button = document.getElementById(buttonId);
    updateToggleState(input, button);
    button.addEventListener("click", (event) => {
      const button = event.currentTarget;
      const shouldShow = input.type === "password";
      input.type = shouldShow ? "text" : "password";
      updateToggleState(input, button);
    });
    input.addEventListener("input", () => updateToggleState(input, button));
  });

  document.getElementById("check-password").addEventListener("click", () => {
    updateStrength(checkedInput.value, "checked");
  });
  checkedInput.addEventListener("input", () => updateStrength(checkedInput.value, "checked"));
})();
