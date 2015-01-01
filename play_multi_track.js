/***********************************************************************************************



***********************************************************************************************/

function generateMidi(melody, harmonies)
{
	var Midi = require('jsmidgen');
	var fs = require('fs');

	var file = new Midi.File();
	var track = new Midi.Track();
	file.addTrack(track);

	var MAX = 10000; 

	melody = melody.split(" "); 
	melody.push('x,' + MAX);

	for (var i = 0; i < harmonies.length; i++)
	{
		harmonies[i] = harmonies[i].split(' '); 
		harmonies[i].push('x,'+ MAX); 
	}

	harmonies.push(melody); 

	var n = harmonies.length;  
	var events = Array(n);  
	var curr_time = 0; 

	function setup()
	{
		for (var i = 0; i < n; i++)
		{
			var first = harmonies[i].shift(); 
			var noteDuration = first.split(',');
			events[i] = {'note': noteDuration[0], 'end_time': parseInt(noteDuration[1], 10)}; 
			track.noteOn(i, noteDuration[0]);

			console.log('noteOn(' + i + ',' + noteDuration[0] + ')');
		}
	}

	function findMin()
	{
		var min_value = events[0]['end_time'];
		var min_index = 0; 

		for (var i = 1; i < n; i++)
		{
			if (events[i]['end_time'] < min_value)
			{
				min_value = events[i]['end_time']; 
				min_index = i; 
			}
		} 

		if (min_value < MAX)
		{
			return min_index; 
		}
		else 
		{
			return MAX; 
		}
	}

	function remove(index)
	{
		if (index == MAX)
		{
			console.log("END");
			return false; 
		}

		var next = harmonies[index].shift().split(',');


		var removed = events.splice(index, 1)[0]; 
		events.splice(index, 0, {'note': next[0], 'end_time': removed['end_time'] + parseInt(next[1], 10)})

		track.noteOff(index, removed['note'], removed['end_time'] - curr_time); 
		console.log('noteOff(' + index + ',' + removed['note'] + ',' + (removed['end_time'] - curr_time) + ')'); 

		curr_time = removed['end_time']; 

		if (next[0] !='x')
		{
			track.noteOn(index, next[0]); 
			console.log('noteOn(' + index + ',' + next[0]+')'); 
		}	

		return true; 
	}

	setup(); 
	while (remove(findMin()))
	{
		// everything updates in the while loop
	}

	fs.writeFileSync('./mid/test.mid', file.toBytes(), 'binary');
}

module.exports = generateMidi; 