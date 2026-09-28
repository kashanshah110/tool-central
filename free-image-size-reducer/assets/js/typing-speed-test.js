(function () {
  "use strict";

  const passages = [
    "A quiet morning is a good time to plan the day. Make a short list, choose one useful task, and begin without waiting for the perfect moment. Small steps often lead to the most lasting progress.",
    "Clear writing starts with a clear thought. Take a moment to organize your ideas, use simple words, and read each sentence once more. A little care can make a message easier for everyone to understand.",
    "Learning a new skill takes patience and regular practice. Set a goal that feels possible, notice what improves, and keep going when a task feels difficult. Consistent effort can make a big difference over time.",
    "A good book can take you to places you have never seen. It can introduce a new idea, share a different point of view, or make an ordinary afternoon feel full of possibility. Reading rewards curiosity.",
    "Technology works best when it helps people solve real problems. Useful tools save time, explain what is happening, and make everyday tasks simpler. Thoughtful design begins by listening to the people who use it.",
    "A walk outside can be a simple way to reset your focus. Notice the weather, the sound of the trees, and the streets around you. A few quiet minutes can help you return to your work with fresh attention.",
    "Careful practice is more valuable than rushing through every exercise. Pay attention to each movement, correct small mistakes, and build confidence one repetition at a time. Strong habits grow through steady work.",
    "Good teamwork depends on honest communication and respect. Share what you know, ask when something is unclear, and make room for other ideas. A group can do better work when everyone feels heard.",
    "The best way to explore a new place is to stay curious. Look beyond the main road, ask a thoughtful question, and give yourself time to notice small details. Unexpected discoveries often become favorite memories.",
    "Rest is an important part of doing focused work. Step away from the screen, stretch your shoulders, and let your attention settle. Returning with a clear mind can make the next task feel much easier."
  ];

  const durationInput = document.getElementById("test-duration");
  const startButton = document.getElementById("start-test");
  const timeLeft = document.getElementById("time-left");
  const prompt = document.getElementById("typing-prompt");
  const typingInput = document.getElementById("typing-input");
  const liveWpm = document.getElementById("live-wpm");
  const liveWpmUnit = document.getElementById("live-wpm-unit");
  const liveAccuracy = document.getElementById("live-accuracy");
  const liveAccuracyUnit = document.getElementById("live-accuracy-unit");
  const liveErrors = document.getElementById("live-errors");
  const result = document.getElementById("typing-result");
  const finalWpm = document.getElementById("final-wpm");
  const finalWpmUnit = document.getElementById("final-wpm-unit");
  const finalAccuracy = document.getElementById("final-accuracy");
  const finalAccuracyUnit = document.getElementById("final-accuracy-unit");
  const finalErrors = document.getElementById("final-errors");
  const finalCorrect = document.getElementById("final-correct");
  const noTypingMessage = document.getElementById("no-typing-message");

  if (!startButton || !durationInput || !typingInput || !prompt) return;

  let active = false;
  let passageText = "";
  let previousPassageIndex = -1;
  let duration = Number(durationInput.value);
  let deadline = 0;
  let timerId = null;
  let lastMetrics = { wpm: null, accuracy: null, errors: 0, correct: 0 };

  function choosePassage() {
    let index;
    do {
      index = Math.floor(Math.random() * passages.length);
    } while (passages.length > 1 && index === previousPassageIndex);
    previousPassageIndex = index;
    return passages[index];
  }

  function appendPassage() {
    if (passageText) passageText += " ";
    passageText += choosePassage();
  }

  function renderPrompt(typedText) {
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < passageText.length; index += 1) {
      const character = document.createElement("span");
      character.textContent = passageText[index];
      if (index < typedText.length) {
        character.className =
          typedText[index] === passageText[index] ? "is-correct" : "is-incorrect";
      } else if (index === typedText.length && active) {
        character.className = "is-current";
      }
      fragment.appendChild(character);
    }
    prompt.replaceChildren(fragment);
  }

  function getMetrics(typedText, elapsedSeconds) {
    let correct = 0;
    const comparedLength = Math.min(typedText.length, passageText.length);
    for (let index = 0; index < comparedLength; index += 1) {
      if (typedText[index] === passageText[index]) correct += 1;
    }

    const errors = typedText.length - correct;
    const accuracy = typedText.length ? Math.round((correct / typedText.length) * 100) : null;
    const minutes = Math.max(elapsedSeconds, 0.1) / 60;
    const wpm = typedText.length ? Math.round(correct / 5 / minutes) : null;
    return { wpm, accuracy, errors, correct };
  }

  function updateMetrics(elapsedSeconds) {
    lastMetrics = getMetrics(typingInput.value, elapsedSeconds);
    liveWpm.textContent = lastMetrics.wpm === null ? "--" : String(lastMetrics.wpm);
    liveWpmUnit.hidden = lastMetrics.wpm === null;
    liveAccuracy.textContent = lastMetrics.accuracy === null ? "--" : String(lastMetrics.accuracy);
    liveAccuracyUnit.hidden = lastMetrics.accuracy === null;
    liveErrors.textContent = String(lastMetrics.errors);
    renderPrompt(typingInput.value);
  }

  function finishTest() {
    if (!active) return;
    active = false;
    clearInterval(timerId);
    timerId = null;
    typingInput.disabled = true;
    durationInput.disabled = false;
    startButton.textContent = "Try another passage";
    timeLeft.textContent = "0";
    updateMetrics(duration);
    finalWpm.textContent = lastMetrics.wpm === null ? "--" : String(lastMetrics.wpm);
    finalWpmUnit.hidden = lastMetrics.wpm === null;
    finalAccuracy.textContent = lastMetrics.accuracy === null ? "--" : String(lastMetrics.accuracy);
    finalAccuracyUnit.hidden = lastMetrics.accuracy === null;
    finalErrors.textContent = String(lastMetrics.errors);
    finalCorrect.textContent = String(lastMetrics.correct);
    noTypingMessage.hidden = typingInput.value.length > 0;
    result.hidden = false;
  }

  function updateTimer() {
    const remaining = Math.max(0, deadline - Date.now());
    timeLeft.textContent = String(Math.ceil(remaining / 1000));
    const elapsed = duration - remaining / 1000;
    updateMetrics(elapsed);
    if (remaining <= 0) finishTest();
  }

  function startTest() {
    clearInterval(timerId);
    duration = Number(durationInput.value);
    passageText = "";
    previousPassageIndex = -1;
    appendPassage();
    typingInput.value = "";
    typingInput.disabled = false;
    durationInput.disabled = true;
    startButton.textContent = "Restart test";
    result.hidden = true;
    active = true;
    deadline = Date.now() + duration * 1000;
    timeLeft.textContent = String(duration);
    updateMetrics(0);
    typingInput.focus();
    timerId = setInterval(updateTimer, 100);
  }

  durationInput.addEventListener("change", () => {
    timeLeft.textContent = durationInput.value;
  });

  typingInput.addEventListener("input", () => {
    if (!active) return;
    while (typingInput.value.length >= passageText.length) appendPassage();
    const elapsed = duration - Math.max(0, deadline - Date.now()) / 1000;
    updateMetrics(elapsed);
  });

  startButton.addEventListener("click", startTest);
})();
