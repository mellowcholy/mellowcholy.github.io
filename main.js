$(document).ready(async function () {
	const left = $("#left");
	const view = $("#view");
	const tooltip = $("#tooltip");

	let snapshot;
	try {
		snapshot = await $.getJSON("data/tournament.json?t=" + Date.now());
	} catch (error) {
		$("#loading").text("could not load stats");
		return;
	}

	const model = buildModel(snapshot);

	$("#loading").css("display", "none");
	renderNav();
	route();
	$(window).on("hashchange", route);

	function renderNav() {
		left.empty();
		$("<span>").text(model.competitionName || "tournament").appendTo(left);

		addOption("players", "Players");
		addOption("teams", "Teams");
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
		const section = hash.indexOf("player/") === 0 ? "players" : hash.indexOf("team/") === 0 ? "teams" : hash;
		$(".option").removeClass("selected");
		$(".option").filter(function () {
			return $(this).attr("data-hash") === section;
		}).addClass("selected");

		view.empty();
		view.scrollTop(0);
		const selected = $(".option.selected");
		if (selected.length) {
			const row = selected.get(0);
			const pane = left.get(0);
			if (row.offsetTop < pane.scrollTop || row.offsetTop > pane.scrollTop + pane.clientHeight - 40) {
				pane.scrollTop = Math.max(0, row.offsetTop - 80);
			}
		}
		if (hash === "teams") {
			renderTeams();
			return;
		}
		if (hash.indexOf("player/") === 0) {
			const player = model.playerById[hash.slice("player/".length)];
			if (player) {
				renderPlayer(player);
				return;
			}
		}
		if (hash.indexOf("team/") === 0) {
			const team = model.teamById[hash.slice("team/".length)];
			if (team) {
				renderTeam(team);
				return;
			}
		}
		renderPlayers();
	}

	function renderPlayers() {
		view.empty();
		$("<span class='section-label'>").text("Players - Click on a player to view more stats").appendTo(view);
		model.players.forEach(function (player) {
			const line = $("<div class='roster-line'>").appendTo(view);
			const champion = mostPlayed(player.games, "champion");
			if (champion) {
				const image = icon(champion, "champ");
				bindChampionTip(image, champion.name);
				line.append(image);
			}
			$("<span>").text(player.name + (player.teamName ? " · " + player.teamName : "")).appendTo(line);
			line.on("click", function () {
				location.hash = "player/" + player.id;
			});
		});
	}

	function renderPlayer(player) {
		const totals = aggregate(player.games, "PLAYER");
		$("<span class='section-label'>").text(player.name).appendTo(view);
		const who = $("<div class='who'>").appendTo(view);
		if (player.teamId) {
			$("<div class='roster-line'>").text(player.teamName).appendTo(who).on("click", function () {
				location.hash = "team/" + player.teamId;
			});
		}
		$("<span class='muted'>").text(
			player.games.length + " games · series " + player.seriesWins + "-" + player.seriesLosses
			+ " · stats are played games only"
		).appendTo(who);

		const champions = $("<div class='champ-row'>").appendTo(view);
		countBy(player.games, "champion").forEach(function (entry) {
			const image = icon(entry.item, "champ");
			image.on("mouseenter", function () {
				showTip(entry.item.name + " × " + entry.count);
			});
			image.on("mouseleave", hideTip);
			champions.append(image);
		});

		const headline = $("<div class='headline'>").appendTo(view);
		headlineStat(headline, "KDA", formatStat("PLAYER", "kda", totals.kda));
		headlineStat(headline, "CS/m", formatStat("PLAYER", "cs_per_minute", totals.cs_per_minute));
		headlineStat(headline, "KP", formatStat("PLAYER", "kill_participation", totals.kill_participation));
		headlineStat(headline, "DMG/m", formatStat("PLAYER", "damage_per_minute", totals.damage_per_minute));
		headlineStat(headline, "VS/m", formatStat("PLAYER", "vision_per_minute", totals.vision_per_minute));
		headlineStat(headline, "Win rate", formatStat("PLAYER", "win_rate", totals.win_rate));

		$("<span class='section-label'>").text("Season").appendTo(view);
		renderStatGroups("PLAYER", totals);

		$("<span class='section-label'>").text("Games").appendTo(view);
		if (!player.games.length) {
			$("<span class='muted'>").text("No played games.").appendTo(view);
			return;
		}
		player.games.forEach(function (game) {
			const block = $("<div class='game'>").appendTo(view);
			$("<div>").text(gameTitle(game)).appendTo(block);
			const row = $("<div class='champ-row'>").appendTo(block);
			if (game.champion) {
				const image = icon(game.champion, "champ");
				bindChampionTip(image, game.champion.name);
				row.append(image);
			}
			$("<span>").text(
				(game.champion ? game.champion.name : "Unknown")
				+ (game.position ? " · " + game.position.name : "")
			).appendTo(row);
			if (game.items.length) {
				const items = $("<div class='champ-row'>").appendTo(block);
				game.items.forEach(function (item) {
					const image = icon(item, "champ item");
					bindChampionTip(image, item.name);
					items.append(image);
				});
			}
			renderStatGroups("PLAYER", game.stats, block);
		});
	}

	function renderTeams() {
		view.empty();
		$("<span class='section-label'>").text("Teams - Click on a team to view more stats").appendTo(view);
		model.teams.forEach(function (team) {
			const line = $("<div class='roster-line'>").appendTo(view);
			if (team.logoUrl) {
				line.append(icon({ imageUrl: team.logoUrl, name: team.name }, "champ"));
			}
			$("<span>").text(team.name).appendTo(line);
			line.on("click", function () {
				location.hash = "team/" + team.id;
			});
		});
	}

	function renderTeam(team) {
		const totals = aggregate(team.games, "TEAM");
		const heading = $("<div class='champ-row'>").appendTo(view);
		if (team.logoUrl) {
			heading.append(icon({ imageUrl: team.logoUrl, name: team.name }, "champ"));
		}
		$("<span class='section-label'>").text(team.name).appendTo(heading);
		const skipped = team.matches.some(function (match) {
			return match.outcome === "FORFEIT";
		});
		$("<span class='muted'>").text(
			"Series " + team.seriesWins + "-" + team.seriesLosses
			+ " · " + team.games.length + " games"
			+ (skipped ? " · forfeit series are counted, played stats are not" : "")
		).appendTo(view);

		$("<span class='section-label'>").text("Matches").appendTo(view);
		team.matches.forEach(function (match) {
			const side = match.side;
			const other = match.opponent;
			const line = $("<div class='match-line'>").appendTo(view);
			$("<div>").text(
				(match.stageName || "Match")
				+ " · vs " + (other ? other.name : "TBD")
				+ " · " + (side.score == null ? "" : side.score + "-" + (other && other.score != null ? other.score : "?"))
				+ " · " + seriesLabel(side, match.outcome)
				+ (match.playedAt ? " · " + formatWhen(match.playedAt) : "")
			).appendTo(line);
		});

		$("<span class='section-label'>").text("Roster").appendTo(view);
		if (!team.roster.length) {
			$("<span class='muted'>").text("No players have a completed game for this team.").appendTo(view);
		}
		team.roster.forEach(function (player) {
			const line = $("<div class='roster-line'>").appendTo(view);
			const champion = mostPlayed(player.games.filter(function (game) {
				return game.teamId === team.id;
			}), "champion");
			if (champion) {
				const image = icon(champion, "champ");
				bindChampionTip(image, champion.name);
				line.append(image);
			}
			const playedHere = player.games.filter(function (game) {
				return game.teamId === team.id;
			}).length;
			$("<span>").text(player.name + " · " + (player.roleName || "flex") + " · " + playedHere + " games").appendTo(line);
			line.on("click", function () {
				location.hash = "player/" + player.id;
			});
		});

		$("<span class='section-label'>").text("Season").appendTo(view);
		if (!team.games.length) {
			$("<span class='muted'>").text("No played games, so there are no stat totals.").appendTo(view);
			return;
		}
		renderStatGroups("TEAM", totals);

		$("<span class='section-label'>").text("Games").appendTo(view);
		team.games.forEach(function (game) {
			const block = $("<div class='game'>").appendTo(view);
			$("<div>").text(gameTitle(game)).appendTo(block);
			game.roster.forEach(function (member) {
				const line = $("<div class='roster-line'>").appendTo(block);
				if (member.champion) {
					const image = icon(member.champion, "champ");
					bindChampionTip(image, member.champion.name);
					line.append(image);
				}
				$("<span>").text(
					member.name
					+ (member.position ? " · " + member.position.name : "")
					+ " · " + formatStat("PLAYER", "kills", member.stats.kills)
					+ "/" + formatStat("PLAYER", "deaths", member.stats.deaths)
					+ "/" + formatStat("PLAYER", "assists", member.stats.assists)
				).appendTo(line);
				line.on("click", function () {
					location.hash = "player/" + member.playerId;
				});
			});
		});
	}

	function renderStatGroups(scope, values, parent) {
		const host = $("<div class='stats'>").appendTo(parent || view);
		const groups = {};
		model.definitions.filter(function (definition) {
			return definition.scope === scope && definition.kind !== "ATTRIBUTE";
		}).forEach(function (definition) {
			const name = definition.displayGroup || "Other";
			if (!groups[name]) {
				groups[name] = [];
			}
			groups[name].push(definition);
		});
		Object.keys(groups).forEach(function (name) {
			const group = $("<div class='stat-group'>").appendTo(host);
			$("<span class='group-title'>").text(name).appendTo(group);
			groups[name].sort(function (a, b) {
				return (a.position || 0) - (b.position || 0);
			});
			groups[name].forEach(function (definition) {
				let value = values[definition.statKey];
				if (value == null && definition.kind === "COUNTER") value = 0;
				const row = $("<div class='stat-row'>").appendTo(group);
				$("<span>").text(definition.label || definition.statKey).appendTo(row);
				$("<span>").text(formatStat(scope, definition.statKey, value)).appendTo(row);
			});
		});
	}

	function headlineStat(parent, label, value) {
		const box = $("<div>").appendTo(parent);
		$("<b>").text(label).appendTo(box);
		box.append(document.createTextNode(value));
	}

	function icon(item, className) {
		const image = $("<img>").addClass(className).attr("alt", item.name || "");
		if (item.imageUrl && String(item.imageUrl).indexOf("https://") === 0) {
			image.attr("src", item.imageUrl);
		}
		return image;
	}

	function bindChampionTip(image, name) {
		image.on("mouseenter", function () {
			showTip(name);
		});
		image.on("mouseleave", hideTip);
	}

	function showTip(name) {
		tooltip.show();
		tooltip.text(name === "Caitlyn" ? "[" + name + "] ♡" : "[" + name + "]");
	}

	function hideTip() {
		tooltip.hide();
		tooltip.text("");
	}

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
});

