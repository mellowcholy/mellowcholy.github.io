function parseTags(str) {
    return str.split(',').reduce((obj, part) => {
        const [key, value] = part.split(':');
        obj[key] = value;
        return obj;
    }, {});
}

$(document).ready(async function() {

const left = $("#left");
const team1 = $("#team1");
const team2 = $("#team2");

const champs1 = {};
const champs2 = {};
const champList = {};



let version = "15.18.1";
await $.get("https://ddragon.leagueoflegends.com/api/versions.json", function(data) {
	version = data[0];
});

// setup champ icons
//$.get('champion.json', function(data) {
const champRequests = [];

await $.get(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`, function (data) {
    for (const k in data.data) {
        const rawData = data.data[k];
        const key = rawData.key;
		const id = rawData.id;

		const request = $.get(`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champions/${key}.json`)
			.then(champData => {
				
				return $.get(`https://raw.communitydragon.org/latest/game/data/characters/${id.toLowerCase()}/skins/root.bin.json`)
					.then(rawTags => {
						return {rawData, champData, rawTags, key};
					})
			});

        champRequests.push(request);
    }
});

const results = await Promise.all(champRequests);

for (const { rawData, champData, rawTags, key } of results) {
    const name = champData.name;

    const c1 = $(`<img class="champ" src="https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${key}.png">`).appendTo(team1);
    const c2 = $(`<img class="champ" src="https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${key}.png">`).appendTo(team2);

    champs1[name] = c1;
    champs2[name] = c2;

    champList[name] = {
        class: champData.roles,
        skins: champData.skins,
        range: rawData.stats.attackrange,
    };

	for (const k in rawTags) {
		champList[name]["tags"] = parseTags(rawTags[k].metaDataTags);
		break;
	}

	console.log(champList[name]);
}


function SetChamps(list1, list2) {
	if (list2 == null) { team2.css("display","none"); }

	// hide
	for (const key in champs1) {
		champs1[key].css("display","none");
	}
	for (const key in champs2) {
		champs2[key].css("display","none");
	}

	// show
	for (let i = 0; i < list1.length; i++) {
		if (champs1[list1[i]] == null) { console.log(list1[i]); }
		champs1[list1[i]].css("display", "block");
	}

	if (list2 == null) { return; }

	team2.css("display","flex");

	for (let i = 0; i < list2.length; i++) {
		if (champs2[list2[i]] == null) { console.log(list2[i]); }
		champs2[list2[i]].css("display", "block");
	}
}

function GetTag(key, tag) {
	if (!key.tags[tag]) { return false; }

	return key.tags[tag];
}

