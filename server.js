/* 

server.js  

Creates a server which handles requests and generates an appropriate .mid file 
based on the user's input. 

*/

// allows dynamic rendering of .ejs (embedded Javascript) pages
var express = require('express');
var app = express();

// saves files to server
var fs = require('fs');

// generates 
var Midi = require('jsmidgen');

// let's us determine whether or not to delete the previous midi 
var generated = false; 

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
app.use('/build', express.static('build')); 
app.use('/generator', express.static('generator')); 

// no clue
app.use(express.bodyParser());
app.use(app.router);

// when the user GETs the homepage, render index(.ejs) 
app.get('/', function (req, res) {

  	res.render('index', { generated: false });
});

// when the user POSTS to generate, generate the pattern, save it to the server, and 
app.post('/generate', function(req, res){
 
	generatePattern(req.body.pattern); 
	res.redirect('/')

}); 

app.get('/download', function(req, res){
  	res.download('./mid/test.mid', 'yourMusic.mid'); // Set disposition and send it.
  	// res.redirect('/');
});

// not sure if needed
app.get('/generate', function(req, res){
	res.redirect('/'); 
})

// generates the midi file from a given pattern
function generatePattern(pattern)
{
	// remove previous copy of the file 
	if (generated)
	{
		fs.unlink('./mid/test.mid', function(err){
			if (err) throw err; 
			console.log('removed previous'); 
		});
	}	

	var file = new Midi.File();
	var track = new Midi.Track();
	file.addTrack(track);

	pattern = pattern.split(' ');

	console.log(pattern);

	for (var i = 0; i < pattern.length; i++)
	{
		var pair = pattern[i].split(',');
		var note = pair[0]; 
		var duration = pair[1]; 

		console.log(note);
		console.log(duration);

		track.addNote(0, note, duration); 
	}

	fs.writeFileSync('./mid/test.mid', file.toBytes(), 'binary');
	generated = true; 
}

// listens at this particular port 
var port = 3000; 
app.listen(port);
console.log("Listening on port:" + port);