function buildModel(snapshot) {
	const definitions = snapshot.definitions || [];
	const definitionMap = {};
	definitions.forEach(function (definition) {
		definitionMap[definition.scope + ":" + definition.statKey] = definition;
	});

	const playerById = {};
	const teamById = {};

	(snapshot.matches || []).forEach(function (match) {
		(match.sides || []).forEach(function (side) {
			if (!side.entrantId) return;
			const team = teamById[side.entrantId] || {
				id: side.entrantId,
				name: side.name || "Unknown",
				logoUrl: side.logoUrl || null,
				seriesWins: 0,
				seriesLosses: 0,
				matches: [],
				games: [],
				rosterIds: {},
			};
			if (side.logoUrl) team.logoUrl = side.logoUrl;
			if (side.name) team.name = side.name;
			if (side.winner) team.seriesWins += 1;
			else if (side.result === "LOSS") team.seriesLosses += 1;
			const opponent = (match.sides || []).filter(function (other) {
				return other.slot !== side.slot;
			})[0] || null;
			team.matches.push({
				id: match.id,
				stageName: match.stageName,
				outcome: match.outcome,
				playedAt: match.playedAt,
				side: side,
				opponent: opponent,
			});
			teamById[side.entrantId] = team;
		});

		const sideBySlot = {};
		(match.sides || []).forEach(function (side) {
			sideBySlot[side.slot] = side;
		});

		(match.games || []).forEach(function (game) {
			const teamStatsBySlot = {};
			(game.teams || []).forEach(function (teamLine) {
				teamStatsBySlot[teamLine.slot] = teamLine.stats || {};
			});
			const rosterBySlot = {};
			(game.players || []).forEach(function (playerLine) {
				const side = sideBySlot[playerLine.slot] || {};
				const teamId = side.entrantId || ("slot-" + playerLine.slot);
				const playerId = playerLine.profileId || playerLine.displayName;
				const player = playerById[playerId] || {
					id: playerId,
					name: playerLine.displayName || "Unknown",
					games: [],
					seriesIds: {},
					seriesWins: 0,
					seriesLosses: 0,
					teamCounts: {},
				};
				if (playerLine.displayName) player.name = playerLine.displayName;
				const champion = firstRef(playerLine.attributes, "champion");
				const position = firstRef(playerLine.attributes, "position");
				const record = {
					playerId: playerId,
					name: player.name,
					teamId: teamId,
					teamName: side.name || "",
					matchId: match.id,
					gameIndex: game.gameIndex,
					playedAt: match.playedAt,
					stageName: match.stageName,
					mapName: game.mapName,
					won: game.winnerSlot === playerLine.slot,
					opponentName: opponentName(match, playerLine.slot),
					sideName: firstRefName(teamAttribute(game, playerLine.slot), "side"),
					champion: champion,
					position: position,
					items: ((playerLine.attributes && playerLine.attributes.items) || []).slice().sort(function (a, b) {
						return (a.sortOrder || 0) - (b.sortOrder || 0);
					}),
					stats: playerLine.stats || {},
					teamKills: numberOrZero(teamStatsBySlot[playerLine.slot] && teamStatsBySlot[playerLine.slot].kills),
					teamDamage: numberOrZero(teamStatsBySlot[playerLine.slot] && teamStatsBySlot[playerLine.slot].damage_to_champions),
				};
				player.games.push(record);
				if (!player.seriesIds[match.id]) {
					player.seriesIds[match.id] = true;
					if (side.winner) player.seriesWins += 1;
					else if (side.result === "LOSS") player.seriesLosses += 1;
				}
				player.teamCounts[teamId] = player.teamCounts[teamId] || { id: teamId, name: side.name || "", games: 0 };
				player.teamCounts[teamId].games += 1;
				playerById[playerId] = player;
				if (teamById[teamId]) {
					teamById[teamId].rosterIds[playerId] = true;
				}
				rosterBySlot[playerLine.slot] = rosterBySlot[playerLine.slot] || [];
				rosterBySlot[playerLine.slot].push(record);
			});

			(game.teams || []).forEach(function (teamLine) {
				const side = sideBySlot[teamLine.slot] || {};
				const team = teamById[side.entrantId];
				if (!team) return;
				const roster = (rosterBySlot[teamLine.slot] || []).slice().sort(function (a, b) {
					return ((a.position && a.position.sortOrder) || 0) - ((b.position && b.position.sortOrder) || 0);
				});
				team.games.push({
					matchId: match.id,
					gameIndex: game.gameIndex,
					playedAt: match.playedAt,
					stageName: match.stageName,
					mapName: game.mapName,
					won: game.winnerSlot === teamLine.slot,
					teamName: team.name,
					opponentName: opponentName(match, teamLine.slot),
					sideName: firstRefName(teamLine.attributes, "side"),
					stats: teamLine.stats || {},
					roster: roster,
				});
			});
		});
	});

	const players = Object.keys(playerById).map(function (id) {
		const player = playerById[id];
		player.games.sort(function (a, b) {
			return String(a.playedAt).localeCompare(String(b.playedAt)) || (a.gameIndex || 0) - (b.gameIndex || 0);
		});
		const team = favoriteTeam(player);
		player.teamId = team ? team.id : null;
		player.teamName = team ? team.name : "";
		const role = mostPlayed(player.games, "position");
		player.roleName = role ? role.name : "";
		return player;
	}).sort(function (a, b) {
		return a.name.localeCompare(b.name);
	});

	const teams = Object.keys(teamById).map(function (id) {
		const team = teamById[id];
		team.matches.sort(function (a, b) {
			return String(a.playedAt).localeCompare(String(b.playedAt));
		});
		team.games.sort(function (a, b) {
			return String(a.playedAt).localeCompare(String(b.playedAt)) || (a.gameIndex || 0) - (b.gameIndex || 0);
		});
		team.roster = Object.keys(team.rosterIds).map(function (playerId) {
			return playerById[playerId];
		}).filter(Boolean).sort(function (a, b) {
			return a.name.localeCompare(b.name);
		});
		return team;
	}).sort(function (a, b) {
		return a.name.localeCompare(b.name);
	});

	definitionLookup = definitionMap;

	return {
		competitionName: snapshot.competitionName,
		fetchedLabel: "snapshot " + formatWhen(snapshot.fetchedAt),
		definitions: definitions,
		definitionMap: definitionMap,
		players: players,
		playerById: playerById,
		teams: teams,
		teamById: teamById,
	};
}

