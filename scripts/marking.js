Numbas.queueScript('marking',['jme','localisation','jme-variables'],function() {
    var marking = Numbas.marking = {};

    var jme = Numbas.jme;
    var math = Numbas.math;

    var TString = jme.types.TString;
    var TList = jme.types.TList;
    var TName = jme.types.TName;
    var TNum = jme.types.TNum;
    var TBool = jme.types.TBool;

    function state_fn(name, args, outtype, fn) {
        return new jme.funcObj(name,args,outtype,null,{
            evaluate: function(args, scope) {
                if(jme.lazyOps.contains(name)) {
                    var res = fn.apply(this, arguments);
                } else {
                    var res = fn.apply(this, args.map(jme.unwrapValue));
                }
                var p = scope;
                while(p.state===undefined) {
                    p = p.parent;
                }
                p.state = p.state.concat(res.state);
                return jme.wrapValue(res.return);
            }
        });
    }

    var state_functions = [];

    state_functions.push(state_fn('correct',[TString],TBool,function(message) {
        return {
            return: true,
            state: [{type:"set_credit", credit:1, message:message}]
        };
    }));

    state_functions.push(state_fn('incorrect',[TString],TBool,function(message) {
        return {
            return: false,
            state: [{type:"set_credit", credit:0, message:message}]
        };
    }));

    state_functions.push(state_fn('set_credit',[TNum,TString],TNum,function(n, message) {
        return {
            return: n,
            state: [{type:"set_credit", credit:n, message: message}]
        }
    }));

    state_functions.push(state_fn('multiply_credit',[TNum,TString],TNum,function(n, message) {
        return {
            return: n,
            state: [{type:"multiply_credit", factor: n, message: message}]
        }
    }));

    state_functions.push(state_fn('add_credit',[TNum,TString],TNum,function(n, message) {
        return {
            return: n,
            state: [{type:"add_credit", credit:n, message: message}]
        }
    }));

    state_functions.push(state_fn('sub_credit',[TNum,TString],TNum,function(n, message) {
        return {
            return: n,
            state: [{type:"sub_credit", credit:n, message: message}]
        }
    }));

    state_functions.push(state_fn('end',[],TBool,function() {
        return {
            return: true,
            state: [{type:"end"}]
        }
    }));

    state_functions.push(state_fn('fail',[TString],TString,function(message) {
        return {
            return: message,
            state: [
                {type:"set_credit", credit:0, message:message},
                {type:"end", invalid:true}
            ]
        };
    }));

    state_functions.push(state_fn('warn',[TString],TString,function(message) {
        return {
            return: message,
            state: [{type:"warning", message: message}]
        }
    }));

    state_functions.push(state_fn('feedback',[TString],TString,function(message) {
        return {
            return: message,
            state: [{type:"feedback", message: message}]
        }
    }));

    state_functions.push(new jme.funcObj(';',['?','?'],'?',null, {
        evaluate: function(args,cope) {
            return args[1];
        }
    }));

    state_functions.push(state_fn('apply',[TName],TName,function(args,scope) {
        var name = args[0].tok.name.toLowerCase();
        return {
            return: args[0].tok,
            state: scope.states[name] || []
        };
    }));
    jme.lazyOps.push('apply');
    jme.substituteTreeOps.apply = function(tree,scope,allowUnbound) {
        return tree;
    }


    var StatefulScope = function() {
        this.new_state = true;
        this.state = [];
        this.states = {};
        this.state_valid = {};

        var scope = this;
        state_functions.forEach(function(fn) {
            scope.addFunction(fn);
        });
    }
    StatefulScope.prototype = {
        evaluate: function(expr, variables) {
            var is_top = this.state===undefined || this.new_state;
            this.new_state = false;

            var old_state = is_top ? [] : (this.state || []);
            this.state = [];

            try {
                var v = jme.Scope.prototype.evaluate.apply(this,[expr, variables]);
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
    StatefulScope = marking.StatefulScope = Numbas.util.extend(jme.Scope,StatefulScope);

    var re_note = /^((?:\$?[a-zA-Z_][a-zA-Z0-9_]*'*)|\?\??)(?:\s*\(([^)]*)\))?\s*:\s*((?:.|\n)*)$/m;
    var MarkingNote = marking.MarkingNote = function(source) {
        var m = re_note.exec(source.trim());
        if(!m) {
            throw(new Numbas.Error("marking.note.invalid definition",{source: source}));
        }
        this.name = m[1];
        this.description = m[2];
        this.expr = m[3];
        try {
            this.tree = jme.compile(this.expr);
        } catch(e) {
            throw(new Numbas.Error("marking.note.compilation error",{name:name, message:e.message}));
        }
        this.vars = jme.findvars(this.tree);
    }

    var MarkingScript = marking.MarkingScript = function(source) {
        try {
            var notes = source.split(/\n(\s*\n)+/);
            var todo = {};
            notes.forEach(function(note) {
                if(note.trim().length) {
                    var res = new MarkingNote(note);
                    todo[res.name.toLowerCase()] = res;
                }
            });
        } catch(e) {
            throw(new Numbas.Error("marking.script.error parsing notes",{message:e.message}));
        }
        this.notes = todo;
    }
    MarkingScript.prototype = {
        evaluate: function(scope, studentAnswer, settings) {
            scope = new StatefulScope([
                scope, 
                {
                    variables: {
                        studentanswer: jme.builtinScope.evaluate(studentAnswer),
                        settings: jme.wrapValue(JSON.parse(settings))
                    }
                }
            ]);

            var result = jme.variables.makeVariables(this.notes,scope,null,compute_note);

            return {states: scope.states, values: result.variables, scope: result.scope};
        }
    }

    var compute_note = marking.compute_note = function(name,todo,scope) {
        if(scope.getVariable(name)) {
            return;
        } 
        if(!scope.states[name]) {
            try {
                var res = jme.variables.computeVariable.apply(this,arguments);
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
    }

    marking.finalise_state = function(states) {
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
});
