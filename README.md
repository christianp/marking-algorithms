# A language for defining marking algorithms

A marking algorithm is a set of *notes*.

A note is a name, an optional description, and a list of procedures.

Applying a procedure returns a JME value *or* an operation on the state.

The state is a stack of credit/validation/feedback instructions. 
The only operation is to append instructions to the stack.

Evaluating a note consists of applying all of its procedures, and storing the final JME value and state.

Execution order of the notes is determined by dependency.

## Special notes

The following notes are required:

* `mark` - The state at the end of this note will be used to find the student's final score and feedback.
* `as_jme` - The student's answer, as a JME value which can be used in adaptive marking or by other parts.

## State operations

These operations are implemented as functions which return a list of state instruction tokens.

* `set_credit(n,message)` - Set the credit to n, and add a feedback message explaining why
* `multiply_credit(n,message)` - Multiply the credit by n, and add a feedback message explaining why
* `add_credit(n,message)` - Add n to the credit, and add a feedback message explaining why
* `sub_credit(n,message)` - Subtract n from the credit, and add a feedback message explaining why
* `correct(message)` - Set the credit to 1, and add a feedback message explaining why
* `incorrect(message)` - Set the credit to 0, and add a feedback message explaining why
* `end` - End the evaluation here, and don't continue evaluating any other notes which depend on this one
* `fail(message)` - End the evaluation here, set credit to 0, mark the student's answer as invalid, and add a feedback message explaining why
* `assert(test, otherwise)` - If `test` is false, apply `otherwise`
* `warn(message)` - Display a warning next to the input box
* `get_answer(part)` - Get the student's answer to the given part. The reference can be relative, e.g. `g0` will get this part's first gap, while `p0g0` will get the first gap in the first part in the question.
* `mark_part(part)` - Apply the given part's marking algorithm, and return its final state.
* `feedback(message)` - Give the student some feedback
* `apply(state, [title])` - Append the given state (from another note, for example) to the current state. If a title is given, all the applied feedback messages will be grouped under that title.

## Inputs

The following variables and functions are available at any point:

* `studentAnswer` - the student's answer, exactly as they entered it
* `setting(name)` - get the part setting with the given name, e.g. `correctAnswer`, `maxLength`.

## Example

### Mathematical expression

```
simplifiedAnswer (The student's answer, simplified): 
    simplify(studentAnswer,'')

vars (Variables used in the student's answer): 
    findvars(simplifiedAnswer)

unexpected_vars (Unexpected variables used in the student's answer):
    filter(x not in setting('expected_vars'), x, vars)

failMaxLength (Is the student's answer too long?):
    if(len(simplifiedAnswer) > setting('maxLength'),
        warn("Your answer is too long");
        multiply_credit(setting('maxlength_credit'),setting('maxlength_warning'))
        true
    ,
        false
    )


failMinLength (Is the student's answer too short?):
    if(len(simplifiedAnswer) < setting('minLength'),
        warn(setting('minlength_warning'));
        multiply_credit(setting('minlength_credit'),setting('minlength_warning'))
        true
    ,
        false
    )

equal (Is the student's answer numerically equivalent to the expected answer?): 
    if(compare(simplifiedAnswer, setting('correctAnswer'), ...),
        correct("Your answer is numerically correct");
        true,
    // otherwise
        incorrect("Your answer is not numerically correct"); 
        end()
    )

forbiddenStrings_used (Forbidden strings present in the student's answer): 
    let(used, filter(x in simplifiedAnswer, x, setting('forbidden_strings')),
        if(len(used)>0,
            warn(setting('forbiddenString_warning';
            multiply_credit( setting('forbiddenString_credit'), setting('forbiddenString_warning'));
            true
        ,
            false
        )
    )

requiredStrings_not_used (Required strings not present in the student's answer): 
    let(used, filter(not (x in simplifiedAnswer), x, setting('required_strings')),
        if(len(used)>0,
            warn(setting('requiredString_warning',
            multiply_credit( setting('requiredString_credit'), setting('requiredString_warning'))
            true
        ,
            false
        )
    )

mark:
    assert(len(simplifiedAnswer)>0,
        fail("You did not enter an answer")
    );
    assert(evaluate(simplifiedAnswer, dict(map([x,0], x, vars))),
        fail("Your answer is not a valid mathematical expression")
    );
    apply(equal);
    apply(failMaxLength);
    apply(failMinLength);
    apply(forbiddenStrings_used);
    apply(requiredStrings_not_used);

as_jme: expr(simplifiedAnswer)
```

### Matrix entry

```
cell_indexes (The index of each cell in the student's answer): 
    product(0..rows(studentAnswer), 0..cols(studentAnswer))

invalid_cells (The positions of the cells in the student's answer which can be interpreted as numbers):
    filter(isNumber(studentAnswer[row][col]), [row,col], cell_indexes)

studentMatrix (The student's answer, with each cell parsed to numbers): 
    assert(len(invalid_cells)=0,
        warn("The following cells can't be interpeted as numbers: "+join(invalid_cells, ', '))
        fail("Not all of the cells in your answer are valid numbers.")
    );
    matrix(map(map(parseNumber(c, setting('options')), c, row), row, studentAnswer))

wrong_precision_cells (The indexes of the cells which are given to the wrong precision):
    filter(not givenToPrecision(studentMatrix[row][col], setting('precision')), [row,col], cell_indexes)

wrong_size (Does the student's answer have the correct dimensions?):
    assert(rows(studentMatrix)=rows(setting('correctAnswer')) and cols(studentMatrix)=cols(setting('correctAnswer')),
        incorrect("Your matrix has the wrong dimensions.");
        end
    );

rounded_matrix (The student's answer, with each cell rounded to the required precision): 
    round(studentMatrix, setting('precision'))

correct_cells (The indexes of the cells which are correct):
    map(withinTolerance(rounded_matrix[row][col], correctAnswer[row][col], setting('tolerance')), [row,col], cell_indexes)

mark:
    if(len(correct_cells)=0,
        correct("Your answer is correct");
    ,
        if(setting('mark_per_cell'),
            award(len(correct_cells)/num_cells,"One or more cells in your answer were incorrect.")
        ,
            incorrect("Your answer is incorrect")
            end()
        )
    );
    assert(len(wrong_precision_cells)=0,
        multiply_credit(setting('wrong_precision_credit'), "The following cells are not written to the required precision: "+join(wrong_precision_cells, ', '))
    );

as_jme: studentMatrix
```
