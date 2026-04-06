3. Machine-Executable Unit Test Cases (200 points)¶
One way to evaluate whether your implementation is good enough is to test it. You will create unit tests for each class that can be executed by the computer (not an LLM) to tell you if the code meets your specifications.

Look through the source code of your frontend and identify 10 code files that contain the most core functionality that implements your frontend user stories. Only choose files that have at least 5 functions.

Most projects that are written in Javascript or TypeScript should use the Jest unit testing framework. You may use another framework, but you may not manually test the code; you must use a testing framework.

First, install the test framework into your application. Create a tests/ folder and keep all of your test files there. Next, prompt an LLM to write unit tests for each function in the code file. Remember, do not ask the LLM to write all the unit tests in a single prompt. Only generate one test at a time. There must be at least one unit test for every function, but there may very well be several unit tests per function required to fully test its operation. If a mock for external functionality is needed, have your test framework create it for you.

Jest
For example, you have a validateEmail(string address) function to test. One possible test may check whether GMail addresses are considered valid. The input address would be "realemailaddress@gmail.com" and the expected output would be the boolean "true".

At the end, you should have one test file for each tested class.

Note

You will be graded on how well you prevent the LLM from hallucinating nonsensical test cases or creating duplicate or significantly overlapping test cases. The LLM must not generate test cases for functions and functionalities that do not exist.

Ask the LLM to generate scripst to setup the frontend and backend of your application and then execute the tests with your testing framework.

How did it go? Did every test pass? If not, use your LLM to give you a plan on how it wants to fix the bugs (ask it for three alternative fixes). Choose the bug fix you like and have the LLM make the change. Did your test case pass? Congratulations! If not, try again.

For each class you test
Create a unit test feature in your GitHub Issues database. Make sure to keep the status of this Issue up to date on your Kanban board.
Once you are done generating and testing your test code, commit it to the repository.
Wrap up the commits into a pull request (PR) on GitHub and submit it.
Have a teammate or LLM do a code review on your PR and iterate until they are satisfied with the quality of the test code. Turn in the raw notes (or recording) from your human code review or the checklist you used and the LLM output if you asked an LLM to review your code.
Approve the PR and merge it into main. Remember to keep the status of the user story up to date on your Kanban board.
Turn in a URL to each class's unit test PR, identifying which class the PR was testing.
If you used an LLM for any part of this section, please turn in a copy of the chat log or a URL to the chatlog that is accessible to all of the 17-356 instructors.