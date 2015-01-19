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
	var melody1 = req.body.pattern;
	var time = parseInt(req.body.time, 10);
	var harmonyType = req.body.harmonyType;
	var chordQuality = req.body.chordQuality;
	// input transpose
	var stept = parseInt(req.body.transpose, 10);

	var melody = transposeNotes(melody1, stept);
	console.log(req.body.harmonyType);
	// steps of this key from C
	var step = findKey(melody, chordQuality);
	melody = transposeNotes(melody, -step);
	console.log("step!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!" + step);


	// generates the harmony file
	var harmony = (parseChords(transposeChord(generateChords(melody, time,harmonyType,chordQuality), step)));
	melody = transposeNotes(melody, step);

	// generates the melody file
	generate(melody, ["c9,64"], 'melody.mid');
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
		'II': "D,F,Ab",
		'ii': "D,F,A",
		'III': "E,Ab,B",
		'iii': "Eb,G,Bb",
		'IV': "F,A,C",
		'iv': "F,Ab,C",
		'V': "G,B,D",
		'v': "G,Bb,D",
		'VI': "Ab,C,Eb",
		'vi': "A,C,E",
		'VII': "Bb,D,F",
		'vii': "B,D,F"
	}
	var matches = 0;
	var checkNotes = chordNotes[chord];
	for (var i = 0, n = notes.length; i < n; i++)
	{
		if (checkNotes.indexOf(notes[i].substring(0,notes[i].length - 1)) >= 0)
		{
			matches++;
		}
	}

	return matches;
}

function chooseChord(notes, prevChord, quality)
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
	var chordProgMin =
	{
		'i': "i,v,iv,VI",
		'II': "II,v,iv,VI",
		'III': "III,iv,VI",
		'iv': "iv,i,v,VI,II",
		'v': "v,i,VI,iv",
		'VI': "VI,v,iv,II,III",
		'VII': "VII,v,i"
	}

	var possibleChords = [];
	var choiceChords;
	if (quality == "maj")
	{
		choiceChords = chordProgMaj[prevChord].split(',');
	}
	else
	{
		choiceChords = chordProgMin[prevChord].split(',');
	}
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

	return chosenOne;
}

/************************************
 TODO - generateChords (allows us to adjust the harmonization algorithm)

 Given a melody and a time signature (simply quarter notes per measure), return string
 representing chords with duration (e.g. "c4maj,512 a4min,512 f4maj,512 g4maj,512")

 Please use the helper function getChord(root,type) written below to do this.

 *************************************/
