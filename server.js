/***********************************************************************************************

server.js  

Creates a server which handles requests and generates an appropriate .mid file 
based on the user's input. 

***********************************************************************************************/

// allows dynamic rendering of .ejs (embedded Javascript) pages
var express = require('express');
var app = express();

// importing module 
var generate = require('./play_multi_track.js');

// saves files to server
var fs = require('fs');

// generates 
var Midi = require('jsmidgen');

// let's us determine whether or not to delete the previous midi 
var isGenerated = false; 

// sets the format of the rendered pages to ejs
app.set('view engine', 'ejs');
app.set('view options', { layout: false });

// makes the following folders accessible to all GET requests 
app.use('/jasmid', express.static('jasmid'));
app.use('/public', express.static('public'));
app.use('/mid', express.static('mid'));
app.use('/mp3', express.static('mp3'));
app.use('/js', express.static('js')); 
app.use('/inc', express.static('inc')); 
app.use('/soundfont', express.static('soundfont')); 
app.use('/', express.static('/'));

// no clue
app.use(express.bodyParser());
app.use(app.router);

// when the user GETs the homepage, render index(.ejs) 
app.get('/', function (req, res) {
  	res.render('index', { generated: isGenerated });
});

// when the user POSTS to generate, generate the pattern, save it to the server, and 
app.post('/generate', function(req, res){
 	/*
 	 	var chords = generateChords(req.body.pattern, req.body.time); 
 	    chords = parseChords(chords); 
 	 	var harmony = generate(req.body.pattern, chords);	

 	 	generate(req.body.pattern, harmony); 
 	*/ 
 	var melody = req.body.pattern; 
 	var time = parseInt(req.body.time, 10);

	console.log(melody);
	// generates the melody file
	generate(melody, ["c9,64"], 'melody.mid');

	// generates the harmony file
	var harmony = (parseChords(generateChords(melody, time)));
	generate(melody, harmony, 'harmony.mid');

	isGenerated = true; 
	res.redirect('/');

}); 

// if the user GETS the download page, then send them the mid file 
app.get('/download', function(req, res){
  	res.download('./mid/harmony.mid', 'yourMusic.mid');
  	// res.redirect('/');
});

// if they (accidentally) go to /generate without POSTing, then redirect to home page 
app.get('/generate', function(req, res){
	res.redirect('/'); 
})

/*

The following has been taken from MIDI.js > plugin.js so that key to note and note to key
conversions may be easily done on the server 

These conversions allow us to find notes that are a certain interval away from a given note. 

*/ 

var keyToNote = {}; // C8  == 108
var noteToKey = {}; // 108 ==  C8

(function () {
	var A0 = 0x15; // first note
	var C8 = 0x6C; // last note
	var number2key = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
	for (var n = A0; n <= C8; n++) {
		var octave = (n - 12) / 12 >> 0;
		var name = number2key[n % 12] + octave;
		keyToNote[name] = n;
		noteToKey[n] = name;
	}
})();

/************************************
TODO - generateChords (allows us to adjust the harmonization algorithm)

Given a melody and a time signature (simply quarter notes per measure), return string 
representing chords with duration (e.g. "c4maj,512 a4min,512 f4maj,512 g4maj,512")

Please use the helper function getChord(root,type) written below to do this. 

*************************************/
function generateChords(melody, time)
{
	var chords = [];
	var melody1 = melody.split(' '); 
	for (var i = 0, n = melody1.length; i < n; i++) 
	{
  		var note = melody1[i].split(',') [0];
  		var duration = melody1[i].split(',') [1];
  		//var chord = 
  		chords.push(note + "maj," + duration);
	}
	console.log(chords)
	return chords;
}


/************************************
TODO - parseChords (allows us to adjust chords <-> waltz <-> folk...etc. )

Given something like "c4maj,512 a4min,512 f4maj,512 g4maj,512", converts it to an array 
of 3 separate string, with the first representing the top note...etc. 

For example, the middle string would be: 

"e4,512 c5,512 a4,512 b4,512"

returns that array of 3 strings 
************************************/
function parseChords(chords)
{
	var track1 = [];
	var track2 = [];
	var track3 = [];
	for (var i = 0, n = chords.length; i < n; i++)
	{
		var chord = chords[i].split(',') [0];
  		var duration = chords[i].split(',') [1];
  		var type = chord.substring(chord.length - 3);

  		console.log(root);
  		console.log(type);
  		var root = chord.substring(0, chord.length - 3);
  		var notes = getChord(root,type);
  		track1.push(notes[0] + "," + duration);
  		track2.push(notes[1] + "," + duration);
  		track3.push(notes[2] + "," + duration);
	}
	console.log([track1.join(" "), track2.join(" "), track3.join(" ")]);
	return [track1.join(" "), track2.join(" "), track3.join(" ")];
}


/* 
Given a root note and a type of chord, getChord(root,type) returns an array of length 3 with
the 3 notes in the chord. Currently supports only major, minor, diminished and augmented 
*/ 
function getChord(root, type)
{
	/* 
	Maj 	Root 	4	Major Third 	3 	Fifth 
	Min 	Root 	3   Minor Third 	4	Fifth 
	Dim 	Root 	3 	Minor Third 	3 	Diminished Fifth 
	Aug 	Root    4   Major Third     4   Augmented Fifth 
	*/

	var root_key = keyToNote[root];
	
	var second_key = root_key + ((type == 'maj' || type == 'aug') ? 4 : 3);
	console.log(second_key)
	var third_key = root_key + ((type == 'dim') ? 6 : 7); 

	if (type == 'aug')
	{
		third_key ++; 
	} 
console.log([noteToKey[root_key], noteToKey[second_key], noteToKey[third_key]]);
	return [noteToKey[root_key], noteToKey[second_key], noteToKey[third_key]]; 
}

// listens at this particular port 
var port = 3000; 
app.listen(port);
console.log("Listening on port:" + port);
