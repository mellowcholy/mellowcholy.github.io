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

// setup champ data
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

// skinlines
let skinlines;
await $.get(`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/skinlines.json`, function (data) {
	skinlines = data;
});

const results = await Promise.all(champRequests);

$("#loading").css("display","none");

for (const { rawData, champData, rawTags, key } of results) {
    const name = champData.name;

    const c1 = $(`<img class="champ" src="https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${key}.png">`).appendTo(team1);
    const c2 = $(`<img class="champ" src="https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${key}.png">`).appendTo(team2);

    champs1[name] = c1;
    champs2[name] = c2;

    champList[name] = {
        class: champData.roles,
        range: rawData.stats.attackrange,
		skins: [],
    };

	for (const k in rawTags) {
		champList[name]["tags"] = parseTags(rawTags[k].metaDataTags);
		break;
	}

	for (const skin in champData.skins) {
		for (const line in champData.skins[skin].skinLines) {
			const skinlineId = champData.skins[skin].skinLines[line].id;

			skinlines.forEach((element) => {
				if (element.id == skinlineId) {
					champList[name].skins.push(element.name);
				}
			});
		}
	}

	//console.log(name);
	//console.log(champList[name]);
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
	"genders+race": {
		type: "title",
		text: "Genders/Race",
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
	"humans&everythingelse": {
		type: "option",
		text: "Humans vs Everything Else",
		champs() {
			let a = Array();
			let b = Array();

			for (const key in champList) {
				if (GetTag(champList[key], "race") == "human") { a.push(key); } else { b.push(key); }
			}

			SetChamps(a, b);
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
	"fighters": {
		type: "option",
		text: "Fighters",
		champs() {
			let c = Array();

			for (const key in champList) {
				if (champList[key].class.includes("fighter")) {
					c.push(key);
				}
			}

			SetChamps(c);
		}
	},
	"mages": {
		type: "option",
		text: "Mages",
		champs() {
			let c = Array();

			for (const key in champList) {
				if (champList[key].class.includes("mage")) {
					c.push(key);
				}
			}

			SetChamps(c);
		}
	},
	"assassins": {
		type: "option",
		text: "Assassins",
		champs() {
			let c = Array();

			for (const key in champList) {
				if (champList[key].class.includes("assassin")) {
					c.push(key);
				}
			}

			SetChamps(c);
		}
	},
	"marksmen": {
		type: "option",
		text: "Marksmen",
		champs() {
			let c = Array();

			for (const key in champList) {
				if (champList[key].class.includes("marksman")) {
					c.push(key);
				}
			}

			SetChamps(c);
		}
	},
	"tanks": {
		type: "option",
		text: "Tanks",
		champs() {
			let c = Array();

			for (const key in champList) {
				if (champList[key].class.includes("tank")) {
					c.push(key);
				}
			}

			SetChamps(c);
		}
	},
	"supports": {
		type: "option",
		text: "Supports",
		champs() {
			let c = Array();

			for (const key in champList) {
				if (champList[key].class.includes("support")) {
					c.push(key);
				}
			}

			SetChamps(c);
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
			let a = Array();
			let b = Array();

			for (const key in champList) {
				if (champList[key].skins.includes("Spirit Blossom")) {
					a.push(key);
				}

				if (champList[key].skins.includes("Blood Moon")) {
					b.push(key);
				}
			}

			SetChamps(a, b);
		}
	},
	"christmas&halloween": {
		type: "option",
		text: "Christmas vs Halloween",
		champs() {
			let a = Array();
			let b = Array();

			for (const key in champList) {
				if (
					champList[key].skins.includes("Sugar Rush") ||
					champList[key].skins.includes("Toy Box") ||
					champList[key].skins.includes("Winterblessed") ||
					champList[key].skins.includes("Snowdown Showdown") ||
					champList[key].skins.includes("Snow Day") ||
					champList[key].skins.includes("Winter Wonder")
				) {
					a.push(key);
				}

				if (
					champList[key].skins.includes("Academy") ||
					champList[key].skins.includes("Bewitching") ||
					champList[key].skins.includes("Zombies VS Slayers") ||
					champList[key].skins.includes("Definitely Not") ||
					champList[key].skins.includes("Demonic") ||
					champList[key].skins.includes("Fright Night") ||
					champList[key].skins.includes("Death Sworn") ||
					champList[key].skins.includes("La Ilusión") ||
					champList[key].skins.includes("Trick-or-Treat")
				) {
					b.push(key);
				}
			}

			SetChamps(a, b);
		}
	},
	"music": {
		type: "option",
		text: "KDA/Heartsteel/True Damage/Pentakill",
		champs() {
			let c = Array();

			for (const key in champList) {
				if (
					champList[key].skins.includes("K/DA") ||
					champList[key].skins.includes("HEARTSTEEL") ||
					champList[key].skins.includes("True Damage") ||
					champList[key].skins.includes("Pentakill") ||
					champList[key].skins.includes("Pentakill III: The Lost Chapter")
				) {
					c.push(key);
				}
			}

			SetChamps(c);
		}
	},
	"newyears&valentines": {
		type: "option",
		text: "New Years vs Valentines",
		champs() {
			let a = Array();
			let b = Array();

			for (const key in champList) {
				if (
					champList[key].skins.includes("Lunar Revel") ||
					champList[key].skins.includes("Lunar Revel: Firecracker") ||
					champList[key].skins.includes("Lunar Beast") ||
					champList[key].skins.includes("Mythmaker")
				) {
					a.push(key);
				}

				if (
					champList[key].skins.includes("Debonair") ||
					champList[key].skins.includes("Heartbreakers")
				) {
					b.push(key);
				}
			}

			SetChamps(a, b);
		}
	},
	"coven&starguardian": {
		type: "option",
		text: "Coven vs Star Guardians",
		champs() {
			let a = Array();
			let b = Array();

			for (const key in champList) {
				if (
					champList[key].skins.includes("Coven")
				) {
					a.push(key);
				}

				if (
					champList[key].skins.includes("Star Guardian Season 1") ||
					champList[key].skins.includes("Star Guardian Season 2") ||
					champList[key].skins.includes("Star Guardian Season 3") ||
					champList[key].skins.includes("Star Guardian Season 4")
				) {
					b.push(key);
				}
			}

			SetChamps(a, b);
		}
	},
	"poolparty&infernal": {
		type: "option",
		text: "Pool Party vs Infernal",
		champs() {
			let a = Array();
			let b = Array();

			for (const key in champList) {
				if (
					champList[key].skins.includes("Pool Party")
				) {
					a.push(key);
				}

				if (
					champList[key].skins.includes("Infernal")
				) {
					b.push(key);
				}
			}

			SetChamps(a, b);
		}
	},
	"night/dawnbringers&cosmic/darkstar": {
		type: "option",
		text: "Night/Dawnbringers vs Cosmic/Dark Star",
		champs() {
			let a = Array();
			let b = Array();

			for (const key in champList) {
				if (
					champList[key].skins.includes("Nightbringer") ||
					champList[key].skins.includes("Dawnbringer") ||
					champList[key].skins.includes("Nightbringer and Dawnbringer")
				) {
					a.push(key);
				}

				if (
					champList[key].skins.includes("Cosmic") ||
					champList[key].skins.includes("Dark Star")
				) {
					b.push(key);
				}
			}

			SetChamps(a, b);
		}
	},
	"dayjob/arcade/bees": {
		type: "option",
		text: "Day Job/Arcade/Bees",
		champs() {
			let c = Array();

			for (const key in champList) {
				if (
					champList[key].skins.includes("Day Job") ||
					champList[key].skins.includes("Arcade: Heroes") ||
					champList[key].skins.includes("Arcade: Battle Bosses") ||
					champList[key].skins.includes("Bees!")
				) {
					c.push(key);
				}
			}

			SetChamps(c);
		}
	},
	"elderwood/animasquad&project": {
		type: "option",
		text: "Elderwood/Anima Squad vs Project",
		champs() {
			let a = Array();
			let b = Array();

			for (const key in champList) {
				if (
					champList[key].skins.includes("Elderwood") ||
					champList[key].skins.includes("Anima Squad")
				) {
					a.push(key);
				}

				if (
					champList[key].skins.includes("PROJECT")
				) {
					b.push(key);
				}
			}

			SetChamps(a, b);
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
				if (champList[key].range > 325) {
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
				if (champList[key].range <= 325) {
					c.push(key);
				}
			}

			SetChamps(c);
		}
	},
	"stack": {
		type: "option",
		text: "Stackin'",
		champs() {
			SetChamps(tags.infinite);
		}
	},
	"nemesis": {
		type: "option",
		text: "Side Quest",
		champs() {
			SetChamps(tags.nemesis);
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
}