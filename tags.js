function addTag (set, tag, addToList){
	if (addToList){
		let originalTags = pull(set.children[0].getAttribute("data-target")+"-tags");
		console.log(set.children[0].getAttribute("data-target"));
		if (originalTags == -1)
			originalTags = [];
		else
			originalTags = JSON.parse(originalTags);
		let newTags = originalTags;
		newTags = newTags.concat([tag]);
		push(set.children[0].getAttribute("data-target")+"-tags", JSON.stringify(newTags));
	}
	set.classList.add("set-tag-"+tag);
	let existTags = set.querySelector(".fa-tag").getAttribute("data-original-title");
	if (existTags == "Tags: ")
		existTags += tag;
	else
		existTags += ", "+tag;
	set.querySelector(".fa-tag").setAttribute("data-original-title", existTags);
	let tagsContainer = document.querySelector(".tags-container");
	let exist = false;
	for (let i = 0; i < tagsContainer.children.length; i++)
		if (tagsContainer.children[i].textContent.trim() == tag)
			exist = true;
	if (!exist){
		let span = document.createElement("span");
		span.className = "badge badge-tag";
		span.textContent = " "+tag+" ";
		span.setAttribute("onclick", "toggleSetTagSelected(this);");
		tagsContainer.appendChild(span);
		/*
		let originalAdditionalTags = pull("additional-tags");
		if (originalAdditionalTags == -1)
			originalAdditionalTags = [];
		else
			originalAdditionalTags = JSON.parse(originalAdditionalTags);
		let newAdditionalTags = originalAdditionalTags;
		newAdditionalTags = newAdditionalTags.concat([tag]);
		push("additional-tags", JSON.stringify(newAdditionalTags));
		 */
		let pinned = document.querySelector('table[data-target="#problem-set-pinned"]');
		if (pinned){
			pinned.parentNode.classList.add("set-tag-"+tag);
		}
	}
}

function removeTag (set, tag){
	let originalTags = pull(set.children[0].getAttribute("data-target")+"-tags");
	if (originalTags == -1)
		originalTags = [];
	else
		originalTags = JSON.parse(originalTags);
	let newTags = originalTags;
	newTags.splice(newTags.indexOf(tag), 1);
	console.log(newTags);
	console.log(newTags.indexOf(tag));
	push(set.children[0].getAttribute("data-target")+"-tags", JSON.stringify(newTags));
	set.classList.remove("set-tag-"+tag);
	console.log("REPALEC");
	console.log(tag);
	let existTags = set.querySelector(".fa-tag").getAttribute("data-original-title");
	existTags = existTags.replace(tag, '').replace(', , ', ', ');
	if (existTags.slice(-2) == ", ")
		existTags = existTags.substring(0, existTags.length-2);
	set.querySelector(".fa-tag").setAttribute("data-original-title", existTags);
	if (document.querySelectorAll(".set-tag-"+tag).length == 1){
		let pinned = document.querySelector('table[data-target="#problem-set-pinned"]');
		if (pinned){
			pinned.parentNode.classList.remove("set-tag-"+tag);
		}
		let tagsContainer = document.querySelector(".tags-container");
		for (let i = 0; i < tagsContainer.children.length; i++)
			if (tagsContainer.children[i].textContent.trim() == tag)
				tagsContainer.children[i].remove();
		/*
		let tagList = JSON.parse(pull("additional-tags"));
		tagList.splice(tagList.indexOf(tag), 1);
		push("additional-tags", JSON.stringify(tagList));
		 */
	}
}


function toggleTag (set, tag){
	if (tag.length == 0 || tag.includes(' '))
		return;
	let originalTags = pull(set.children[0].getAttribute("data-target")+"-tags");
	console.log(set.children[0].getAttribute("data-target"));
	if (originalTags == -1)
		originalTags = [];
	else
		originalTags = JSON.parse(originalTags);
	if (originalTags.includes(tag))
		removeTag(set, tag);
	else
		addTag(set, tag, true);
}

function initTags(){
	/*
	let tagList = pull("additional-tags");
	if (tagList == -1)
		tagList = [];
	else
		tagList = JSON.parse(tagList);
	let tagsContainer = document.querySelector(".tags-container").children;
	for (let i = 0; i < tagList.length; i++){
		let tag = tagList[i];
		let span = document.createElement("span");
		span.className = "badge badge-tag";
		span.textContent = " "+tag+" ";
		span.setAttribute("onclick", "toggleSetTagSelected(this);");
		tagsContainer.appendChild(span);
	}
	 */// wait bruh all this is unnecessary
	let setContainer = document.querySelector(".row");
	for (let i = 0; i < setContainer.children.length; i++){
		let set = setContainer.children[i];
		let tags = pull(set.children[0].getAttribute("data-target")+"-tags");
		if (tags == -1)
			continue;
		tags = JSON.parse(tags);
		for (let j = 0; j < tags.length; j++)
			addTag(set, tags[j], false);
	}
}


document.querySelectorAll(".fa-tag").forEach(tagIcon => {
	tagIcon.addEventListener("click", function(e) {
		e.stopPropagation();
		let oldInput = document.getElementById("tag-input");
		if (oldInput) oldInput.remove();
		let input = document.createElement("input");
		input.type = "text";
		input.id = "tag-input";
		input.placeholder = "Enter tag";
		input.style.position = "absolute";
		const rect = e.target.getBoundingClientRect();
		input.style.top = (rect.top - 48 + window.scrollY) + "px";
		input.style.left = (rect.left - 110 + window.scrollX) + "px";
		input.style.zIndex = 1000;
		input.style.padding = "5px";
		input.style.border = "1px solid #ccc";
		input.style.borderRadius = "5px";
		document.body.appendChild(input);
		input.focus();
		input.addEventListener("keydown", function(event) {
			if (event.key === "Enter") {
				const newTag = input.value.trim();
				if (newTag) {
					toggleTag(e.target.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode, newTag);
				}
				input.remove();
			}
		});
		function handleOutsideClick(event) {
			if (event.target !== input && event.target !== tagIcon) {
				input.remove();
				document.removeEventListener("click", handleOutsideClick);
			}
		}
		setTimeout(() => {
			document.addEventListener("click", handleOutsideClick);
		}, 0);
	});
});



if (window.location.href.includes("personal"))
	initTags();
