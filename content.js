// read from local storage
async function readLocalStorage(key) {
    let prom = new Promise((resolve) => {
        chrome.runtime.sendMessage({type: 'getLS', key: key}, function(response) {
            resolve(JSON.parse(response.value));
        });
    })
    return await prom;
}
// write to local storage
async function writeLocalStorage(key, value) {
    let prom = new Promise((resolve) => {
        chrome.runtime.sendMessage({type: 'setLS', key: key, value: JSON.stringify(value)}, function(response) {
            resolve(response.success);
        });
    });
    return await prom;
}

async function run() {
    console.log("orac++");

    // read settings from local storage
    settings = await readLocalStorage("settings");
    // if popup hasn't been opened yet, i.e. there are no settings, do nothing
    if (settings === null) {
        settings = {
            "adjust-title": false,
            "solve-count": false,
            "hof-counters": false,
            "hof-counter-colours": false,
            "pinned-problems": false
        };
    }

    // hof reading/scraping
    let url_parts = window.location.href.split("/");
    // reads hof count from hof url
    async function get_hof_count(url) {
        console.log("SCRAPING IF YOUR SEEING THIS MORE THAN ONCE BE SCARED BECAUSE ANGUS WILL BE VERY ANGRY THIS IS AN OFFICIAL WARNING");
        return await fetch(url)
            .then(response => response.text())
            .then(html => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const bold_elements = doc.querySelectorAll('b, strong');
                for (let el of bold_elements) {
                    const match = el.textContent.match(/\d+/);
                    if (match) return match[0];
                }
                return null;
            })
            .catch(error => {return null;});
    }
    // hof page, read
    if (url_parts[0] === "https:" && url_parts[2] === "orac2.info" && url_parts[url_parts.length - 1] === "hof") {
        let hof_count = parseInt(document.getElementsByTagName("b")[0].textContent);
        let problem_id = window.location.href.substr(18, window.location.href.length - 21);
        let problem = readLocalStorage(problem_id);
        if (problem !== null) {
            problem.hof_count = hof_count;
            writeLocalStorage(problem_id, problem);
            console.log(`read hof count of ${problem_id}: ${hof_count}`);
        }
    }
    // statement page, scrape
    // idrk how to implement this tbh

    // if on the orac homepage!!!!
    if (window.location.href === "https://orac2.info/hub/personal/") {
        // collect all the data we need
        let problems = {};
        // read the next hof to scrape from local storage
        let last_hof = await readLocalStorage("hof-scrape-id");
        if (last_hof === null) last_hof = "/problem/332/";
        let scrape_next_hof = false;
        let scraped_a_hof = false;
        // loop through all problem sets, problems
        for (let problem_set_div of document.querySelectorAll(".set-problems")) {
            for (let problem_div of problem_set_div.children[0].children[0].children) {
                // get basic info about the problem
                let problem = {};
                problem.div = problem_div;
                problem.url = problem_div.children[0].children[0].href;
                problem.id = problem.url.substr(18);
                problem.pinned = false;
                problem.hof_count = 0;
                problem.solved = problem_div.classList.contains("solved-problem");
                // pinned? hof? from local storage
                let problem_save = await readLocalStorage(problem.id);
                if (problem_save !== null) {
                    problem.pinned = problem_save.pinned;
                    problem.hof_count = problem_save.hof_count;
                }
                // scrape hof if should scrape
                if (scrape_next_hof) {
                    problem.hof_count = await get_hof_count(problem.url + "hof");
                    writeLocalStorage(problem.id, problem);
                    writeLocalStorage("hof-scrape-id", problem.id);
                    scrape_next_hof = false;
                    scraped_a_hof = true;
                    console.log(`read hof count of ${problem.id}: ${problem.hof_count}`);
                }
                if (last_hof === problem.id && !scraped_a_hof) scrape_next_hof = true;
                // add to problems 
                problems[problem.id] = problem;
            }
        }
        // if just scraped last hof, reset to addition
        if (scrape_next_hof || !scraped_a_hof) writeLocalStorage("hof-scrape-id", null);
        // lmao this will never scrape addition but i cbs soo deal with it

        // adjust title
        let all_sets_title = document.querySelector("h1");
        if (settings["adjust-title"]) {
            // restyle the "All Sets" title
            console.log("adjust-title");
            all_sets_title.style.textAlign = "left";
            all_sets_title.style.marginTop = "50px";
            all_sets_title.style.marginBottom = "20px";
        }

        // solve count
        if (settings["solve-count"]) {
            // display the number of solved problems and number of problems user has access to
            console.log("solves-count");
            let problem_count = 0;
            let solve_count = 0;
            for (let [problem_id, problem] of Object.entries(problems)) {
                problem_count += 1;
                if (problem.solved) solve_count += 1;
            }
            // extra solves?
            let extra_solves = await readLocalStorage("extra-solves");
            if (extra_solves !== null) {
                problem_count += parseInt(extra_solves["val"]);
                solve_count += parseInt(extra_solves["val"]);
            }
            // show no problems solved instead of whatever useless text was there before
            all_sets_title.nextElementSibling.innerHTML = `
                You have solved <span class="badge badge-cmsyellow">${solve_count} / ${problem_count}</span> problems!
            `;
            // if you've solved all problems, make it green!!!
            if (solve_count == problem_count) {
                all_sets_title.nextElementSibling.querySelector(".badge").classList.remove("badge-cmsyellow");
                all_sets_title.nextElementSibling.querySelector(".badge").classList.add("badge-cmsgreen");
            }
        }

        // hof counters
        if (settings["hof-counters"]) {
            // show the number of solves in the hall of fame for each problem
            console.log("hof-counters");
            if (settings["hof-counter-colours"]) console.log("hof-counter-colours");
            // loops through problem sets, problems
            for (let problem_set_div of document.querySelectorAll(".set-problems")) {
                for (let problem_div of problem_set_div.children[0].children[0].children) {
                    // delete pre-existing hof counters
                    for (let unwanted of problem_div.querySelectorAll(".hof-count-badge")) {
                        unwanted.remove();
                    }
                    let problem_url = problem_div.children[0].children[0].href;
                    let problem_id = problem_url.substr(18);
                    // create the hof counter
                    let hof_counter = document.createElement("a");
                    hof_counter.href = problem_url + "hof";
                    hof_counter.classList.add("hof-count-badge");
                    hof_counter.innerHTML = `<span class="badge badge-na hub-badge" size="30"></span>`
                    hof_counter.children[0].textContent = problems[problem_id].hof_count;
                    hof_counter.children[0].style = "color: black; text-decoration: none;";
                    // add colour?
                    if (settings["hof-counter-colours"]) {
                        let colour_val = Math.min(problems[problem_id].hof_count / 5, 150);
                        hof_counter.children[0].style.backgroundColor = 
                            "rgb(" + (255 - colour_val).toString() + "," 
                            + (255 - colour_val * 0.8).toString() + "," 
                            + (255 - colour_val * 0.5).toString() + ")";
                    }
                    // insert the counter
                    hof_counter.style = "margin-left: 6px; margin-right: 7px";
                    if (problem_div.getElementsByTagName("time")[0] == null) {
                        hof_counter.style = "margin-left: 3px";
                        if (problem_div.querySelector(".hub-badge") === null) hof_counter.style = "margin-left: 23px";
                        problem_div.children[1].appendChild(hof_counter);
                    } else {
                        problem_div.getElementsByTagName("time")[0].parentElement.insertBefore(hof_counter, problem_div.getElementsByTagName("time")[0]);
                    }
                }
            }
        }

        // pinned problems
        if (settings["pinned-problems"]) {
            // create a set of pinned problems at the top of the sets page
            console.log("pinned-problems");
            // create the pinned set
            function create_pinned_set() {
                for (let unwanted of document.querySelectorAll(".pinned-set")) unwanted.remove();
                let pinned_set = document.createElement("div");
                pinned_set.classList.add("problemset-display", "set-table", "pinned-set");
                for (let tag of document.querySelectorAll(".badge-tag")) pinned_set.classList.add("set-tag-" + (tag.textContent.trim()));
                pinned_set.innerHTML = `
                    <table class="table table-sm mt-0 mb-0 pointer" data-toggle="collapse" data-target="#problem-set-pinned" title="Click to collapse/expand">
                        <thead class="thead-dark">
                            <tr>
                                <th scope="col">
                                    <span class="set-title mr-auto">Pinned Problems</span>
                                </th>
                                <th scope="col" class="progress-column">
                                    <div class="d-flex align-items-center">
                                        <span class="fas fa-lg fa-tag" data-toggle="tooltip" data-placement="top" title="" data-original-title="Tags: training" style="margin-right: 5px; color: transparent;"></span>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                    </table>
                    <div id="problem-set-pinned" class = "collapse show set-problems">
                        <table class="table table-sm mt-0 mb-0">
                            <tbody>
                            </tbody>
                        </table>
                    </div>
                `;
                document.querySelector(".container").children[0].insertBefore(pinned_set, document.querySelector(".container").children[0].children[0]);
                // add pinned problems to the set
                for (let [problem_id, problem] of Object.entries(problems)) {
                    if (problem.pinned) {
                        let problem_clone = problem.div.cloneNode(true);
                        pinned_set.children[1].children[0].children[0].appendChild(problem_clone);
                    }
                }
                // hide set if empty
                if (pinned_set.children[1].children[0].children[0].children.length === 0) {
                    pinned_set.style.display = "none";
                }
            }
            // create tacks to pin and unpin problems
            function create_tacks() {
                for (let problem_set_div of document.querySelectorAll(".set-problems")) {
                    for (let problem_div of problem_set_div.children[0].children[0].children) {
                        let problem_url = problem_div.children[0].children[0].href;
                        let problem_id = problem_url.substr(18);
                        for (let unwanted of problem_div.querySelectorAll(".tack")) unwanted.remove();
                        // make a tack element
                        let tack = document.createElement("button");
                        tack.classList.add("fas", "fa-lg", "fa-thumbtack", "ml-auto", "tack");
                        tack.style = `
                            background: transparent; 
                            font-size: large; 
                            border-color: transparent; 
                            outline: none;
                            position: absolute;
                            top: 9px;
                            right: 5px;
                            color: ${problems[problem_id].pinned ? "#343a40" : "#999999"};
                        `;
                        // add tack to problem div
                        problem_div.appendChild(tack);
                        tack.parentElement.style.position = "relative";
                        // toggle pinned when tack is clicked
                        tack.onclick = function() {
                            problems[problem_id].pinned = !problems[problem_id].pinned;
                            tack.style.color = (problems[problem_id].pinned) ? "#343a40" : "#999999";
                            writeLocalStorage(problem_id, problems[problem_id]);
                            create_pinned_set();
                            create_tacks();
                        }
                    }
                }
            }
            // actually do it
            create_pinned_set();
            create_tacks();
        }

        // tags and buttons
        if (settings["tags-and-buttons"]) {
            // score button -> submissions and multiselect tags
            console.log("tags-and-buttons");
            // loops through problem sets, problems
            for (let problem_set_div of document.querySelectorAll(".set-problems")) {
                for (let problem_div of problem_set_div.children[0].children[0].children) {
                    let problem_url = problem_div.children[0].children[0].href;
                    // make score badge link to submission
                    let score_badge = problem_div.children[1].children[0];
                    if (!score_badge.classList.contains("hub-badge")) continue;
                    let submission_redirect = document.createElement("a");
                    submission_redirect.href = problem_url + "submissions";
                    score_badge.parentNode.insertBefore(submission_redirect, score_badge);
                    submission_redirect.appendChild(score_badge);
                }
            }
            // multi tag select
            let selected_tags = await readLocalStorage("selected-tags"); // get from local storage
            if (selected_tags === null) selected_tags = {};
            // add a starter tag for first 8 sets
            let cnt = 0;
            for (let problem_set_div of document.querySelectorAll(".problemset-display")) {
                problem_set_div.classList.add("set-tag-starter");
                cnt += 1;
                if (cnt == 8) break;
            }
            let starter_tag_badge = document.createElement("span");
            starter_tag_badge.classList.add("badge", "badge-tag");
            starter_tag_badge.textContent = "starter";
            document.querySelector(".badge-tag").parentElement.insertBefore(starter_tag_badge, document.querySelector(".badge-tag"));
            // hide all the sets whose tags aren't selected
            function display_selected_sets() {
                for (let problem_set_div of document.querySelectorAll(".problemset-display")) {
                    problem_set_div.hidden = true;
                    for (let tag_class of problem_set_div.classList) {
                        let set_tag = tag_class.slice(0, 8);
                        let tag = tag_class.slice(8);
                        if (set_tag === "set-tag-") {
                            if (selected_tags[tag]) problem_set_div.hidden = false;
                        }
                    }
                }
            }
            // loop through the tag buttons
            for (let tag_badge of document.querySelectorAll(".badge-tag")) {
                console.log(tag_badge);
                if (selected_tags[tag_badge.outerText] || selected_tags[tag_badge.outerText] === undefined) {
                    selected_tags[tag_badge.outerText] = true;
                    tag_badge.classList.add("selected-tag");
                    // save to local storage
                    writeLocalStorage("selected-tags", selected_tags);
                } else {
                    tag_badge.classList.remove("selected-tag");
                }
                tag_badge.onclick = function() {
                    selected_tags[tag_badge.outerText] = !selected_tags[tag_badge.outerText];
                    if (selected_tags[tag_badge.outerText]) tag_badge.classList.add("selected-tag");
                    else tag_badge.classList.remove("selected-tag");
                    display_selected_sets();
                    // save to local storage
                    writeLocalStorage("selected-tags", selected_tags);
                    console.log(selected_tags);
                }
            }
            display_selected_sets();
        }
    }
}

// run whenever the page is shown
window.addEventListener("pageshow", function() {run();});