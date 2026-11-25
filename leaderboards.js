const boards = [
	{ id: "kda", label: "KDA", group: "Combat", key: "kda" },
	{ id: "kills", label: "Kills", group: "Combat", key: "kills" },
	{ id: "deaths", label: "(least) Deaths", group: "Combat", key: "deaths", asc: true },
	{ id: "penta_kills", label: "Pentakills", group: "Combat", key: "penta_kills" },
	{ id: "largest_killing_spree", label: "Largest killing spree", group: "Combat", key: "largest_killing_spree" },
	{ id: "skillshots_hit", label: "Skillshots hit", group: "Combat", key: "skillshots_hit" },
	{ id: "skillshots_dodged", label: "Skillshots dodged", group: "Combat", key: "skillshots_dodged" },
	{ id: "time_spent_dead", label: "(least) Time spent dead", group: "Combat", key: "time_spent_dead", asc: true },
	{ id: "damage_self_mitigated", label: "Damage mitigated", group: "Combat", key: "damage_self_mitigated" },

	{ id: "cs_per_minute", label: "CS per minute", group: "Farming", key: "cs_per_minute" },
	{ id: "creep_score", label: "Total CS", group: "Farming", key: "creep_score" },
	{ id: "turret_plates_taken", label: "Turret plates", group: "Farming", key: "turret_plates_taken" },

	{ id: "best_cs", label: "Highest CS in one game", group: "One Game", key: "creep_score", mode: "best" },
	{ id: "best_kills", label: "Most kills in one game", group: "One Game", key: "kills", mode: "best" },
	{ id: "best_vision", label: "Highest vision in one game", group: "One Game", key: "vision_score", mode: "best" },

	{ id: "win_rate", label: "Win rate", group: "Other", key: "win_rate" },
	{ id: "vision_per_minute", label: "Vision per minute", group: "Other", key: "vision_per_minute" },

	{ id: "champ_picks", label: "Most picked", group: "Champions", kind: "champion", stat: "picks" },
	{ id: "champ_bans", label: "Most banned", group: "Champions", kind: "champion", stat: "bans" },
	{ id: "champ_presence", label: "Highest presence", group: "Champions", kind: "champion", stat: "presence" },
	{ id: "champ_win_rate", label: "Highest win rate", group: "Champions", kind: "champion", stat: "winRate" },
	{ id: "champ_kda", label: "Highest KDA", group: "Champions", kind: "champion", stat: "kda" },
	{ id: "champ_kills", label: "Most kills", group: "Champions", kind: "champion", stat: "kills" },
	{ id: "champ_dpm", label: "Highest damage per minute", group: "Champions", kind: "champion", stat: "dpm" },
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
	if (board.kind === "champion") {
		renderChampionBoard(main, board);
		return;
	}
	ranked(board).forEach(function (row, index) {
		const line = $("<div class='rank-line'>").appendTo(main);
		if (index % 2 === 1) line.addClass("row-alt");
		const who = $("<span>").appendTo(line);
		const champion = board.mode === "best" ? row.champion : mostPlayed(row.player.games, "champion");
		if (champion) {
			const image = icon(champion, "champ");
			bindChampionTip(image, champion.name);
			who.append(image);
		}
		who.append(playerName(row.player.name));
		if (row.player.teamName) who.append(document.createTextNode("· " + row.player.teamName));
		$("<span>").text(formatStat("PLAYER", board.key, row.value)).appendTo(line);
		line.on("click", function () {
			location.hash = "player/" + row.player.id;
		});
	});
}

function renderChampionBoard(main, board) {
	const rows = championRows(board);
	if (!rows.length) {
		$("<span class='muted'>").text(board.stat === "bans" ? "No bans recorded." : "No champion games recorded.").appendTo(main);
		return;
	}
	rows.forEach(function (row, index) {
		const line = $("<div class='rank-line'>").appendTo(main);
		if (index % 2 === 1) line.addClass("row-alt");
		const who = $("<span>").appendTo(line);
		const image = icon(row.champion, "champ");
		bindChampionTip(image, row.champion.name);
		who.append(image);
		who.append(document.createTextNode(row.champion.name));
		$("<span>").text(formatChampionStat(board, row)).appendTo(line);
	});
}

function championRows(board) {
	return championStats().filter(function (row) {
		if (board.stat === "bans") return row.bans > 0;
		if (board.stat === "presence") return row.presence > 0;
		return row.picks > 0;
	}).sort(function (a, b) {
		const av = championValue(a, board);
		const bv = championValue(b, board);
		if (av === bv) {
			if (a.picks !== b.picks) return b.picks - a.picks;
			return a.champion.name.localeCompare(b.champion.name);
		}
		return bv - av;
	});
}

function championValue(row, board) {
	if (board.stat === "winRate") return row.winRate;
	if (board.stat === "kda") return row.kda;
	if (board.stat === "dpm") return row.dpm;
	if (board.stat === "presence") return row.presence;
	return row[board.stat] || 0;
}

function formatChampionStat(board, row) {
	if (board.stat === "winRate") return formatStat("PLAYER", "win_rate", row.winRate);
	if (board.stat === "kda") return formatStat("PLAYER", "kda", row.kda);
	if (board.stat === "dpm") return formatStat("PLAYER", "damage_per_minute", row.dpm);
	return String(championValue(row, board));
}

function championStats() {
	const champs = {};
	function ensure(champion) {
		if (!champion || !champion.name) return null;
		const key = champion.key || champion.name;
		if (!champs[key]) {
			champs[key] = {
				champion: champion,
				picks: 0,
				wins: 0,
				bans: 0,
				kills: 0,
				deaths: 0,
				assists: 0,
				damage: 0,
				minutes: 0,
			};
		}
		return champs[key];
	}
	site.model.players.forEach(function (player) {
		player.games.forEach(function (game) {
			const row = ensure(game.champion);
			if (!row) return;
			row.picks += 1;
			if (game.won) row.wins += 1;
			row.kills += game.stats.kills || 0;
			row.deaths += game.stats.deaths || 0;
			row.assists += game.stats.assists || 0;
			row.damage += game.stats.damage_to_champions || 0;
			row.minutes += (game.stats.time_played || 0) / 60000;
		});
	});
	site.model.teams.forEach(function (team) {
		team.games.forEach(function (game) {
			(game.bans || []).forEach(function (ban) {
				const row = ensure(ban);
				if (row) row.bans += 1;
			});
		});
	});
	return Object.keys(champs).map(function (key) {
		const row = champs[key];
		row.presence = row.picks + row.bans;
		row.winRate = row.picks ? row.wins / row.picks * 100 : 0;
		row.kda = row.deaths ? (row.kills + row.assists) / row.deaths : (row.kills + row.assists);
		row.dpm = row.minutes ? row.damage / row.minutes : 0;
		return row;
	});
}

function ranked(board) {
	return site.model.players.map(function (player) {
		const result = boardValue(player, board);
		if (board.mode === "best") return { player: player, value: result.value, champion: result.champion };
		return { player: player, value: result };
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
		let champion = null;
		player.games.forEach(function (game) {
			const value = game.stats[board.key];
			if (typeof value !== "number") return;
			if (best == null || value > best) {
				best = value;
				champion = game.champion;
			}
		});
		return { value: best == null ? 0 : best, champion: champion };
	}
	const totals = aggregate(player.games, "PLAYER");
	const value = totals[board.key];
	return value == null ? 0 : value;
}
