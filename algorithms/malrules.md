## Student answer

```
"x-x^3/3!+x^5/5!-x^7/7!"
```

## Settings

```
{
    "malrules": [
        ["m_not(m_uses(x))","Your answer does not use the variable $x$"],
        ["m_all(m_pm(m_any(x,x^?,x^?/?!)));terms+m_nothing;rest","It looks like your answer is a series expansion"],
        ["sin(?)","Your answer is of the form $\\sin(.)$"]
    ]
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


malrule_feedback:
    map(
        assert(not matches(studentExpr,x[0]),
            feedback(x[1])
        ),
        x,
        settings["malrules"]
    )

mark:
    apply(studentExpr);
    apply(malrule_feedback)

as_jme:
    studentExpr
```
