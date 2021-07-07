/**
 * Welcome to Pebble.js!
 *
 * This is where you write your app.
 */

var UI = require('ui');
var Vector = require('vector2');
var Web = require('ajax');
var Feature = require('platform/feature');
var Light = require('ui/light');
var Vibe = require('ui/vibe');

var boatData = {};
var boats = {};
var boatIDs = [];
var currentBoat = -1;
var cache = {
	status: "",
	id: -1
};

const env = {
	ogMap: {
		//1530
		x: 1930,
		y: 800
	},
	hideNotInService: false,
	vibeOnStatusChange: true
}

var wind_main = new UI.Window({
	status: false,
	backgroundColor: 'white'
});

var bg = new UI.Image({
	position: new Vector(0,0),
	size: new Vector(144,144),
	compositing: "normal",
	image: Feature.color("IMAGE_BACKGROUND", "IMAGE_BACKGROUND_BW")
});

datarect = new UI.Rect({
	backgroundColor: 'black',
	position: new Vector(0,134),
	size: new Vector(144,34)
})
info = new UI.Text({
	text: "Up or Down to select a ship",
	position: new Vector(4, 134),
	size: new Vector(144, 34),
	textAlign: "left",
	font: "gothic-14"
});
clock = new UI.TimeText({
	text: "%H:%M",
	position: new Vector(47, 0),
	size: new Vector(40, 16),
	textAlign: "center",
	color: Feature.color("black","white"),
	backgroundColor: Feature.color("transparent", "black"),
	font: "gothic-14"
});
pointer = new UI.Image({
  position: new Vector(0, 144),
  size: new Vector(11,5),
  image: "IMAGE_POINTER",
  compositing: 'set'	
})

wind_main.add(bg);
wind_main.add(pointer);
wind_main.add(datarect);
wind_main.add(info);
wind_main.add(clock);
wind_main.show();

function getScaledPosition(x,y) {
	var out = {
		x: getScalePosSingle(x,"x"),
		y: getScalePosSingle(y, "y")
	}

	if (out.y > 60) {
		out.x += 5;
	}
	if (out.y > 75) {
		out.x += 6;
	}

	if (out.y > 120) {
		out.y -= 6;
		out.x -= 4;
	}
	
	return out
}
function getScalePosSingle(pos, xy) {
	var og = env.ogMap.y
	var max = 144
	if (xy == "x") {
		//The 125 comes from the cropping of the width of the map we did
		og = env.ogMap.x + 125
	}
	var newpos = Math.ceil((pos / og) * max);

	//This is a dirty hack because the boats keep crashing into the land	
	//Basically we move them +11 if they're between 75 and 100 X
	// if (newpos > 100 && xy == "x") {
	// 	//Do nothing
	// } else if (newpos > 75 && xy == "x") {
	// 		newpos += 11;
	// } else if (newpos > 65 && xy == "x") {
	// 	//Make the +11 jump less sudden
	// 	newpos += 5;
	// }

	// if (newpos > 120 && xy == "y") {
	// 	newpos -= 6
	// }
	return newpos

}


function updateLocations() {
Web({ url: 'https://rf-aisvesselmap-production.ase-bookit.p.azurewebsites.net/home/boats', type: 'json' },
  function(data) {

	for (var i=0;i<data.length;i++) {
	
		var boat = data[i];
		boatData[boat.id] = boat
		var newpos = getScaledPosition(boat.marker.position.x,boat.marker.position.y)
		var boatX = newpos.x;
		var boatY = newpos.y;
		console.log(boat.id + " is at " + boatX + ", " + boatY);

		if (boats.hasOwnProperty(boat.id)) {

			var img = "IMAGE_MARKER"
			if (boat.class == "ferry") { img = "IMAGE_MARKER_BLUE" }
			if (boat.class == "high-speed") { img = "IMAGE_MARKER_RED" }
			boats[boat.id].image(Feature.color(img,"IMAGE_MARKER"))

			boats[boat.id].animate('position', new Vector(boatX, boatY), 1000);

		} else {

			var img = "IMAGE_MARKER"
			if (boat.class == "ferry") { img = "IMAGE_MARKER_BLUE" }
			if (boat.class == "high-speed") { img = "IMAGE_MARKER_RED" }
 
			boats[boat.id] = new UI.Image({
				position: new Vector(boatX,boatY),
				size: new Vector(6,6),
				compositing: "set",
				backgroundColor: 'transparent',
				image: Feature.color(img,"IMAGE_MARKER")
			});
			boatIDs.push(boat.id);
			wind_main.add(boats[boat.id]);
		}

	}

	if (currentBoat != -1) {
		getInfo(boatIDs[currentBoat])
	}

  });

}

wind_main.on('click', 'down', function(e) {
	moveBoat("down");
});
wind_main.on('click', 'up', function(e) {
	moveBoat("up");
});
wind_main.on('click', 'select', function(e) {
	Light.trigger()
})

function moveBoat(direction) {
	if (direction == "up") {
		currentBoat--;
	} else {
		currentBoat++;
	}

	if (currentBoat > boatIDs.length-1) {
		currentBoat = 0
	} else if (currentBoat < 0) {
		currentBoat = boatIDs.length - 1
	}


	console.log("Show info for " + boatIDs[currentBoat]);
	getInfo(boatIDs[currentBoat]);

}

function getInfo(boatID) {

	var idMap = {
		"EAGL": "Red Eagle",
		"OSPR": "Red Osprey",
		"KEST": "Red Kestrel",
		"FALC": "Red Falcon",
	}

	var d = boatData[boatID]
	var newpos = getScaledPosition(d.marker.position.x,d.marker.position.y)
	var boatX = newpos.x;
	var boatY = newpos.y;
	var text = d.label.info.toString();
	text = text.replace(/\n/g,"");
	text = text.replace(/\r/g,"");
	text = text.replace(/,/g," ");
	

	var name = d.id
	if (idMap.hasOwnProperty(name)) {
		name = idMap[name]
	} else {
		name = name.replace("JET", "Red Jet ")
	}

	text = name + "\n" + text
	info.text(text);
	pointer.animate('position', new Vector(boatX - 2, boatY - 5), 400);

	var cacheCheck = d.label.info.toString()

	if (cache.id != boatID) {
		cache.id = boatID
		cache.status = cacheCheck
	}
	if (cache.status != cacheCheck && cache.status != "") {
		// Send a long vibration to the user wrist
		Vibe.vibrate('short');
	}
	cache.status = cacheCheck


}


updateLocations();
setInterval(updateLocations, 10000);

