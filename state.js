Numbas.queueScript('base',[],function() {});
Numbas.queueScript('go',['jme','localisation','jme-variables'],function() {
    var jme = Numbas.jme;
    var math = Numbas.math;

    function StatefulScope() {
        this.new_state = true;
        this.state = [];
        this.states = {};
        this.state_valid = {};
    }
    StatefulScope.prototype = {
        evaluate: function(expr, variables) {
            var is_top = this.state===undefined || this.new_state;
            this.new_state = false;

            var old_state = is_top ? [] : (this.state || []);
            this.state = [];

            try {
                var v = Numbas.jme.Scope.prototype.evaluate.apply(this,[expr, variables]);
            } catch(e) {
                this.new_state = true;
                throw(e);
            }

            this.state = old_state.concat(this.state);

            if(is_top) {
                this.new_state = true;
            }

            return v;
        }
    }
    StatefulScope = Numbas.util.extend(Numbas.jme.Scope,StatefulScope);

    function show_state(state) {
        return JSON.stringify(state);
    }

    var stateful_scope = window.scope = new StatefulScope(Numbas.jme.builtinScope);

    var TString = Numbas.jme.types.TString;
    var TList = Numbas.jme.types.TList;
    var TName = Numbas.jme.types.TName;
    var TNum = Numbas.jme.types.TNum;
    var TBool = Numbas.jme.types.TBool;

    function state_fn(name, args, outtype, fn) {
        return new Numbas.jme.funcObj(name,args,outtype,null,{
            evaluate: function(args, scope) {
                if(jme.lazyOps.contains(name)) {
                    var res = fn.apply(this, arguments);
                } else {
                    var res = fn.apply(this, args.map(Numbas.jme.unwrapValue));
                }
                var p = scope;
                while(p.state===undefined) {
                    p = p.parent;
                }
                p.state = p.state.concat(res.state);
                return Numbas.jme.wrapValue(res.return);
            }
        });
    }

    scope.addFunction(state_fn('correct',[TString],TBool,function(message) {
        return {
            return: true,
            state: [{type:"set_credit", credit:1, message:message}]
        };
    }));

    scope.addFunction(state_fn('incorrect',[TString],TBool,function(message) {
        return {
            return: false,
            state: [{type:"set_credit", credit:0, message:message}]
        };
    }));

    scope.addFunction(state_fn('set_credit',[TNum,TString],TNum,function(n, message) {
        return {
            return: n,
            state: [{type:"set_credit", credit:n, message: message}]
        }
    }));

    scope.addFunction(state_fn('multiply_credit',[TNum,TString],TNum,function(n, message) {
        return {
            return: n,
            state: [{type:"multiply_credit", factor: n, message: message}]
        }
    }));

    scope.addFunction(state_fn('add_credit',[TNum,TString],TNum,function(n, message) {
        return {
            return: n,
            state: [{type:"add_credit", credit:n, message: message}]
        }
    }));

    scope.addFunction(state_fn('sub_credit',[TNum,TString],TNum,function(n, message) {
        return {
            return: n,
            state: [{type:"sub_credit", credit:n, message: message}]
        }
    }));

    scope.addFunction(state_fn('end',[],TBool,function() {
        return {
            return: true,
            state: [{type:"end"}]
        }
    }));

    scope.addFunction(state_fn('fail',[TString],TString,function(message) {
        return {
            return: message,
            state: [
                {type:"set_credit", credit:0, message:message},
                {type:"end", invalid:true}
            ]
        };
    }));

    scope.addFunction(state_fn('warn',[TString],TString,function(message) {
        return {
            return: message,
            state: [{type:"warning", message: message}]
        }
    }));

    scope.addFunction(state_fn('feedback',[TString],TString,function(message) {
        return {
            return: message,
            state: [{type:"feedback", message: message}]
        }
    }));

    scope.addFunction(new Numbas.jme.funcObj(';',['?','?'],'?',null, {
        evaluate: function(args,cope) {
            return args[1];
        }
    }));

    scope.addFunction(state_fn('apply',[TName],TName,function(args,scope) {
        var name = args[0].tok.name.toLowerCase();
        return {
            return: args[0].tok,
            state: scope.states[name] || []
        };
    }));
    Numbas.jme.lazyOps.push('apply');
    jme.substituteTreeOps.apply = function(tree,scope,allowUnbound) {
        return tree;
    }


    function makeNote(note) {
        var re_note = /^((?:\$?[a-zA-Z_][a-zA-Z0-9_]*'*)|\?\??)(?:\s*\(([^)]*)\))?\s*:\s*((?:.|\n)*)$/m;
        var m = re_note.exec(note.trim());
        if(!m) {
            throw(new Numbas.Error("Invalid note definition:\n"+note));
        }
        var name = m[1];
        var description = m[2];
        var expr = m[3];
        try {
            var tree = Numbas.jme.compile(expr);
        } catch(e) {
            throw(new Numbas.Error("Error making note "+name+": "+e.message));
        }
        return {
            name: name,
            description: description,
            tree: tree,
            vars: Numbas.jme.findvars(tree)
        }
    }

    function go(studentAnswer, notes, settings) {
        console.clear();

        var output = document.querySelector('#output tbody');
        var summary = document.getElementById('summary');
        Array.prototype.forEach.call(document.querySelectorAll('.clear'),function(b) {
            b.innerHTML = '';
        });

        try {
            notes = notes.split(/\n(\s*\n)+/);
            var todo = {};
            notes.forEach(function(note) {
                if(note.trim().length) {
                    var res = makeNote(note);
                    todo[res.name.toLowerCase()] = res;
                }
            });
        } catch(e) {
            throw(new Numbas.Error("Error parsing notes\n"+e.message));
        }

        try {
            var scope = new StatefulScope([
                stateful_scope, 
                {
                    variables: {
                        studentanswer: Numbas.jme.builtinScope.evaluate(studentAnswer),
                        settings: Numbas.jme.wrapValue(JSON.parse(settings))
                    }
                }
            ]);

            var result = jme.variables.makeVariables(todo,scope,null,function(name,todo,scope) {
                if(scope.getVariable(name)) {
                    return;
                } 
                if(!scope.states[name]) {
                    try {
                        var res = Numbas.jme.variables.computeVariable.apply(this,arguments);
                        scope.setVariable(name, res);
                        scope.state_valid[name] = true;
                        for(var i=0;i<scope.state.length;i++) {
                            if(scope.state[i].type=='end' && scope.state[i].invalid) {
                                scope.state_valid[name] = false;
                                break;
                            }
                        }
                    } catch(e) {
                        var invalid_dep = null;
                        for(var x of todo[name].vars) {
                            if(x in todo) {
                                if(!scope.state_valid[x]) {
                                    invalid_dep = x;
                                    break;
                                }
                            }
                        }
                        if(invalid_dep) {
                            scope.state_valid[name] = false;
                        } else {
                            throw(new Error("Error evaluating note <code>"+name+"</code> - "+e.message));
                        }
                    }
                    scope.states[name] = scope.state.slice().map(function(s){s.note = s.note || name; return s});
                }
                return scope.variables[name];
            });
        } catch(e) {
            throw(e);
        }
        for(var x in scope.states) {
            var tr = document.createElement('tr');
            var state = '<ul>'+scope.states[x].map(s => '<li>'+JSON.stringify(s)+'</li>').join(' ')+'</ul>';
            var value = scope.getVariable(x);
            var display_value = value ? Numbas.jme.display.treeToJME({tok:value}) : '-';
            tr.innerHTML = '<td class="description">'+(todo[x].description||x)+'</td><td>'+state+'</td>'+'<td>'+display_value+'</td>';
            output.appendChild(tr);
        }

        var result = finalise_state(scope.states['mark'] || []);
        summary.querySelector('#valid').innerHTML = result.valid ? 'Yes' : 'No';
        summary.querySelector('#credit').innerHTML = result.credit;
        summary.querySelector('#messages').innerHTML = result.messages.length ? result.messages.map(x => '<li>'+x+'</li>').join(' ') : 'none';
        summary.querySelector('#warnings').innerHTML = result.warnings.length ? result.warnings.map(x => '<li>'+x+'</li>').join(' ') : 'none';

        return scope.states;
    }

    function finalise_state(states) {
        var credit = 0;
        var messages = [];
        var warnings = [];
        var valid = true;
        var end = false;
        for(var i=0;i<states.length;i++) {
            var state = states[i];
            var old_credit = credit;
            var message = null;
            switch(state.type) {
                case 'set_credit':
                    credit = state.credit;
                    message = state.message;
                    break;
                case 'multiply_credit':
                    credit *= state.factor;
                    message = state.message;
                    break;
                case 'add_credit':
                    credit += state.credit;
                    message = state.message;
                    break;
                case 'sub_credit':
                    credit += state.credit;
                    message = state.message;
                    break;
                case 'end':
                    end = true;
                    if(state.invalid) {
                        valid = false;
                    }
                    break;
                case 'warning':
                    warnings.push(state.message);
                    break;
                case 'feedback':
                    message = state.message;
                    break;
            }
            if(end) {
                break;
            }
            var credit_message = null;
            if(credit != old_credit) {
                var diff = credit-old_credit;
                credit_message = diff > 0 ? 'You were awarded '+diff+' marks' : (-diff)+' marks were taken away';
            }
            if(credit_message || message) {
                message = (message || '')+(credit_message ? '<br><strong>'+credit_message+'</strong>' :'');
                messages.push(message);
            }
        }
        return {
            messages: messages,
            credit: credit,
            warnings: warnings,
            valid: valid
        }
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
