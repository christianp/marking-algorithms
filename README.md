# A language for defining marking algorithms

### [Demo](https://christianp.github.io/marking-algorithms/state.html)

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

The following variables are available at any point:

* `studentAnswer` - the student's answer, exactly as they entered it
* `settings[name]` - get the part setting with the given name, e.g. `correctAnswer`, `maxLength`.
