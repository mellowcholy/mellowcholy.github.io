var site = {
	view: null,
	model: null,
	tooltip: null,
};

function renderStatGroups(scope, values, parent) {
	const host = $("<div class='stats'>").appendTo(parent || site.view);
	const groups = {};
	site.model.definitions.filter(function (definition) {
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

function playerName(name) {
	const text = name || "";
	const hash = text.indexOf("#");
	const wrap = $("<span class='player-name'>");
	if (hash === -1) {
		$("<b>").text(text).appendTo(wrap);
		return wrap;
	}
	$("<b>").text(text.slice(0, hash)).appendTo(wrap);
	$("<span class='tag'>").text(text.slice(hash)).appendTo(wrap);
	return wrap;
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
	site.tooltip.show();
	site.tooltip.text(name === "Yunara" ? "[" + name + "] ♡" : "[" + name + "]");
}

function hideTip() {
	site.tooltip.hide();
	site.tooltip.text("");
}

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