function aggregate(games, scope) {
	const totals = { games: games.length, wins: 0, teamKills: 0, teamDamage: 0 };
	const samples = {};
	games.forEach(function (game) {
		if (game.won) totals.wins += 1;
		totals.teamKills += game.teamKills || 0;
		totals.teamDamage += game.teamDamage || 0;
		Object.keys(game.stats || {}).forEach(function (key) {
			const value = game.stats[key];
			if (typeof value !== "number") return;
			const definition = definitionFor(scope, key);
			const kind = definition ? definition.kind : "COUNTER";
			if (kind === "DERIVED") {
				samples[key] = samples[key] || [];
				samples[key].push(value);
				return;
			}
			if (kind === "PER_GAME_VALUE" || kind === "BEST") {
				samples[key] = samples[key] || [];
				samples[key].push(value);
				return;
			}
			totals[key] = (totals[key] || 0) + value;
		});
	});

	const values = {};
	Object.keys(totals).forEach(function (key) {
		values[key] = totals[key];
	});
	Object.keys(samples).forEach(function (key) {
		const definition = definitionFor(scope, key);
		const kind = definition ? definition.kind : "PER_GAME_VALUE";
		if (kind === "BEST") {
			values[key] = Math.max.apply(null, samples[key]);
		} else if (kind !== "DERIVED") {
			values[key] = average(samples[key]);
		}
	});

	const derived = scope === "TEAM" ? teamDerived(totals) : playerDerived(totals);
	Object.keys(derived).forEach(function (key) {
		values[key] = derived[key];
	});
	Object.keys(samples).forEach(function (key) {
		if (values[key] == null) values[key] = average(samples[key]);
	});
	return values;
}

