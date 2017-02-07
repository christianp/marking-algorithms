## Student answer

```
[["1","0"],["0","1"]]
```

## Settings

```
{
    "correctAnswer": [[1,0],[0,1]],
    "numberStyle": "en",
    "precisionType": "dp",
    "precision": 1,
    "wrong_precision_credit": 0.5,
    "tolerance": 1e-10
}
```


## Marking script

```
rows (The number of rows in the student's answer): len(studentanswer)

cols (The number of columns in the student's answer): len(studentanswer[0])

correct_rows (The number of rows in the correct answer): len(settings['correctAnswer'])

correct_cols (The number of columns in the correct answer): len(settings['correctAnswer'][0])

num_cells (The number of cells in the student's answer): rows*cols

cell_indexes (The index of each cell in the student's answer): 
    product(list(0..rows-1), list(0..cols-1))

studentNumbers:
    map(map(parseNumber(c, settings['numberStyle']), c, row), row, studentAnswer)

studentMatrix (The student's answer, with each cell parsed to numbers): 
    matrix(studentNumbers)

invalid_cells (The positions of the cells in the student's answer which can't be interpreted as numbers):
    filter(isnan(studentNumbers[p[0]][p[1]]), p, cell_indexes)

any_invalid (Are any of the cells invalid?):
    assert(len(invalid_cells)=0,
        warn("The following cells can't be interpeted as numbers: "+join(invalid_cells, ', '));
        fail("Not all of the cells in your answer are valid numbers.");
        true
    )

wrong_precision_cells (The indexes of the cells which are given to the wrong precision):
    filter(not toGivenPrecision(studentAnswer[p[0]][p[1]], settings["precisionType"], settings['precision'], true), p, cell_indexes)

wrong_precision (Has every cell been given to the correct precision?):
    assert(len(wrong_precision_cells)=0,
        multiply_credit(settings['wrong_precision_credit'], "The following cells are not written to the required precision: "+join(wrong_precision_cells, ', '))
    )


wrong_size (Does the student's answer have the wrong dimensions?):
    assert(rows=correct_rows and cols=correct_cols,
        incorrect("Your matrix has the wrong dimensions.");
        end()
    )

rounded_matrix (The student's answer, with each cell rounded to the required precision): 
    map(
        switch(
            settings["precisionType"]="dp",
            precround(c, settings['precision']),
            settings["precisionType"]="sigfig",
            siground(c, settings['precision']),
            c
        ),
        c,
        studentMatrix
    )

correct_cells (The indexes of the cells which are correct):
    filter(
        if(p[0]<correct_rows and p[1]<correct_cols,
            withinTolerance(rounded_matrix[p[0]][p[1]], settings["correctAnswer"][p[0]][p[1]], settings['tolerance']),
            false
        ),
        p, 
        cell_indexes
    )

mark:
    apply(any_invalid);
    apply(wrong_size);
    if(len(correct_cells)=len(cell_indexes),
        correct("Your answer is correct")
    ,
        if(settings['mark_per_cell'],
            add_credit(len(correct_cells)/num_cells,"One or more cells in your answer were incorrect.")
        ,
            incorrect("Your answer is incorrect");
            end()
        )
    );
    apply(wrong_precision)

as_jme: studentMatrix
```
