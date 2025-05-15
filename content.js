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

// reads hof count from hof url
async function get_hof_count(url) {
    console.log("SCRAPING");
    console.log("IF YOUR SEEING THIS MORE THAN ONCE BE SCARED BECAUSE ANGUS WILL BE VERY ANGRY THIS IS AN OFFICIAL WARNING");
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

async function run() {
    console.log("orac++");

    // not on home page, scrape if hof page
    if (window.location.href !== "https://orac2.info/hub/personal/") {
        let url_parts = window.location.href.split("/");
        // check is hof page
        if (url_parts[0] === "https:" && url_parts[2] === "orac2.info" && url_parts[url_parts.length - 1] === "hof") {
            let b_elements = document.getElementsByTagName("b");
            if (b_elements.length) {
                let hof_count = parseInt(b_elements[0].textContent);
                let problem_id = window.location.href.substr(18, window.location.href.length - 21);
                let problem = await readLocalStorage(problem_id);
                if (problem !== null) {
                    problem.hof_count = hof_count;
                    writeLocalStorage(problem_id, problem);
                    console.log(`read hof count of ${problem_id}: ${hof_count}`);
                }
            } else {
                let problem_id = window.location.href.substr(18, window.location.href.length - 21);
                let problem = await readLocalStorage(problem_id);
                if (problem != null) {
                    let ranks = document.querySelectorAll('[title="Rank"]');
                    if (ranks.length && document.querySelector('[title="Score"]').textContent == '100') {
                        problem.hof_count = 0;
                        for (let ind = 0; ind < ranks.length; ind++)
                            if (ranks[ind].textContent == '1')
                                problem.hof_count++;
                        writeLocalStorage(problem_id, problem);
                        console.log(`read hof count of ${problem_id}: ${problem.hof_count}`);
                    }
                }
            }
        }
        // scrape hof on statement page?? idrk how to implement this tho
        return;
    }

    // read settings from local storage
    let settings = await readLocalStorage("settings").then(s => s || {
        "adjust-title": false,
        "solve-count": false,
        "hof-counters": false,
        "hof-counter-colours": false,
        "pinned-problems": false,
        "tags-and-buttons": false
    });

    // collect all the data we need
    let problems = {};
    // all the problem divs...
    let problem_divs = [];
    for (let problem_set_div of document.querySelectorAll(".set-problems")) {
        problem_divs.push(...problem_set_div.children[0].children[0].children);
    }
    function update_problem_divs() {
        problem_divs = [];
        for (let problem_set_div of document.querySelectorAll(".set-problems")) {
            problem_divs.push(...problem_set_div.children[0].children[0].children);
        }
    }

    // for all the problems,
    await Promise.all(problem_divs.map(async (problem_div) => {
        // get basic info ab the problem
        let problem_url = problem_div.children[0].children[0].href;
        let problem_id = problem_url.substr(18);
        
        let problem = {
            div: problem_div,
            url: problem_url,
            id: problem_id,
            pinned: false,
            hof_count: 0,
            solved: problem_div.classList.contains("solved-problem")
        };

        // pinned? hof? from local storage
        let problem_save = await readLocalStorage(problem.id);
        if (problem_save !== null) {
            problem.pinned = problem_save.pinned;
            problem.hof_count = problem_save.hof_count || 0;
        }

        // add to problems 
        problems[problem.id] = problem;
        writeLocalStorage(problem.id, problem);
    }));

    // adjust title
    let all_sets_title = document.querySelector("h1");
    if (settings["adjust-title"]) {
        // restyle the "All Sets" title
        console.log("adjust-title");
        all_sets_title.style.cssText = `
            text-align: left;
            margin-top: 50px;
            margin-bottom: 20px;
        `;
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

        // remove all unwanted hof counters
        document.querySelectorAll(".hof-count-badge").forEach(el => el.remove());

        // for every problem div,
        await Promise.all(problem_divs.map(async (problem_div) => {
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
        }));
    }

    // pinned problems
    if (settings["pinned-problems"]) {
        // create a set of pinned problems at the top of the sets page
        console.log("pinned-problems");

        // create the pinned set
        async function create_pinned_set() {
            // remove old pinned sets
            document.querySelectorAll(".pinned-set").forEach(el => el.remove());

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
        async function create_tacks() {
            // remove all old tacks
            document.querySelectorAll(".tack").forEach(el => el.remove());

            await Promise.all(problem_divs.map(async (problem_div) => {
                // problem info
                let problem_url = problem_div.children[0].children[0].href;
                let problem_id = problem_url.substr(18);

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
                tack.onclick = async function() {
                    problems[problem_id].pinned = !problems[problem_id].pinned;
                    tack.style.color = (problems[problem_id].pinned) ? "#343a40" : "#999999";
                    writeLocalStorage(problem_id, problems[problem_id]);
                    await create_pinned_set();
                    update_problem_divs();
                    await create_tacks();
                }
            }));
        }
        // actually do it
        await create_pinned_set();
        update_problem_divs();
        await create_tacks();
    }

    // tags and buttons
    if (settings["tags-and-buttons"]) {
        // score button -> submissions and multiselect tags
        console.log("tags-and-buttons");

        await Promise.all(problem_divs.map(async (problem_div) => {
            let problem_url = problem_div.children[0].children[0].href;
            // make score badge link to submission
            let score_badge = problem_div.children[1].children[0];
            if (score_badge && score_badge.classList.contains("hub-badge")) {
                let submission_redirect = document.createElement("a");
                submission_redirect.href = problem_url + "submissions";
                score_badge.parentNode.insertBefore(submission_redirect, score_badge);
                submission_redirect.appendChild(score_badge);
            }
        }));

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
        // make start tag badge
        for (let unwanted of document.querySelectorAll(".badge-tag-starter")) unwanted.remove();
        let starter_tag_badge = document.createElement("span");
        starter_tag_badge.classList.add("badge", "badge-tag", "badge-tag-starter");
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
            }
        }
        display_selected_sets();
    }

    setTimeout(async function() {
        // scrape a single hof
        let hof_to_scrape = await readLocalStorage("hof-scrape-num");
        if (hof_to_scrape === null || hof_to_scrape >= Object.keys(problems).length) hof_to_scrape = 0;

        let problem_id = Object.keys(problems)[hof_to_scrape];
        problems[problem_id].hof_count = await get_hof_count(problems[problem_id].url + "hof");
        writeLocalStorage(problem_id, problems[problem_id]);
        console.log(`read hof count of ${problem_id}: ${problems[problem_id].hof_count}`);

        writeLocalStorage("hof-scrape-num", hof_to_scrape + 1);
    }, 750);
}

// run whenever the page is shown
window.addEventListener("pageshow", function() {run();});
