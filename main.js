$(document).ready(async function () {
	const left = $("#left");
	site.view = $("#view");
	site.tooltip = $("#tooltip");

	let snapshot;
	try {
		snapshot = await $.getJSON("data/tournament.json?t=" + Date.now());
	} catch (error) {
		$("#loading").text("could not load stats");
		return;
	}

	site.model = buildModel(snapshot);
	$("#loading").css("display", "none");

	const floating = {
		"₊✩‧₊˚౨ৎ˚₊✩‧₊": "right:30px;top:20px;",
		"⸜(｡˃ ᵕ ˂ )⸝♡": "right:10px;top:270px;",
		"⋆｡‧˚ʚ♡ɞ˚‧｡⋆": "left:30px;top:120px;",
		"⋆˚𖥔 ݁ ˖𓂃.☘︎ ݁˖": "left:70px;top:400px;",
		"⊹₊ ˚‧︵‿₊୨୧₊‿︵‧ ˚ ₊⊹": "left:200px;bottom:100px;",
		"ᝰ.ᐟ✮⋆˙": "left:700px;bottom:160px;",
		"⋆.˚ ᡣ𐭩 .𖥔˚": "right:600px;bottom:200px;",
		"૮ . . ྀིა": "right:100px;bottom:60px;",
	};

	Object.keys(floating).forEach(function (text) {
		$("<span class='floating'>").text(text).attr("style", floating[text]).appendTo($("body"));
	});

	renderNav();
	route();
	$(window).on("hashchange", route);

	function renderNav() {
		left.empty();
		$("<span>").text(site.model.competitionName || "tournament").appendTo(left);
		addOption("players", "Players");
		addOption("teams", "Teams");
		addOption("leaderboards", "Leaderboards");
	}

	function addOption(hash, text) {
		const option = $("<div class='outlined option'>").text(text).appendTo(left);
		option.on("click", function () {
			location.hash = hash;
		});
		option.attr("data-hash", hash);
	}

	function route() {
		const hash = decodeURIComponent((location.hash || "#players").replace(/^#/, ""));
		const section = hash.indexOf("player/") === 0 ? "players" : hash.indexOf("team/") === 0 ? "teams" : hash.indexOf("leaderboards") === 0 ? "leaderboards" : hash;
		$("#left .option").removeClass("selected");
		$("#left .option").filter(function () {
			return $(this).attr("data-hash") === section;
		}).addClass("selected");

		site.view.empty();
		site.view.removeClass("split");
		site.view.scrollTop(0);
		if (hash === "leaderboards" || hash.indexOf("leaderboards/") === 0) {
			renderLeaderboards(hash);
			return;
		}
		if (hash === "teams") {
			renderTeams();
			return;
		}
		if (hash.indexOf("player/") === 0) {
			const player = site.model.playerById[hash.slice("player/".length)];
			if (player) {
				renderPlayer(player);
				return;
			}
		}
		if (hash.indexOf("team/") === 0) {
			const team = site.model.teamById[hash.slice("team/".length)];
			if (team) {
				renderTeam(team);
				return;
			}
		}
		renderPlayers();
	}
});
