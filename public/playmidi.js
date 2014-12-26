    <script src="jasmid/stream.js"></script>
    <script src="jasmid/midifile.js"></script>
    <script src="jasmid/replayer.js"></script>
    <script src="jasmid/synth.js"></script>
    <script src="jasmid/audio.js"></script>
    <script>
      function loadRemote(path, callback) {
        var fetch = new XMLHttpRequest();
        fetch.open('GET', path);
        fetch.overrideMimeType("text/plain; charset=x-user-defined");
        fetch.onreadystatechange = function() {
          if(this.readyState == 4 && this.status == 200) {
            /* munge response into a binary string */
            var t = this.responseText || "" ;
            var ff = [];
            var mx = t.length;
            var scc= String.fromCharCode;
            for (var z = 0; z < mx; z++) {
              ff[z] = scc(t.charCodeAt(z) & 255);
            }
            callback(ff.join(""));
          }
        }
        fetch.send();
      }
      
      function play(file) {
        loadRemote(file, function(data) {
          midiFile = MidiFile(data);
          synth = Synth(44100);
          replayer = Replayer(midiFile, synth);
          audio = AudioPlayer(replayer);
        })
      }

      if(FileReader){
        function cancelEvent(e){
          e.stopPropagation();
          e.preventDefault();
        }
        document.addEventListener('dragenter', cancelEvent, false);
        document.addEventListener('dragover', cancelEvent, false);
        document.addEventListener('drop', function(e){
          cancelEvent(e);
          for(var i=0;i<e.dataTransfer.files.length;++i){
            var
              file = e.dataTransfer.files[i]
            ;
            if(file.type != 'audio/midi'){
              continue;
            }
            var
              reader = new FileReader()
            ;
            reader.onload = function(e){
              midiFile = MidiFile(e.target.result);
              synth = Synth(44100);
              replayer = Replayer(midiFile, synth);
              audio = AudioPlayer(replayer);
            };
            reader.readAsBinaryString(file);
          }
        }, false);
      }
    </script>