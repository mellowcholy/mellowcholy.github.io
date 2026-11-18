const boards = [
	{ id: "kda", label: "KDA", group: "Major", key: "kda" },
	{ id: "cs_per_minute", label: "CS per minute", group: "Major", key: "cs_per_minute" },
	{ id: "creep_score", label: "Total CS", group: "Major", key: "creep_score" },
	{ id: "kills", label: "Kills", group: "Major", key: "kills" },
	{ id: "win_rate", label: "Win rate", group: "Major", key: "win_rate" },
	{ id: "vision_per_minute", label: "Vision per minute", group: "Major", key: "vision_per_minute" },
	{ id: "deaths", label: "Deaths", group: "Fun", key: "deaths", asc: true },
	{ id: "penta_kills", label: "Penta kills", group: "Fun", key: "penta_kills" },
	{ id: "first_blood_kills", label: "First bloods", group: "Fun", key: "first_blood_kills" },
	{ id: "largest_killing_spree", label: "Largest killing spree", group: "Fun", key: "largest_killing_spree" },
	{ id: "skillshots_hit", label: "Skillshots hit", group: "Fun", key: "skillshots_hit" },
	{ id: "skillshots_dodged", label: "Skillshots dodged", group: "Fun", key: "skillshots_dodged" },
	{ id: "turret_plates_taken", label: "Turret plates", group: "Fun", key: "turret_plates_taken" },
	{ id: "time_spent_dead", label: "Time spent dead", group: "Fun", key: "time_spent_dead", asc: true },
	{ id: "damage_self_mitigated", label: "Damage mitigated", group: "Fun", key: "damage_self_mitigated" },
	{ id: "best_cs", label: "Highest CS in one game", group: "Fun", key: "creep_score", mode: "best" },
	{ id: "best_kills", label: "Most kills in one game", group: "Fun", key: "kills", mode: "best" },
	{ id: "best_vision", label: "Highest vision in one game", group: "Fun", key: "vision_score", mode: "best" },
];

function renderLeaderboards(hash) {
	const view = site.view;
	const picked = hash.indexOf("leaderboards/") === 0 ? hash.slice("leaderboards/".length) : "kda";
	const board = boards.filter(function (item) { return item.id === picked; })[0] || boards[0];
	view.addClass("split");
	const boardEl = $("<div id='board'>").appendTo(view);
	const nav = $("<div id='board-nav'>").appendTo(boardEl);
	const main = $("<div id='board-main'>").appendTo(boardEl);
	let group = "";
	boards.forEach(function (item) {
		if (item.group !== group) {
			group = item.group;
			$("<span class='section-label'>").text(group).appendTo(nav);
		}
		const option = $("<div class='outlined option'>").text(item.label).appendTo(nav);
		option.attr("data-hash", "leaderboards/" + item.id);
		if (item.id === board.id) option.addClass("selected");
		option.on("click", function () {
			location.hash = "leaderboards/" + item.id;
		});
	});

	$("<span class='section-label'>").text(board.label).appendTo(main);
	ranked(board).forEach(function (row) {
		const line = $("<div class='rank-line'>").appendTo(main);
		const who = $("<span>").appendTo(line);
		const champion = mostPlayed(row.player.games, "champion");
		if (champion) {
			const image = icon(champion, "champ");
			bindChampionTip(image, champion.name);
			who.append(image);
		}
		who.append(document.createTextNode(row.player.name + (row.player.teamName ? " · " + row.player.teamName : "")));
		$("<span>").text(formatStat("PLAYER", board.key, row.value)).appendTo(line);
		line.on("click", function () {
			location.hash = "player/" + row.player.id;
		});
	});
}

function ranked(board) {
	return site.model.players.map(function (player) {
		return { player: player, value: boardValue(player, board) };
	}).sort(function (a, b) {
		const av = a.value == null ? (board.asc ? Infinity : -Infinity) : a.value;
		const bv = b.value == null ? (board.asc ? Infinity : -Infinity) : b.value;
		if (av === bv) return a.player.name.localeCompare(b.player.name);
		return board.asc ? av - bv : bv - av;
	});
}

function boardValue(player, board) {
	if (board.mode === "best") {
		let best = null;
		player.games.forEach(function (game) {
			const value = game.stats[board.key];
			if (typeof value !== "number") return;
			if (best == null || value > best) best = value;
		});
		return best == null ? 0 : best;
	}
	const totals = aggregate(player.games, "PLAYER");
	const value = totals[board.key];
	return value == null ? 0 : value;
}