function playerDerived(totals) {
	const minutes = (totals.time_played || 0) / 60000;
	return {
		kda: ratio(totals.kills, totals.assists, totals.deaths),
		kill_participation: totals.teamKills ? ((totals.kills || 0) + (totals.assists || 0)) / totals.teamKills * 100 : 0,
		cs_per_minute: minutes ? (totals.creep_score || 0) / minutes : 0,
		gold_per_minute: minutes ? (totals.gold_earned || 0) / minutes : 0,
		damage_per_minute: minutes ? (totals.damage_to_champions || 0) / minutes : 0,
		damage_share: totals.teamDamage ? (totals.damage_to_champions || 0) / totals.teamDamage * 100 : 0,
		vision_per_minute: minutes ? (totals.vision_score || 0) / minutes : 0,
		win_rate: totals.games ? totals.wins / totals.games * 100 : 0,
	};
}

function teamDerived(totals) {
	const minutes = (totals.game_duration || 0) / 60000;
	return {
		kda: ratio(totals.kills, totals.assists, totals.deaths),
		gold_per_minute: minutes ? (totals.gold_earned || 0) / minutes : 0,
		average_game_duration: totals.games ? (totals.game_duration || 0) / totals.games : 0,
		dragons_per_game: totals.games ? (totals.dragon_kills || 0) / totals.games : 0,
		barons_per_game: totals.games ? (totals.baron_kills || 0) / totals.games : 0,
		towers_per_game: totals.games ? (totals.tower_kills || 0) / totals.games : 0,
		first_blood_rate: totals.games ? (totals.first_blood || 0) / totals.games * 100 : 0,
		first_tower_rate: totals.games ? (totals.first_tower || 0) / totals.games * 100 : 0,
		first_dragon_rate: totals.games ? (totals.first_dragon || 0) / totals.games * 100 : 0,
		win_rate: totals.games ? totals.wins / totals.games * 100 : 0,
	};
}

