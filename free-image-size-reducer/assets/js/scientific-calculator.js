(function () {
  "use strict";

  const expressionInput = document.getElementById("scientific-expression");
  const angleMode = document.getElementById("angle-mode");
  const result = document.getElementById("scientific-result");
  const error = document.getElementById("calculator-error");
  if (!expressionInput || !angleMode || !result || !error) return;

  const functions = new Set(["sin", "cos", "tan", "asin", "acos", "atan", "sqrt", "log", "ln", "abs"]);
  const maxExpressionLength = 512;
  const maxParseDepth = 64;

  function tokenize(input) {
    if (input.length > maxExpressionLength) {
      throw new Error(`Expressions must be ${maxExpressionLength} characters or fewer.`);
    }
    const tokens = [];
    let index = 0;
    while (index < input.length) {
      if (/\s/.test(input[index])) {
        index += 1;
        continue;
      }
      const number = /^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i.exec(input.slice(index));
      if (number) {
        tokens.push({ type: "number", value: Number(number[0]) });
        index += number[0].length;
        continue;
      }
      const identifier = /^[a-z]+/i.exec(input.slice(index));
      if (identifier) {
        tokens.push({ type: "identifier", value: identifier[0].toLowerCase() });
        index += identifier[0].length;
        continue;
      }
      if ("+-*/^!()".includes(input[index])) {
        tokens.push({ type: input[index], value: input[index] });
        index += 1;
        continue;
      }
      throw new Error(`Unsupported character: ${input[index]}`);
    }
    return tokens;
  }

  function factorial(value) {
    if (!Number.isInteger(value) || value < 0 || value > 170) {
      throw new Error("Factorial requires a whole number from 0 to 170.");
    }
    let total = 1;
    for (let number = 2; number <= value; number += 1) total *= number;
    return total;
  }

  function evaluate(input) {
    const tokens = tokenize(input);
    let cursor = 0;
    const degrees = angleMode.value === "deg";
    const toRadians = (value) => degrees ? value * Math.PI / 180 : value;
    const fromRadians = (value) => degrees ? value * 180 / Math.PI : value;

    function parseExpression(minBindingPower = 0, depth = 0) {
      if (depth > maxParseDepth) throw new Error("Expression is nested too deeply.");
      let token = tokens[cursor++];
      if (!token) throw new Error("Incomplete expression.");
      let left;

      if (token.type === "number") {
        left = token.value;
      } else if (token.type === "+" || token.type === "-") {
        const value = parseExpression(25, depth + 1);
        left = token.type === "-" ? -value : value;
      } else if (token.type === "(") {
        left = parseExpression(0, depth + 1);
        if (tokens[cursor++]?.type !== ")") throw new Error("Missing closing parenthesis.");
      } else if (token.type === "identifier") {
        if (token.value === "pi") left = Math.PI;
        else if (token.value === "e") left = Math.E;
        else if (functions.has(token.value)) {
          if (tokens[cursor++]?.type !== "(") throw new Error(`${token.value} needs parentheses.`);
          const value = parseExpression(0, depth + 1);
          if (tokens[cursor++]?.type !== ")") throw new Error("Missing closing parenthesis.");
          const fn = {
            sin: () => Math.sin(toRadians(value)),
            cos: () => Math.cos(toRadians(value)),
            tan: () => Math.tan(toRadians(value)),
            asin: () => fromRadians(Math.asin(value)),
            acos: () => fromRadians(Math.acos(value)),
            atan: () => fromRadians(Math.atan(value)),
            sqrt: () => Math.sqrt(value),
            log: () => Math.log10(value),
            ln: () => Math.log(value),
            abs: () => Math.abs(value),
          }[token.value];
          left = fn();
        } else {
          throw new Error(`Unknown name: ${token.value}`);
        }
      } else {
        throw new Error("Expected a number, constant, or opening parenthesis.");
      }

      while (cursor < tokens.length) {
        token = tokens[cursor];
        if (token.type === "!") {
          if (35 < minBindingPower) break;
          cursor += 1;
          left = factorial(left);
          continue;
        }

        const binding = { "+": 10, "-": 10, "*": 20, "/": 20, "^": 30 }[token.type];
        if (binding === undefined || binding < minBindingPower) break;
        cursor += 1;
        const right = parseExpression(token.type === "^" ? binding : binding + 1, depth + 1);
        if (token.type === "+") left += right;
        if (token.type === "-") left -= right;
        if (token.type === "*") left *= right;
        if (token.type === "/") {
          if (right === 0) throw new Error("Cannot divide by zero.");
          left /= right;
        }
        if (token.type === "^") left **= right;
      }
      return left;
    }

    if (!tokens.length) throw new Error("Enter an expression.");
    const value = parseExpression();
    if (cursor !== tokens.length) throw new Error("Check the expression near the remaining input.");
    if (!Number.isFinite(value)) throw new Error("The result is outside the supported numeric range.");
    return value;
  }

  function calculate() {
    try {
      const value = evaluate(expressionInput.value);
      result.textContent = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 12 }).format(value);
      error.textContent = "";
      expressionInput.setAttribute("aria-invalid", "false");
    } catch (exception) {
      result.textContent = "No result";
      error.textContent = exception.message;
      expressionInput.setAttribute("aria-invalid", "true");
    }
  }

  document.querySelector(".calculator-keys").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "clear") expressionInput.value = "";
    else if (action === "backspace") expressionInput.value = expressionInput.value.slice(0, -1);
    else if (action === "sign") expressionInput.value = expressionInput.value.startsWith("-")
      ? expressionInput.value.slice(1)
      : `-${expressionInput.value}`;
    else if (action === "equals") {
      calculate();
      return;
    } else {
      expressionInput.value += button.dataset.insert || "";
    }
    expressionInput.focus();
    error.textContent = "";
  });

  expressionInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      calculate();
    }
  });
})();
