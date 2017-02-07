## Student answer

```
"1"
```

## Settings

```
{
    "minValue": 1,
    "maxValue": 2,
    "precisionType": "sigfig",
    "precision": 1,
    "allowFraction": true
}
```

## Marking script

```
studentNumber (The student's answer, parsed as a number):
   if(settings["allowFraction"],
      parseNumber_or_fraction(studentAnswer,"en")
   ,
      parseNumber(studentAnswer,"en")
   )

isFraction (Is the student's answer a fraction?):
   "/" in studentAnswer

numerator (The numerator of the student's answer, or 0 if not a fraction):
   if(isFraction,
      parsenumber(split(studentAnswer,"/")[0],"en")
   ,
      0
   )

denominator (The numerator of the student's answer, or 0 if not a fraction):
   if(isFraction,
      parsenumber(split(studentAnswer,"/")[1],"en")
   ,
      0
   )

cancelled (Is the student's answer a cancelled fraction?):
   if(gcd(numerator,denominator)=1,
      feedback("Your fraction is cancelled");
      true
   ,
      multiply_credit(0.5,"Your fraction is not cancelled");
      false
   )

validNumber (Is the student's answer a valid number?):
   if(isNaN(studentNumber),
      warn("Your answer is not a valid number");
      fail("Your answer is not a valid number")
   ,
      feedback("Your answer is a valid number");
      true
   )

numberInRange (Is the student's number in the allowed range?):
   if(studentNumber>=settings["minValue"] and studentNumber<=settings["maxValue"],
      correct("Your answer is correct")
   ,
      incorrect("Your answer is incorrect");
      end()
   )

correctPrecision (Has the student's answer been given to the desired precision?):   if(togivenprecision(studentanswer,settings['precisionType'],settings['precision'],false),
   feedback("You gave your answer to the right precision");
   true
,
   multiply_credit(0.5,"You gave your answer to the wrong precision");
   false
)

mark (Mark the student's answer):
    feedback("Your answer: "+studentanswer);
    apply(validNumber);
    apply(numberInRange);
    assert(numberInRange,end());
    if(isFraction,
        apply(cancelled)
    ,
        apply(correctPrecision)
    );
    feedback("This is the end of the marking procedure.")
 
as_jme (The student's answer, to be reused by other parts):
    studentNumber            
```