function ratio(kills, assists, deaths) {
	const score = (kills || 0) + (assists || 0);
	if (!deaths) return score;
	return score / deaths;
}

function average(values) {
	if (!values.length) return null;
	return values.reduce(function (sum, value) { return sum + value; }, 0) / values.length;
}

let definitionLookup = null;

function definitionFor(scope, key) {
	if (!definitionLookup) return null;
	return definitionLookup[scope + ":" + key] || null;
}

function formatStat(scope, key, value) {
	if (value == null || Number.isNaN(value)) return "—";
	const definition = definitionFor(scope, key);
	const format = definition ? definition.displayFormat : "ONE_DECIMAL";
	let text;
	if (format === "DURATION") {
		text = formatDuration(value);
	} else if (format === "INTEGER") {
		text = Math.round(value).toLocaleString("en-US");
	} else if (format === "TWO_DECIMALS") {
		text = Number(value).toFixed(2);
	} else if (format === "PERCENT") {
		text = Number(value).toFixed(1) + "%";
	} else if (format === "RATIO") {
		text = Number(value).toFixed(2);
	} else if (format === "TEXT" || format === "BOOLEAN") {
		text = String(value);
	} else {
		text = Number(value).toFixed(1);
	}
	if (typeof value === "number" && value > 0 && String(key).indexOf("diff") !== -1 && text.charAt(0) !== "+") {
		text = "+" + text;
	}
	return text;
}

