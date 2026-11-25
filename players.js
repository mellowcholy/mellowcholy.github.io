function renderPlayers() {
	const view = site.view;
	view.empty();
	$("<span class='section-label'>").text("Players - Click on a player to view more stats").appendTo(view);
	site.model.players.slice().sort(function (a, b) {
		const team = (a.teamName || "").localeCompare(b.teamName || "");
		if (team) return team;
		return a.name.localeCompare(b.name);
	}).forEach(function (player, index) {
		const line = $("<div class='roster-line'>").appendTo(view);
		if (index % 2 === 1) line.addClass("row-alt");
		const champion = representativeChampion(player, player.games);
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

	const played = totals.games || 0;
	const won = totals.wins || 0;
	renderStatGroups("PLAYER", totals, null, {
		Results: [
			{ label: "Games played", value: played },
			{ label: "Games won", value: won },
			{ label: "Games lost", value: played - won },
		],
	}, true);
	const results = view.find(".group-title").filter(function () {
		return $(this).text() === "Results";
	}).closest(".stat-group");
	renderFavouriteItems(player, results);
}

const trinkets = { "3340": true, "3363": true, "3364": true };

function renderFavouriteItems(player, after) {
	const favourites = favouriteItems(player).slice(0, 8);
	if (!favourites.length) return;
	const group = $("<div class='stat-group favourite-items'>");
	if (after && after.length) group.insertAfter(after);
	else group.appendTo(site.view);
	$("<span class='group-title'>").text("Favourite Items").appendTo(group);
	const row = $("<div class='champ-row'>").appendTo(group);
	favourites.forEach(function (entry) {
		const image = icon(entry.item, "champ item");
		image.on("mouseenter", function () {
			showTip(entry.item.name + " × " + entry.count);
		});
		image.on("mouseleave", hideTip);
		row.append(image);
	});
}

function favouriteItems(player) {
	const counts = {};
	player.games.forEach(function (game) {
		const seen = {};
		(game.items || []).forEach(function (item) {
			if (!item || !item.name || item.placeholder) return;
			if (trinkets[item.key] || trinkets[item.externalKey]) return;
			const key = item.key || item.name;
			if (seen[key]) return;
			seen[key] = true;
			if (!counts[key]) counts[key] = { item: item, count: 0 };
			counts[key].count += 1;
		});
	});
	return Object.keys(counts).map(function (key) {
		return counts[key];
	}).sort(function (a, b) {
		return b.count - a.count || a.item.name.localeCompare(b.item.name);
	});
}
