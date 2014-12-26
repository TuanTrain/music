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

var generated = false; 

// sets the format of the rendered pages to ejs
app.set('view engine', 'ejs');
app.set('view options', { layout: false });

// makes the following folders accessible to all GET requests 
app.use('/jasmid', express.static('jasmid'));
app.use('/public', express.static('public'));
app.use('/mid', express.static('mid'));

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
	res.render('index', {generated: true});

}); 

// not sure if needed
app.get('/generate', function(req, res){
	res.redirect('index'); 
})

// generates the midi file from a given pattern
function generatePattern(pattern)
{
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

	pattern = pattern.split(','); 

	console.log(pattern); 

	for (var i = 0; i < pattern.length; i++)
	{
		track.addNote(0, pattern[i], 128); 
	}

	fs.writeFileSync('./mid/test.mid', file.toBytes(), 'binary');
	generated = true; 
}

// listens at this particular port 
var port = 3000; 
app.listen(port);
console.log("Listening on port:" + port);