function formatDuration(ms) {
	const sign = ms < 0 ? "-" : "";
	const total = Math.round(Math.abs(ms) / 1000);
	const minutes = Math.floor(total / 60);
	const seconds = total % 60;
	return sign + minutes + ":" + String(seconds).padStart(2, "0");
}

function formatWhen(iso) {
	if (!iso) return "";
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";
	return date.toLocaleString(undefined, {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

function gameTitle(game) {
	return [
		game.stageName || "Game",
		"game " + game.gameIndex,
		game.won ? "win" : "loss",
		game.sideName || "",
		game.teamName ? game.teamName + " vs " + (game.opponentName || "") : ("vs " + (game.opponentName || "")),
		game.mapName || "",
		formatWhen(game.playedAt),
	].filter(Boolean).join(" · ");
}

function seriesLabel(side, outcome) {
	if (side.result === "FORFEIT" && side.winner) return "won by forfeit";
	if (side.result === "LOSS" && outcome === "FORFEIT") return "forfeit loss";
	if (side.winner) return "win";
	if (side.result === "LOSS") return "loss";
	return String(side.result || outcome || "").toLowerCase();
}

function mostPlayed(games, field) {
	const ranked = countBy(games, field);
	return ranked.length ? ranked[0].item : null;
}

function countBy(games, field) {
	const counts = {};
	games.forEach(function (game) {
		const item = game[field];
		if (!item || !item.name) return;
		const key = item.name;
		if (!counts[key]) counts[key] = { item: item, count: 0 };
		counts[key].count += 1;
	});
	return Object.keys(counts).map(function (key) {
		return counts[key];
	}).sort(function (a, b) {
		return b.count - a.count || a.item.name.localeCompare(b.item.name);
	});
}

function favoriteTeam(player) {
	let best = null;
	Object.keys(player.teamCounts).forEach(function (id) {
		const team = player.teamCounts[id];
		if (!best || team.games > best.games) best = team;
	});
	return best;
}

function opponentName(match, slot) {
	const other = (match.sides || []).filter(function (side) {
		return side.slot !== slot;
	})[0];
	return other ? other.name : "";
}

function teamAttribute(game, slot) {
	const line = (game.teams || []).filter(function (team) {
		return team.slot === slot;
	})[0];
	return line ? line.attributes : null;
}

function firstRef(attributes, key) {
	const list = attributes && attributes[key];
	if (!list || !list.length) return null;
	return list[0];
}

function firstRefName(attributes, key) {
	const item = firstRef(attributes, key);
	return item ? item.name : "";
}

function numberOrZero(value) {
	return typeof value === "number" ? value : 0;
}