function generateChords(melody, time, type, quality)
{
	var chordFromRoman =
	{
		'I': "C3maj",
		'i': "C3min",
		'II': "D3dim",
		'ii': "D3min",
		'III': "Eb3maj",
		'iii': "E3min",
		'IV': "F3maj",
		'iv': "F3min",
		'V': "G3maj",
		'v': "G3min",
		'VI': "Ab3maj",
		'vi': "A3min",
		'VII': "Bb3maj",
		'vii': "B3dim"
	}
	var noteToChord =
	{
		'C': "C3maj",
		'D': "D3min",
		'E': "E3min",
		'F': "F3maj",
		'G': "G3min",
		'A': "A3min",
		'B': "B3dim"
	}
	var chords = [];
	var melody1 = melody.split(' ');
	if(type == "byNote")
	{
		for (var i = 0, n = melody1.length; i < n; i++)
		{
			var note = melody1[i].split(',')[0];
			bnote = note.substring(0, note.length - 1);
			var duration = melody1[i].split(',') [1];
			chords.push(noteToChord[bnote] + "," + duration);
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
		var rootChord = "C3maj,";
		if (quality == "min")
		{
			prevChord = "i";
			nextChord = "i";
			rootChord = "C3min,";
		}
		for (var i = 0, n = melody1.length; i < n; i++)
		{
			measureNotes.push(melody1[i].split(',') [0]);
			notesLength += parseInt(melody1[i].split(',')[1],10);
			if (notesLength >= measureLength)
			{
				if (firstMeasure == true)
				{
					chords.push(rootChord + measureLength);
					firstMeasure = false;
				}
				else
				{
					nextChord = chooseChord(measureNotes, prevChord, quality);
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
		if (notesLength > 0)
		{
			chords.push(rootChord + notesLength);
		}
		else
		{
			chords.pop();
			chords.push(rootChord + measureLength);
		}
	}
	console.log("chord output: " + chords);
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

function findKey (melody, quality)
{
	var note2num = {'C': 0, 'Db': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5, 'Gb': 6, 'G': 7, 'Ab': 8, 'A': 9, 'Bb': 10, 'B': 11};
	var count = [0,0,0,0,0,0,0,0,0,0,0,0];
	var key;
	if (quality == "maj")
	{
		key = [0,2,4,5,7,9,11];
	}
	if (quality == "min")
	{
		key = [0,2,3,5,7,8,10]
	}

	melody = melody.split(" ");
	console.log("melody " + melody);
	for (var i = 0, n = melody.length; i < n; i++)
	{
		var note = melody[i].split(",")[0];
		note = note.substring(0, note.length - 1);
		var index = note2num[note];
		count[index]++;
	}

	console.log("count: " + count);

	var chosenKey = 0;
	var maxMatch = 0;
	var amount;
	// go through 12 keys
	for (var i = 0; i < 12; i++)
	{
		amount = 0;

		// add up amount of keys that fit
		for (var j = 0; j < 7; j++)
		{
			// root note counts thrice
			if (j == 0)
			{
				amount += count[key[j]] * 2;
			}

			amount += count[key[j]];
		}

		// if best fit so far, replace chosen
		if (amount > maxMatch)
		{
			chosenKey = i;
			maxMatch = amount;
		}
		console.log("amount matched " + i + "   " + amount);
		// update for next key to check
		for(var j = 0; j < 7; j++)
		{
			key[j] = (key[j] + 1) % 12;
		}
	}

	return chosenKey;

}

function transposeNotes(melody, step)
{
	melody = melody.split(" ");
	var transposed = [];
	var len = melody.length;
	var note2num = {'C': 0, 'Db': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5, 'Gb': 6, 'G': 7, 'Ab': 8, 'A': 9, 'Bb': 10, 'B': 11};
	var notes = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
	for(var i = 0; i < len; i++)
	{
		var noteInfo = melody[i].split(",")[0];
		var note = noteInfo.substring(0, noteInfo.length - 1);
		var octave = noteInfo.substring(noteInfo.length - 1);
		var duration = melody[i].split(",")[1];
		var newNote = parseInt(note2num[note],10) + step;
		if (newNote > 11)
		{
			octave++;
		}
		if (newNote < 0)
		{
			octave--;
			newNote += 12;
		}
		transposed.push(notes[newNote%12] + octave + ',' + duration);
	}
	transposed = transposed.join(" ");
	console.log("transposed:  " + transposed);
	return transposed;
}



function transposeChord(chords, step)
{
	var transposed = [];
	var len = chords.length;
	var note2num = {'C': 0, 'Db': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5, 'Gb': 6, 'G': 7, 'Ab': 8, 'A': 9, 'Bb': 10, 'B': 11};
	var notes = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
	for(var i = 0; i < len; i++)
	{
		var chordInfo = chords[i].split(",")[0];
		var chord = chordInfo.substring(0, chordInfo.length - 4);
		var type = chordInfo.substring(chordInfo.length - 3);
		var duration = chords[i].split(",")[1];
		var newChord = parseInt(note2num[chord],10) + step;
		transposed.push(notes[newChord%12] + '3' + type + ',' + duration);
	}
	//transposed = transposed.join(" ");
	console.log("chords !!! : " + transposed);
	return transposed;
}

// listens at this particular port 
var port = 3000;
app.listen(port);
console.log("Listening on port:" + port);
