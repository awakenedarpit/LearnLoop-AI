export const CONCEPTS = [
  { id: "variables", label: "Variables", shortLabel: "Variables", description: "Names that hold values and change as your program runs." },
  { id: "data-types", label: "Data types", shortLabel: "Data types", description: "The kind of value Python is working with." },
  { id: "conditionals", label: "Conditionals", shortLabel: "Conditionals", description: "Making a program choose what to do." },
  { id: "loops", label: "Loops", shortLabel: "Loops", description: "Repeating work without repeating code." },
  { id: "functions", label: "Functions", shortLabel: "Functions", description: "Reusable steps that can accept inputs and return results." },
  { id: "lists", label: "Lists", shortLabel: "Lists", description: "Ordered collections of values." },
] as const;

export type ConceptId = (typeof CONCEPTS)[number]["id"];
export type LearningKind = "diagnostic" | "practice" | "reassessment";
export type ConfidenceLevel = "guessing" | "somewhat" | "confident";

export type QuestionOption = { id: string; text: string };
export type LearningQuestionSeed = {
  id: string;
  concept: ConceptId;
  order: number;
  difficulty: "gentle" | "steady" | "stretch";
  prompt: string;
  options: QuestionOption[];
  correctOptionId: string;
  explanation: string;
  hint: string;
};

const options = (a: string, b: string, c: string, d: string): QuestionOption[] => [
  { id: "a", text: a },
  { id: "b", text: b },
  { id: "c", text: c },
  { id: "d", text: d },
];