// setup option buttons
let options = {
	"letters": {
		type: "title",
		text: "Letters",
	},
	"am": {
		type: "option",
		text: "A-M",
		champs() {
			let c = Array();

			for (const key in champList) {
				if (key[0] <= "M") {
					c.push(key);
				}
			}

			SetChamps(c);
		}
	},
	"nz": {
		type: "option",
		text: "N-Z",
		champs() {
			let c = Array();

			for (const key in champList) {
				if (key[0] > "M") {
					c.push(key);
				}
			}

			SetChamps(c);
		}
	},
	"genders": {
		type: "title",
		text: "Genders",
	},
	"male": {
		type: "option",
		text: "Male",
		champs() {
			let c = Array();

			for (const key in champList) {
				if (GetTag(champList[key], "gender") == "male") { c.push(key); }
			}

			SetChamps(c);
		}
	},
	"female": {
		type: "option",
		text: "Female",
		champs() {
			let c = Array();

			for (const key in champList) {
				if (GetTag(champList[key], "gender") == "female") { c.push(key); }
			}

			SetChamps(c);
		}
	},
	"male&female": {
		type: "option",
		text: "Males vs Females",
		champs() {
			let m = Array();
			let f = Array();

			for (const key in champList) {
				if (GetTag(champList[key], "gender") == "male") { m.push(key); }
			}

			for (const key in champList) {
				if (GetTag(champList[key], "gender") == "female") { f.push(key); }
			}

			SetChamps(m, f);
		}
	},
	"regions": {
		type: "title",
		text: "Regions",
	},
	"demacia&noxus": {
		type: "option",
		text: "Demacia vs Noxus",
		champs() {
			let a = Array();
			let b = Array();

			for (const key in champList) {
				if (GetTag(champList[key], "faction") == "demacia") { a.push(key); }
			}

			for (const key in champList) {
				if (GetTag(champList[key], "faction") == "noxus") { b.push(key); }
			}

			SetChamps(a, b);
		}
	},
	"piltover&zaun": {
		type: "option",
		text: "Piltover vs Zaun",
		champs() {
			let a = Array();
			let b = Array();

			for (const key in champList) {
				if (GetTag(champList[key], "faction") == "piltover") { a.push(key); }
			}

			for (const key in champList) {
				if (GetTag(champList[key], "faction") == "zaun") { b.push(key); }
			}

			SetChamps(a, b);
		}
	},
	"shurima&void": {
		type: "option",
		text: "Shurima vs Void",
		champs() {
			let a = Array();
			let b = Array();

			for (const key in champList) {
				if (GetTag(champList[key], "faction") == "shurima") { a.push(key); }
			}

			for (const key in champList) {
				if (GetTag(champList[key], "faction") == "void") { b.push(key); }
			}

			SetChamps(a, b);
		}
	},
	"bilgewater&shadowisles": {
		type: "option",
		text: "Bilgewater vs Shadow Isles",
		champs() {
			let a = Array();
			let b = Array();

			for (const key in champList) {
				if (GetTag(champList[key], "faction") == "bilgewater") { a.push(key); }
			}

			for (const key in champList) {
				if (GetTag(champList[key], "faction") == "shadowisles") { b.push(key); }
			}

			SetChamps(a, b);
		}
	},
	"targon&ixtal": {
		type: "option",
		text: "Targon vs Ixtal",
		champs() {
			let a = Array();
			let b = Array();

			for (const key in champList) {
				if (GetTag(champList[key], "faction") == "mttargon") { a.push(key); }
			}

			for (const key in champList) {
				if (GetTag(champList[key], "faction") == "ixtal") { b.push(key); }
			}

			SetChamps(a, b);
		}
	},
	"ionia&noxus": {
		type: "option",
		text: "Ionia vs Noxus",
		champs() {
			let a = Array();
			let b = Array();

			for (const key in champList) {
				if (GetTag(champList[key], "faction") == "ionia") { a.push(key); }
			}

			for (const key in champList) {
				if (GetTag(champList[key], "faction") == "noxus") { b.push(key); }
			}

			SetChamps(a, b);
		}
	},
	"freljord&bandlecity": {
		type: "option",
		text: "Freljord vs Bandle City",
		champs() {
			let a = Array();
			let b = Array();

			for (const key in champList) {
				if (GetTag(champList[key], "faction") == "freljord") { a.push(key); }
			}

			for (const key in champList) {
				if (GetTag(champList[key], "faction") == "bandlecity" || GetTag(champList[key], "race") == "yordle") { b.push(key); }
			}

			SetChamps(a, b);
		}
	},
	"classes": {
		type: "title",
		text: "Classes",
	},
	// TODO: vvvv
	"marksmen,support&mages": {
		type: "option",
		text: "Marksmen & Support vs Mages",
		champs() {
			let a = Array();
			let b = Array();

			for (const key in champList) {
				if (champList[key].class.includes("marksman") || champList[key].class.includes("support")) {
					a.push(key);
				}

				if (champList[key].class.includes("mage")) {
					b.push(key);
				}
			}

			SetChamps(a, b);
		}
	},
	"tanks&fighters": {
		type: "option",
		text: "Tanks vs Fighters",
		champs() {
			let a = Array();
			let b = Array();

			for (const key in champList) {
				if (champList[key].class.includes("tank")) {
					a.push(key);
				}

				if (champList[key].class.includes("fighter")) {
					b.push(key);
				}
			}

			SetChamps(a, b);
		}
	},
	"skinlines": {
		type: "title",
		text: "Skinlines",
	},
	"spiritblossom&bloodmoon": {
		type: "option",
		text: "Spirit Blossom vs Blood Moon",
		champs() {
			SetChamps(tags.spiritblossom, tags.bloodmoon);
		}
	},
	"christmas&halloween": {
		type: "option",
		text: "Christmas vs Halloween",
		champs() {
			SetChamps(tags.christmas, tags.halloween);
		}
	},
	"other": {
		type: "title",
		text: "Other",
	},
	"range": {
		type: "option",
		text: "Ranged Riot",
		champs() {
			let c = Array();

			for (const key in champList) {
				if (champList[key].stats.attackrange > 325) {
					c.push(key);
				}
			}

			SetChamps(c);
		}
	},
	"melee": {
		type: "option",
		text: "Melee Madness",
		champs() {
			let c = Array();

			for (const key in champList) {
				if (champList[key].stats.attackrange <= 325) {
					c.push(key);
				}
			}

			SetChamps(c);
		}
	},
	"stack": {
		type: "option",
		text: "Infinite Stacking",
		champs() {
			SetChamps(tags.infinite);
		}
	},
	"nemesis": {
		type: "option",
		text: "Nemesis Draft",
		champs() {
			SetChamps(tags.nemesis);
		}
	},
	"crimecitytest": {
		type: "option",
		text: "CrimeCity",
		champs() {
			let c = Array();

			for (const key in champList) {
				if (champList[key].stats.attackrange <= 325) {
					c.push(key);
				}
			}

			SetChamps(c);
		}
	},
}

