// if settings doesn't exist, initialise all to false
if (localStorage.getItem("settings") === null) {
    localStorage.setItem("settings", JSON.stringify({
        "adjust-title": false,
        "solve-count": false,
        "hof-counters": false,
        "hof-counter-colours": false,
        "pinned-problems": false,
        "tags-and-buttons": false
    }));
}

// read settings from local storage
settings = JSON.parse(localStorage.getItem("settings"));

// for each setting
for (let [setting_name, setting_value] of Object.entries(settings)) {
    // set ui state to setting state
    document.getElementById(setting_name).checked = setting_value;
    // toggle setting when button is clicked
    document.getElementById(setting_name).onclick = function() {
        settings[setting_name] = !settings[setting_name];
        document.getElementById(setting_name).checked = settings[setting_name];
        // save to storage
        localStorage.setItem("settings", JSON.stringify(settings));
    }
}

// extra solves <-> local storage
if (localStorage.getItem("extra-solves") === null) {
    localStorage.setItem("extra-solves", JSON.stringify({"val": 0}));
}
let extra_solves_input = document.getElementById("extra-solves");
extra_solves_input.value = parseInt(JSON.parse(localStorage.getItem("extra-solves"))["val"]);
extra_solves_input.onclick = function() {
    localStorage.setItem("extra-solves", JSON.stringify({"val": extra_solves_input.value}));
}
extra_solves_input.onkeyup = function() {
    localStorage.setItem("extra-solves", JSON.stringify({"val": extra_solves_input.value}));
}

document.getElementById("reset-button").onclick = function() {
    // reset all settings to false
    localStorage.setItem("settings", JSON.stringify({
        "adjust-title": false,
        "solve-count": false,
        "hof-counters": false,
        "hof-counter-colours": false,
        "pinned-problems": false,
        "tags-and-buttons": false
    }));
    settings = JSON.parse(localStorage.getItem("settings"));

    // for each setting
    for (let [setting_name, setting_value] of Object.entries(settings)) {
        // set ui state to setting state
        document.getElementById(setting_name).checked = setting_value;
    }
    // reset extra solve to 0
    localStorage.setItem("extra-solves", JSON.stringify({"val": 0}));
    document.getElementById("extra-solves").value = 0;
    // reset selected tags to none
    localStorage.setItem("selected-tags", null);
}