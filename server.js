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
	var harmonyType= req.body.harmonyType;
	console.log(req.body.harmonyType);

	// generates the melody file
	generate(melody, ["c9,64"], 'melody.mid');

	// generates the harmony file
	var harmony = (parseChords(generateChords(melody, time,harmonyType)));
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

function checkNotes(notes, chord)
{
	var chordNotes =
	{
		'I': "C,E,G",
		'i': "C,Eb,G",
		'II': "D,Gb,A",
		'ii': "D,F,A",
		'III': "E,Ab,B",
		'iii': "E,G,B",
		'IV': "F,A,C",
		'iv': "F,Ab,C",
		'V': "G,B,D",
		'v': "G,Bb,D",
		'VI': "A,Db,E",
		'vi': "A,C,E",
		'VII': "B,Eb,Gb",
		'vii': "B,D,F"
	}
	var matches = 0;
	var checkNotes = chordNotes[chord];
	for (var i = 0, n = notes.length; i < n; i++)
	{
		if (checkNotes.indexOf(notes[i].substring(0,notes[i].length - 1)) > 0)
		{
			matches++;
		}
	}
	console.log(matches);
	return matches;
}

function chooseChord(notes, prevChord)
{
		var chordProgMaj =
		{
			'I': "I,V,IV,vi",
			'ii': "ii,V,IV,vi",
			'iii': "iii,IV,vi",
			'IV': "IV,I,V,vi,ii",
			'V': "V,I,vi,IV",
			'vi': "vi,V,IV,ii,iii",
			'vii': "vii,V,I"
		}

	var possibleChords = [];
	var choiceChords = chordProgMaj[prevChord].split(',');
	for (var i = 0, n = choiceChords.length; i < n; i++)
	{
		var curChord = choiceChords[i];
		var matches = checkNotes(notes, curChord);
		if(matches > 0)
		{
			possibleChords.push(curChord + "," + matches);
		}
	}
	var chosenOne = "I";
	var matchedNotes = 0;
	if(possibleChords)
	{
		for (var i = 0, n = possibleChords.length; i < n; i++)
		{
			if (possibleChords[i].split(',')[1] > matchedNotes)
			{
				chosenOne = possibleChords[i].split(',')[0];
				matchedNotes = possibleChords[i].split(',')[1];
			}
		}
	}
	console.log("chosen One");
	console.log(chosenOne);
	return chosenOne;
}

/************************************
TODO - generateChords (allows us to adjust the harmonization algorithm)

Given a melody and a time signature (simply quarter notes per measure), return string 
representing chords with duration (e.g. "c4maj,512 a4min,512 f4maj,512 g4maj,512")

Please use the helper function getChord(root,type) written below to do this. 

*************************************/
function generateChords(melody, time, type)
{
	var chordFromRoman =
	{
		'I': "C3maj",
		'i': "C3min",
		'II': "D3maj",
		'ii': "D3min",
		'III': "E3maj",
		'iii': "E3min",
		'IV': "F3maj",
		'iv': "F3min",
		'V': "G3maj",
		'v': "G3min",
		'VI': "A3maj",
		'vi': "A3min",
		'VII': "B3maj",
		'vii': "B3min"
	}
	var chords = [];
	var melody1 = melody.split(' ');
	if(type == "byNote")
	{
		for (var i = 0, n = melody1.length; i < n; i++)
		{
			var note = melody1[i].split(',') [0];
			var duration = melody1[i].split(',') [1];
			chords.push(note + "maj," + duration);
		}
	}
	else if(type == "byMeasure")
	{
		var firstMeasure = true;
		var measureLength = time * 128;
		var notesLength = 0;
		var measureNotes = [];
		var prevChord = "I";
		var nextChord = "I";
		for (var i = 0, n = melody1.length; i < n; i++)
		{
			measureNotes.push(melody1[i].split(',') [0]);
			notesLength += parseInt(melody1[i].split(',')[1],10);
			if (notesLength >= measureLength)
			{
				if (firstMeasure == true)
				{
					chords.push("C3maj," + measureLength);
					firstMeasure = false;
				}
				else
				{
					nextChord = chooseChord(measureNotes, prevChord);
					chords.push(chordFromRoman[nextChord] + "," + measureLength);
					prevChord = nextChord;
				}

				measureNotes = [];
				if (notesLength > measureLength)
				{
					measureNotes.push(melody1[i].split(',') [0]);
				}
				notesLength -= measureLength;

			}
		}
	}
	console.log(chords);
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
