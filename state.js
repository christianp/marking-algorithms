Numbas.queueScript('base',[],function() {});
Numbas.queueScript('go',['jme','localisation','jme-variables','marking'],function() {
    function show_state(state) {
        return JSON.stringify(state);
    }

    var marking = Numbas.marking;

    function go(studentAnswer, notes, settings) {
        console.clear();

        var output = document.querySelector('#output tbody');
        var summary = document.getElementById('summary');
        Array.prototype.forEach.call(document.querySelectorAll('.clear'),function(b) {
            b.innerHTML = '';
        });

        var script = new marking.MarkingScript(notes);

        var result = script.evaluate(Numbas.jme.builtinScope,studentAnswer,settings);

        for(var x in result.states) {
            var tr = document.createElement('tr');
            var state = '<ul>'+result.states[x].map(s => '<li>'+JSON.stringify(s)+'</li>').join(' ')+'</ul>';
            var value = result.values[x];
            var display_value = value ? Numbas.jme.display.treeToJME({tok:value}) : '-';
            tr.innerHTML = '<td class="description">'+(script.notes[x].description||x)+'</td><td>'+state+'</td>'+'<td>'+display_value+'</td>';
            output.appendChild(tr);
        }

        var feedback = marking.finalise_state(result.states['mark'] || []);
        summary.querySelector('#valid').innerHTML = feedback.valid ? 'Yes' : 'No';
        summary.querySelector('#credit').innerHTML = feedback.credit;
        summary.querySelector('#messages').innerHTML = feedback.messages.length ? feedback.messages.map(x => '<li>'+x+'</li>').join(' ') : 'none';
        summary.querySelector('#warnings').innerHTML = feedback.warnings.length ? feedback.warnings.map(x => '<li>'+x+'</li>').join(' ') : 'none';

        return result.states;
    }


    var algorithm_input = document.getElementById('algorithm');
    var answer_input = document.getElementById('answer');
    var settings_input = document.getElementById('settings');

    var originals = {
        answer: answer_input.value,
        algorithm: algorithm_input.value,
        settings: settings_input.value
    };

    if(localStorage.algorithm) {
        algorithm_input.value = localStorage.algorithm;
    }
    if(localStorage.answer) {
        answer_input.value = localStorage.answer;
    }
    if(localStorage.settings) {
        settings_input.value = localStorage.settings;
    }
    function update() {
        localStorage.answer = answer_input.value;
        localStorage.algorithm = algorithm_input.value;
        localStorage.settings = settings_input.value;
        var error_box = document.getElementById('error');
        error_box.innerHTML = '';
        error_box.classList.remove('has-error');
        try {
            go(answer_input.value, algorithm_input.value, settings_input.value);
        } catch(e) {
            console.log(e.stack);
            error_box.classList.add('has-error');
            error_box.innerHTML = e.message;
        }
    }
    algorithm_input.addEventListener('input',update);
    answer_input.addEventListener('input',update);
    settings_input.addEventListener('input',update);
    update();

    document.getElementById('reset').addEventListener('click',function() {
        if(confirm("Reset the answer, settings, and marking algorithm fields?")) {
            answer_input.value = originals.answer;
            algorithm_input.value = originals.algorithm;
            settings_input.value = originals.settings;
            update();
        }
    });

    var currentAlgo = null;
    var currentAlgoName = null;

    for(var name in algorithms) {
        var li = document.createElement('li');
        var id = 'algorithm-option-'+name;
        li.innerHTML = '<label for="'+id+'">'+name+'</label> <input id="'+id+'" type="radio" name="algorithm" value="'+name+'">';
        document.querySelector('#algorithm-picker ul#algorithms').appendChild(li);
    }
    document.getElementById('algorithms').addEventListener('change',function() {
        var name = document.querySelector('input[name="algorithm"]:checked').value;
        var algo = algorithms[name];

        var diff = currentAlgo===null || (algorithm_input.value != currentAlgo.script || answer_input.value != currentAlgo.student_answer || settings_input.value != currentAlgo.settings);
        if(diff) {
            if(!confirm('Change to the '+name+' algorithm, and lose your changes?')) {
                document.querySelector('input[name="algorithm"][value="'+currentAlgoName+'"]').checked = true;
                return;
            }
        }
        currentAlgo = algo;
        currentAlgoName = name;

        algorithm_input.value = algo.script;
        answer_input.value = algo.student_answer;
        settings_input.value = algo.settings;
        update();
    });
});
