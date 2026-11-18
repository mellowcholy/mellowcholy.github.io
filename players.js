function renderPlayers() {
	const view = site.view;
	view.empty();
	$("<span class='section-label'>").text("Players - Click on a player to view more stats").appendTo(view);
	site.model.players.forEach(function (player) {
		const line = $("<div class='roster-line'>").appendTo(view);
		const champion = mostPlayed(player.games, "champion");
		if (champion) {
			const image = icon(champion, "champ");
			bindChampionTip(image, champion.name);
			line.append(image);
		}
		const label = $("<span>").appendTo(line);
		label.append(playerName(player.name));
		if (player.teamName) label.append(document.createTextNode("· " + player.teamName));
		line.on("click", function () {
			location.hash = "player/" + player.id;
		});
	});
}

function renderPlayer(player) {
	const view = site.view;
	const totals = aggregate(player.games, "PLAYER");
	$("<span class='section-label'>").append(playerName(player.name)).appendTo(view);
	const who = $("<div class='who'>").appendTo(view);
	if (player.teamId) {
		$("<div class='roster-line'>").text(player.teamName).appendTo(who).on("click", function () {
			location.hash = "team/" + player.teamId;
		});
	}
	$("<span class='muted'>").text(
		player.games.length + " games · series " + player.seriesWins + "-" + player.seriesLosses
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
