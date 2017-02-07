## Student answer

```
"sin(x)"
```

## Settings

```
{
    "correctAnswer": "sin(x)",
    "vRangeMin": -1,
    "vRangeMax": 1,
    "checkingType": "absdiff",
    "checkingAccuracy": 0.00001,
    "maxFails": 0,
    "expectedVariables": ["x"],
    "minLength": 0,
    "minLengthPC": 0.5,
    "maxLength": 200,
    "maxLengthPC": 0.5,
    "forbiddenStrings": [],
    "forbiddenStringsPC": 0.5,
    "requiredStrings": ["x"],
    "requiredStringsPC": 0.5
}
```

## Marking script

```
studentExpr (The student's answer, parsed): 
    try(
        simplify(parse(studentAnswer),[])
    ,
        fail("Your answer is not a valid mathematical expression")
    )

cleanedStudentString (The student's answer as a string, cleaned up): string(studentExpr)

scope_vars (Variables already defined in the scope): 
    definedvariables()

studentVariables (Variables used in the student's answer): 
    set(findvars(studentExpr))-set(scope_vars)

unexpectedVariables (Unexpected variables used in the student's answer):
    let(uvars, filter(not (x in settings["expectedVariables"]),x,list(studentVariables)),
        assert(len(settings["expectedVariables"])=0 or len(uvars)=0,
            warn("You used the unexpected variable "+uvars[0])
        );
        uvars
    )

failMinLength (Is the student's answer too short?):
    assert(settings["minLength"]=0 or len(cleanedStudentString)>=settings["minLength"],
        multiply_credit(settings["minLengthPC"],"Your answer is too short");
        true
    )

failMaxLength:
    assert(settings["maxLength"]=0 or len(cleanedStudentString)<=settings["maxLength"],
        multiply_credit(settings["maxLengthPC"],"Your answer is too long");
        true
    )

forbiddenStrings:
    filter(x in cleanedStudentString, x, settings["forbiddenStrings"])

forbiddenStringsPenalty:
    assert(len(forbiddenStrings)=0,
        multiply_credit(settings["forbiddenStringsPC"],"Your answer contains the forbidden string <code>"+forbiddenStrings[0]+"</code>")
    )

requiredStrings:
    filter(not (x in cleanedStudentString), x, settings["requiredStrings"])

requiredStringsPenalty:
    assert(len(requiredStrings)=0,
        multiply_credit(settings["requiredStringsPC"],"Your answer does not  contain the required string <code>"+requiredStrings[0]+"</code>")
    )

correctExpr (The correct answer, parsed): 
    parse(settings["correctAnswer"])

correctVars (Variables used in the correct answer): 
    set(findvars(correctExpr))-set(scope_vars)

vRange (The range to pick variable values from): settings["vRangeMin"]..settings["vRangeMax"]#0

vset (The sets of variable values to test against):
    repeat(
        dict(map([x,random(vRange)],x,correctVars or studentVariables)),
        5
    )

agree (Do the student's answer and the expected answer agree on each of the sets of variable values?):
    map(
        resultsEqual(eval(studentexpr,vars),eval(correctexpr,vars),settings["checkingType"],settings["checkingAccuracy"]),
        vars,
        vset
    )

numFails (The number of times the student's answer and the expected answer disagree): 
    len(filter(not x,x,agree))

numericallyCorrect (Is the student's answer numerically correct?):
    if(numFails<=settings["maxFails"],
        correct("Your answer is numerically correct")
    ,
        incorrect("Your answer is incorrect")
    )

sameVars (Does the student use the same variables as the correct answer?):
    if(studentVariables=correctVars,
        true
    ,
        incorrect("Your answer is incorrect");
        end();
        false
    )

mark:
    apply(studentExpr);
    apply(unexpectedVariables);
    apply(sameVars);
    apply(numericallyCorrect);
    apply(failMinLength);
    apply(failMaxLength);
    apply(forbiddenStringsPenalty);
    apply(requiredStringsPenalty)

as_jme:
    studentExpr
```
