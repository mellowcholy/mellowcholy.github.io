function renderTeams() {
	const view = site.view;
	view.empty();
	$("<span class='section-label'>").text("Teams - Click on a team to view more stats").appendTo(view);
	site.model.teams.forEach(function (team) {
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
	const view = site.view;
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
		"Series " + team.seriesWins + "-" + team.seriesLosses + " · " + team.games.length + " games"
	).appendTo(view);

	$("<span class='section-label'>").text("Matches").appendTo(view);
	team.matches.forEach(function (match) {
		const side = match.side;
		const other = match.opponent;
		const line = $("<div class='match-line'>").appendTo(view);
		$("<div>").text(
			(match.stageName || "Match")
			+ " vs " + (other ? other.name : "TBD")
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
		const label = $("<span>").appendTo(line);
		label.append(playerName(player.name));
		label.append(document.createTextNode(" · " + (player.roleName || "flex") + " · " + playedHere + " games"));
		line.on("click", function () {
			location.hash = "player/" + player.id;
		});
	});

	$("<span class='section-label'>").text("Season").appendTo(view);
	if (!team.games.length) {
		$("<span class='muted'>").text("No played games.").appendTo(view);
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
			const label = $("<span>").appendTo(line);
			label.append(playerName(member.name));
			label.append(document.createTextNode(
				(member.position ? " · " + member.position.name : "")
				+ " · " + formatStat("PLAYER", "kills", member.stats.kills)
				+ "/" + formatStat("PLAYER", "deaths", member.stats.deaths)
				+ "/" + formatStat("PLAYER", "assists", member.stats.assists)
			));
			line.on("click", function () {
				location.hash = "player/" + member.playerId;
			});
		});
	});
}