for (const key in options) {
	switch(options[key].type) {
		case "option":
			let o = $("<div class='outlined option'>" + options[key].text + "</div>").appendTo(left);
			o.click(function() {
				$(".option").removeClass("selected");

				o.addClass("selected");
				options[key].champs();
			} );
		break;

		case "title":
			$("<span>" + options[key].text + "</span>").appendTo(left);
		break;
	}
}

// generate floating text

let floating = {
	"₊✩‧₊˚౨ৎ˚₊✩‧₊": "right:30px;top:20px;",
	"⸜(｡˃ ᵕ ˂ )⸝♡": "right:10px;top:270px;",

	"⋆｡‧˚ʚ♡ɞ˚‧｡⋆": "left:30px;top:120px;",
	"⋆˚𖥔 ݁ ˖𓂃.☘︎ ݁˖": "left:70px;top:400px;",

	"⊹₊ ˚‧︵‿₊୨୧₊‿︵‧ ˚ ₊⊹": "left:200px;bottom:100px;",
	"ᝰ.ᐟ✮⋆˙": "left:700px;bottom:160px;",
	"⋆.˚ ᡣ𐭩 .𖥔˚": "right:600px;bottom:200px;",
	"૮ . . ྀིა": "right:100px;bottom:60px;",
}

let body = $("body");

for (const key in floating) {
	let f = $("<span class='floating'>" + key + "</span>").appendTo(body);
	f.attr("style", floating[key]);
}

})

let tags = {
	"infinite": ["Aurelion Sol","Bard","Bel'Veth","Cho'Gath","Draven","Kindred","Nasus","Senna","Shyvana","Sion","Smolder","Swain","Sylas","Thresh","Veigar"],
	"nemesis": ["Rengar","Kha'Zix","Senna","Lucian","Thresh","Hwei","Jhin","Nasus","Renekton","Shen","Zed","Bel'Veth","Jax","Aurelion Sol","Smolder","Kindred","Tryndamere","Kayle","Morgana","Aatrox"],
	//-----
	"spiritblossom": ["Ahri","Aphelios","Cassiopeia","Darius","Evelynn","Kindred","Lillia","Master Yi","Riven","Sett","Soraka","Syndra","Teemo","Thresh","Tristana","Vayne","Yasuo","Yone","Yorick"],
	"bloodmoon": ["Aatrox","Akali","Diana","Elise","Evelynn","Fiddlesticks","Jhin","Kalista","Katarina","Kennen","Master Yi","Pyke","Shen","Sivir","Talon","Thresh","Tryndamere","Twisted Fate","Yasuo","Zed","Zilean","Zyra"],
	"christmas": ["Bard","Gnar","Graves","Malzahar","Singed","Syndra","Ziggs","Jinx","Veigar","Miss Fortune","Tristana","Maokai","Teemo","LeBlanc","Shaco","Zilean","Amumu","Kog'Maw","Braum","Draven","Gragas","Sona","Katarina","Nidalee","Heimerdinger","Nunu & Willump","Irelia","Annie","Dr. Mundo","Twitch","Sejuani","Poppy","Master Yi","Sivir","Karma","Lulu","Neeko","Orianna","Soraka"],
	"halloween": ["Annie","Draven","Nautilus","Nunu & Willump","Pyke","Renata Glasc","Shaco","Trundle","Urgot","Veigar","Zeri","Cassiopeia","Elise","Fiora","Janna","LeBlanc","Miss Fortune","Morgana","Nami","Neeko","Nidalee","Poppy","Senna","Syndra","Tristana","Yuumi","Anivia","Urgot","Kassadin","Kled","Karthus","Maokai","Zyra","Nocturne","Hecarim","Katarina","Dr. Mundo","Tryndamere","Vladimir","Amumu","Fiddlesticks","Gangplank","Ekko","Twisted Fate","Vayne","Lulu","Blitzcrank"],
}