// Fictional, hand-authored demo questions. The correct option and explanations are served only after a session is completed.
export const QUESTION_BANK: LearningQuestionSeed[] = [
  {
    id: "variables-01", concept: "variables", order: 1, difficulty: "gentle",
    prompt: "What happens when Python runs `score = 12`?",
    options: options("The name `score` refers to the integer value `12`.", "Python prints the word `score`.", "The number `12` becomes a variable name.", "Python creates a list with 12 items."),
    correctOptionId: "a", explanation: "The equals sign assigns a value to a name. After this line, `score` refers to the integer `12`.", hint: "Read the equals sign as ‘store the value on the right under the name on the left.’",
  },
  {
    id: "variables-02", concept: "variables", order: 2, difficulty: "steady",
    prompt: "Which line stores the text `Ada` in a variable named `name`?",
    options: options("`name = \"Ada\"`", "`\"Ada\" = name`", "`name == \"Ada\"`", "`text(name, Ada)`"),
    correctOptionId: "a", explanation: "Assignment uses one equals sign. Text values are written inside quotes, so `name = \"Ada\"` stores that string under `name`.", hint: "Choose the line with a single assignment operator and quotes around the text.",
  },
  {
    id: "variables-03", concept: "variables", order: 3, difficulty: "stretch",
    prompt: "After `count = 3` and then `count = count + 2`, what value does `count` hold?",
    options: options("`3`", "`5`", "`count + 2`", "`2`"),
    correctOptionId: "b", explanation: "Python first reads the current value of `count` (3), adds 2, then assigns the new value (5) back to `count`.", hint: "Substitute the old value of `count` into the second line.",
  },
  {
    id: "data-types-01", concept: "data-types", order: 1, difficulty: "gentle",
    prompt: "What is the type of the value `7` in Python?",
    options: options("Integer (`int`)", "String (`str`)", "List (`list`)", "Boolean (`bool`)"),
    correctOptionId: "a", explanation: "A whole number such as `7` is an integer. Python calls this type `int`.", hint: "The value has no decimal point and is not inside quotes.",
  },
  {
    id: "data-types-02", concept: "data-types", order: 2, difficulty: "steady",
    prompt: "In Python, what type of value does `7 / 2` produce?",
    options: options("A float (`3.5`)", "An integer (`3`)", "A string (`\"3.5\"`)", "A list (`[3, 4]`)"),
    correctOptionId: "a", explanation: "The `/` operator performs true division in Python and returns a floating-point value, even when the result is a whole number.", hint: "The result of ordinary `/` division can contain a decimal part.",
  },
  {
    id: "data-types-03", concept: "data-types", order: 3, difficulty: "stretch",
    prompt: "What type of value is `['tea', 'coffee']`?",
    options: options("A list (`list`)", "A string (`str`)", "An integer (`int`)", "A Boolean (`bool`)"),
    correctOptionId: "a", explanation: "Square brackets create a list. This list contains two string values.", hint: "Look at the punctuation surrounding the two values.",
  },
  {
    id: "conditionals-01", concept: "conditionals", order: 1, difficulty: "gentle",
    prompt: "If `age = 20`, which condition checks whether the person is at least 18?",
    options: options("`age >= 18`", "`age = 18`", "`age < 18`", "`age == 18`"),
    correctOptionId: "a", explanation: "`>=` means ‘greater than or equal to.’ It is true for 18 and every larger value.", hint: "The word ‘at least’ includes equality as well as greater values.",
  },
  {
    id: "conditionals-02", concept: "conditionals", order: 2, difficulty: "steady",
    prompt: "What does the `else` block do in an `if`/`else` statement?",
    options: options("Runs when the `if` condition is false.", "Runs before Python checks the condition.", "Repeats the `if` block forever.", "Defines a new variable type."),
    correctOptionId: "a", explanation: "Python runs the `if` branch when its condition is true. Otherwise, it runs the `else` branch.", hint: "Think of `else` as the alternative path.",
  },
  {
    id: "conditionals-03", concept: "conditionals", order: 3, difficulty: "stretch",
    prompt: "If `temperature = 22`, what does `temperature < 20` evaluate to?",
    options: options("`False`", "`True`", "`22`", "`None`"),
    correctOptionId: "a", explanation: "22 is not less than 20, so the comparison is false. Comparisons produce Boolean values.", hint: "Compare the two numbers before deciding whether the condition is true.",
  },
  {
    id: "loops-01", concept: "loops", order: 1, difficulty: "gentle",
    prompt: "How many times does `for i in range(3):` run its loop body?",
    options: options("Three times", "Two times", "Four times", "It never runs."),
    correctOptionId: "a", explanation: "`range(3)` provides 0, 1, and 2: three values, so the loop body runs three times.", hint: "Count the values starting at zero and stopping before the number inside `range`.",
  },
  {
    id: "loops-02", concept: "loops", order: 2, difficulty: "steady",
    prompt: "What values does `range(2, 5)` provide?",
    options: options("`2, 3, 4`", "`2, 3, 4, 5`", "`0, 1, 2, 3, 4`", "`3, 4, 5`"),
    correctOptionId: "a", explanation: "With a start and stop value, `range(2, 5)` begins at 2 and stops before 5: 2, 3, and 4.", hint: "The stop value is not included.",
  },
  {
    id: "loops-03", concept: "loops", order: 3, difficulty: "stretch",
    prompt: "What is `total` after `total = 0` and `for n in [2, 3]: total += n`?",
    options: options("`5`", "`3`", "`2`", "`0`"),
    correctOptionId: "a", explanation: "The loop adds 2 and then 3 to the starting total of 0, leaving `total` equal to 5.", hint: "Add each list value to the running total.",
  },
  {
    id: "functions-01", concept: "functions", order: 1, difficulty: "gentle",
    prompt: "Which keyword begins a Python function definition?",
    options: options("`def`", "`func`", "`make`", "`return`"),
    correctOptionId: "a", explanation: "Python uses `def` followed by the function name and parentheses to define a function.", hint: "A short three-letter keyword starts the definition.",
  },
  {
    id: "functions-02", concept: "functions", order: 2, difficulty: "steady",
    prompt: "What does `return` do inside a function?",
    options: options("Sends a result back to the code that called the function.", "Prints the result automatically.", "Starts the function definition.", "Repeats the previous line."),
    correctOptionId: "a", explanation: "`return` ends the function call and gives a value back to the caller. Printing is a separate action.", hint: "A caller can store or use the value that comes back.",
  },
  {
    id: "functions-03", concept: "functions", order: 3, difficulty: "stretch",
    prompt: "Given `def double(n): return n * 2`, what does `double(4)` return?",
    options: options("`8`", "`4`", "`6`", "`n * 2` as text"),
    correctOptionId: "a", explanation: "The call passes 4 as `n`; the function returns `4 * 2`, which is 8.", hint: "Replace `n` with the argument value before multiplying.",
  },
  {
    id: "lists-01", concept: "lists", order: 1, difficulty: "gentle",
    prompt: "What does `colors[0]` return from `colors = ['red', 'blue']`?",
    options: options("`'red'`", "`'blue'`", "`0`", "The whole list"),
    correctOptionId: "a", explanation: "Python lists use zero-based indexing. Index 0 refers to the first item, which is `'red'`.", hint: "The first position in a Python list has index zero.",
  },
  {
    id: "lists-02", concept: "lists", order: 2, difficulty: "steady",
    prompt: "What does `len([4, 5, 6])` return?",
    options: options("`3`", "`2`", "`6`", "`[4, 5, 6]`"),
    correctOptionId: "a", explanation: "`len` returns the number of items. This list contains three items.", hint: "Count the comma-separated values inside the brackets.",
  },
  {
    id: "lists-03", concept: "lists", order: 3, difficulty: "stretch",
    prompt: "After `fruits = ['apple']` and `fruits.append('pear')`, what is in `fruits`?",
    options: options("`['apple', 'pear']`", "`['pear', 'apple']`", "`'pear'`", "`['apple']`"),
    correctOptionId: "a", explanation: "`append` adds the given item to the end of the existing list.", hint: "The new value is added after the item already in the list.",
  },
];

export function conceptLabel(concept: string): string {
  return CONCEPTS.find((item) => item.id === concept)?.label ?? "Python Fundamentals";
}
