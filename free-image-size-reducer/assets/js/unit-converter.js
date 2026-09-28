(function () {
  "use strict";

  const categories = {
    length: {
      base: "m",
      units: [
        ["mm", "Millimeter (mm)", 0.001],
        ["cm", "Centimeter (cm)", 0.01],
        ["m", "Meter (m)", 1],
        ["km", "Kilometer (km)", 1000],
        ["in", "Inch (in)", 0.0254],
        ["ft", "Foot (ft)", 0.3048],
        ["yd", "Yard (yd)", 0.9144],
        ["mi", "Mile (mi)", 1609.344],
        ["nmi", "Nautical mile (nmi)", 1852],
        ["um", "Micrometer (µm)", 1e-6],
        ["nm", "Nanometer (nm)", 1e-9],
        ["ly", "Light-year (ly)", 9.4607304725808e15],
        ["au", "Astronomical unit (AU)", 149597870700],
        ["pc", "Parsec (pc)", 3.085677581491367e16],
      ],
    },
    area: {
      base: "m2",
      units: [
        ["mm2", "Square millimeter (mm²)", 1e-6],
        ["cm2", "Square centimeter (cm²)", 1e-4],
        ["m2", "Square meter (m²)", 1],
        ["km2", "Square kilometer (km²)", 1e6],
        ["ha", "Hectare (ha)", 10000],
        ["acre", "Acre (ac)", 4046.8564224],
        ["in2", "Square inch (in²)", 0.00064516],
        ["ft2", "Square foot (ft²)", 0.09290304],
        ["yd2", "Square yard (yd²)", 0.83612736],
        ["mi2", "Square mile (mi²)", 2589988.110336],
      ],
    },
    volume: {
      base: "m3",
      units: [
        ["ml", "Milliliter (mL)", 1e-6],
        ["l", "Liter (L)", 0.001],
        ["m3", "Cubic meter (m³)", 1],
        ["tsp", "US teaspoon (tsp)", 4.92892159375e-6],
        ["tbsp", "US tablespoon (tbsp)", 1.478676478125e-5],
        ["floz", "US fluid ounce (fl oz)", 2.95735295625e-5],
        ["cup", "US cup", 0.0002365882365],
        ["pt", "US pint (pt)", 0.000473176473],
        ["qt", "US quart (qt)", 0.000946352946],
        ["gal", "US gallon (gal)", 0.003785411784],
        ["igal", "Imperial gallon (imp gal)", 0.00454609],
        ["in3", "Cubic inch (in³)", 1.6387064e-5],
        ["ft3", "Cubic foot (ft³)", 0.028316846592],
      ],
    },
    mass: {
      base: "kg",
      units: [
        ["ug", "Microgram (µg)", 1e-9],
        ["mg", "Milligram (mg)", 1e-6],
        ["g", "Gram (g)", 0.001],
        ["kg", "Kilogram (kg)", 1],
        ["tonne", "Metric tonne (t)", 1000],
        ["oz", "Ounce (oz)", 0.028349523125],
        ["lb", "Pound (lb)", 0.45359237],
        ["stone", "Stone (st)", 6.35029318],
        ["uston", "US short ton", 907.18474],
        ["ukton", "UK long ton", 1016.0469088],
      ],
    },
    temperature: {
      units: [
        ["c", "Celsius (°C)", 1, 0, -273.15],
        ["f", "Fahrenheit (°F)", 5 / 9, -160 / 9, -459.67],
        ["k", "Kelvin (K)", 1, -273.15, 0],
        ["r", "Rankine (°R)", 5 / 9, -273.15, 0],
      ],
    },
    speed: {
      base: "mps",
      units: [
        ["mps", "Meter per second (m/s)", 1],
        ["kph", "Kilometer per hour (km/h)", 1 / 3.6],
        ["mph", "Mile per hour (mph)", 0.44704],
        ["knot", "Knot (kn)", 0.5144444444444445],
        ["fps", "Foot per second (ft/s)", 0.3048],
        ["mach", "Mach (Ma)", 340.29],
      ],
    },
    time: {
      base: "s",
      units: [
        ["ns", "Nanosecond (ns)", 1e-9],
        ["us", "Microsecond (µs)", 1e-6],
        ["ms", "Millisecond (ms)", 0.001],
        ["s", "Second (s)", 1],
        ["min", "Minute (min)", 60],
        ["h", "Hour (h)", 3600],
        ["day", "Day (d)", 86400],
        ["week", "Week (7 days)", 604800],
      ],
    },
    digital: {
      base: "byte",
      units: [
        ["bit", "Bit (b)", 0.125],
        ["byte", "Byte (B)", 1],
        ["kb", "Kilobyte (kB)", 1000],
        ["kib", "Kibibyte (KiB)", 1024],
        ["mb", "Megabyte (MB)", 1e6],
        ["mib", "Mebibyte (MiB)", 1048576],
        ["gb", "Gigabyte (GB)", 1e9],
        ["gib", "Gibibyte (GiB)", 1073741824],
        ["tb", "Terabyte (TB)", 1e12],
        ["tib", "Tebibyte (TiB)", 1099511627776],
      ],
    },
    pressure: {
      base: "pa",
      units: [
        ["pa", "Pascal (Pa)", 1],
        ["kpa", "Kilopascal (kPa)", 1000],
        ["mpa", "Megapascal (MPa)", 1e6],
        ["bar", "Bar (bar)", 100000],
        ["mbar", "Millibar (mbar)", 100],
        ["atm", "Standard atmosphere (atm)", 101325],
        ["psi", "Pound per square inch (psi)", 6894.757293168],
        ["mmhg", "Millimeter of mercury (mmHg)", 133.322387415],
        ["torr", "Torr (Torr)", 101325 / 760],
      ],
    },
    energy: {
      base: "j",
      units: [
        ["j", "Joule (J)", 1],
        ["kj", "Kilojoule (kJ)", 1000],
        ["cal", "Calorie (cal)", 4.184],
        ["kcal", "Kilocalorie (kcal)", 4184],
        ["wh", "Watt-hour (Wh)", 3600],
        ["kwh", "Kilowatt-hour (kWh)", 3600000],
        ["ev", "Electronvolt (eV)", 1.602176634e-19],
        ["btu", "British thermal unit (BTU)", 1055.05585262],
        ["ftlb", "Foot-pound (ft·lbf)", 1.3558179483314],
      ],
    },
    power: {
      base: "w",
      units: [
        ["w", "Watt (W)", 1],
        ["kw", "Kilowatt (kW)", 1000],
        ["mw", "Megawatt (MW)", 1e6],
        ["hp", "Mechanical horsepower (hp)", 745.6998715822702],
        ["ps", "Metric horsepower (PS)", 735.49875],
        ["btuhr", "BTU per hour (BTU/h)", 0.29307107],
      ],
    },
    frequency: {
      base: "hz",
      units: [
        ["hz", "Hertz (Hz)", 1],
        ["khz", "Kilohertz (kHz)", 1000],
        ["mhz", "Megahertz (MHz)", 1e6],
        ["ghz", "Gigahertz (GHz)", 1e9],
        ["rpm", "Revolutions per minute (rpm)", 1 / 60],
      ],
    },
    angle: {
      base: "rad",
      units: [
        ["rad", "Radian (rad)", 1],
        ["deg", "Degree (°)", Math.PI / 180],
        ["grad", "Gradian (gon)", Math.PI / 200],
        ["turn", "Turn (tr)", 2 * Math.PI],
        ["arcmin", "Arcminute (′)", Math.PI / 10800],
        ["arcsec", "Arcsecond (″)", Math.PI / 648000],
      ],
    },
    force: {
      base: "n",
      units: [
        ["n", "Newton (N)", 1],
        ["kn", "Kilonewton (kN)", 1000],
        ["mn", "Millinewton (mN)", 0.001],
        ["dyn", "Dyne (dyn)", 1e-5],
        ["kgf", "Kilogram-force (kgf)", 9.80665],
        ["lbf", "Pound-force (lbf)", 4.4482216152605],
      ],
    },
  };

  const categorySelect = document.getElementById("unit-category");
  const valueInput = document.getElementById("unit-value");
  const fromSelect = document.getElementById("unit-from");
  const toSelect = document.getElementById("unit-to");
  const precisionSelect = document.getElementById("unit-precision");
  const output = document.getElementById("unit-output");
  const copyButton = document.getElementById("unit-copy");
  const status = document.getElementById("unit-status");
  let resultText = "";

  function getUnit(category, id) {
    return categories[category].units.find((unit) => unit[0] === id);
  }

  function populateUnits() {
    const units = categories[categorySelect.value].units;
    [fromSelect, toSelect].forEach((select) => {
      select.replaceChildren(
        ...units.map((unit) => {
          const option = document.createElement("option");
          option.value = unit[0];
          option.textContent = unit[1];
          return option;
        })
      );
    });
    fromSelect.value = units[0][0];
    toSelect.value = units[Math.min(1, units.length - 1)][0];
    convert();
  }

  function formatValue(value) {
    const precision = Number(precisionSelect.value);
    const absolute = Math.abs(value);
    const options = {
      maximumFractionDigits: precision,
      useGrouping: true,
      notation:
        absolute >= 1e15 || (absolute > 0 && absolute < 10 ** -precision)
          ? "scientific"
          : "standard",
    };
    return new Intl.NumberFormat(undefined, options).format(value);
  }

  function convert() {
    const rawValue = valueInput.value.trim();
    status.textContent = "";
    status.classList.remove("is-error");
    copyButton.disabled = true;
    resultText = "";

    if (valueInput.validity.badInput) {
      output.textContent = "Number is too large";
      status.textContent = "Number is too large. Enter a smaller value.";
      status.classList.add("is-error");
      return;
    }

    if (!rawValue) {
      output.textContent = "Enter a value to convert";
      return;
    }

    const value = Number(rawValue);
    if (!Number.isFinite(value)) {
      output.textContent = "Number is too large";
      status.textContent = "Number is too large. Enter a smaller value.";
      status.classList.add("is-error");
      return;
    }

    const category = categories[categorySelect.value];
    const source = getUnit(categorySelect.value, fromSelect.value);
    const target = getUnit(categorySelect.value, toSelect.value);
    if (!source || !target) {
      output.textContent = "Choose valid units";
      status.textContent = "Choose a supported unit for both fields.";
      status.classList.add("is-error");
      return;
    }

    let converted;
    if (categorySelect.value === "temperature") {
      if (value < source[4]) {
        output.textContent = "Below absolute zero";
        status.textContent = "Temperature cannot be below absolute zero.";
        status.classList.add("is-error");
        return;
      }
      const baseValue = value * source[2] + source[3];
      converted = (baseValue - target[3]) / target[2];
    } else {
      converted = (value * source[2]) / target[2];
    }

    if (!Number.isFinite(converted)) {
      output.textContent = "Result is outside the supported numeric range";
      status.textContent = "Try a smaller input value.";
      status.classList.add("is-error");
      return;
    }

    resultText = `${formatValue(converted)} ${target[1].match(/\(([^)]+)\)$/)?.[1] || target[1]}`;
    output.textContent = resultText;
    copyButton.disabled = false;
  }

  categorySelect.addEventListener("change", populateUnits);
  [valueInput, fromSelect, toSelect, precisionSelect].forEach((element) => {
    element.addEventListener("input", convert);
    element.addEventListener("change", convert);
  });

  document.getElementById("unit-swap").addEventListener("click", () => {
    const oldFrom = fromSelect.value;
    fromSelect.value = toSelect.value;
    toSelect.value = oldFrom;
    convert();
  });

  document.getElementById("unit-clear").addEventListener("click", () => {
    valueInput.value = "";
    convert();
    valueInput.focus();
  });

  copyButton.addEventListener("click", async () => {
    if (!resultText) return;
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
      status.textContent = "Clipboard access is unavailable in this browser. Select the result to copy it.";
      status.classList.add("is-error");
      return;
    }
    try {
      await navigator.clipboard.writeText(resultText);
      status.textContent = "Result copied to clipboard.";
      status.classList.remove("is-error");
    } catch (error) {
      status.textContent = "Could not copy the result. Check clipboard permissions.";
      status.classList.add("is-error");
    }
  });

  populateUnits();
})();
