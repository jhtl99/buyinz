# Unit Test PR Review Checklist (Jest)

## 🚨 Reviewer Instructions (READ FIRST)
- You are performing a **code review only**.
- ❌ DO NOT modify, rewrite, or generate new code.
- ❌ DO NOT output updated files or patches.
- ✅ ONLY provide **feedback, suggestions, and identified issues**.
- ✅ Be specific and reference **file names, functions, and test cases**.
- ✅ If something is missing, describe **what should be added and why**, not how to implement it fully.

---

## 1. Coverage & Completeness

- [ ] Does every function in the target file have **at least one test**?
- [ ] Are there **multiple tests for complex functions** (edge cases, invalid inputs, etc.)?
- [ ] Are any functions **missing tests entirely**?
- [ ] Are tests written only for **existing functions** (no hallucinated APIs)?
- [ ] Does test coverage focus on **core logic**, not trivial or irrelevant code?

---

## 2. Test Quality & Usefulness

- [ ] Do tests verify **actual behavior**, not just superficial outputs?
- [ ] Are there meaningful **assertions** (not just checking if code runs)?
- [ ] Do tests check **edge cases** (null, undefined, empty inputs, boundary values)?
- [ ] Are **error cases / failure paths** tested where applicable?
- [ ] Do tests avoid redundancy or duplicate scenarios?

---

## 3. Jest Best Practices

- [ ] Are `describe` blocks used to logically group tests?
- [ ] Are test names (`it` / `test`) **clear and descriptive**?
- [ ] Are assertions using appropriate Jest matchers (e.g., `toBe`, `toEqual`, `toThrow`)?
- [ ] Are async functions tested correctly (e.g., `async/await`, `resolves/rejects`)?
- [ ] Are mocks used properly for external dependencies (`jest.mock`, `jest.fn`)?
- [ ] Are tests **isolated and independent** (no reliance on shared state)?

---

## 4. Mocking & External Dependencies

- [ ] Are external APIs, services, or modules **mocked appropriately**?
- [ ] Are mocks **realistic and relevant**, not arbitrary or nonsensical?
- [ ] Are tests avoiding actual network/database calls?
- [ ] Are mock behaviors tested (e.g., success vs failure responses)?

---

## 5. Readability & Maintainability

- [ ] Is the test file **well-organized and easy to read**?
- [ ] Are variable and test names **clear and meaningful**?
- [ ] Is there unnecessary complexity that could be simplified?
- [ ] Are repeated setups extracted using `beforeEach` where appropriate?
- [ ] Are comments used only when necessary and helpful?

---

## 6. Avoiding LLM Hallucination Issues

- [ ] Do all tested functions actually exist in the source file?
- [ ] Are there any **made-up behaviors or assumptions** not present in the code?
- [ ] Are expected outputs **accurate based on implementation**, not guesses?
- [ ] Are there any **overly generic or vague tests** that don’t validate real logic?

---

## 7. Edge Cases & Robustness

- [ ] Are boundary conditions tested (min/max values)?
- [ ] Are invalid inputs handled and tested?
- [ ] Are unexpected inputs (wrong types, malformed data) considered?
- [ ] Do tests ensure the function behaves correctly under **failure conditions**?

---

## 8. Test Execution & Reliability

- [ ] Would these tests **consistently pass/fail deterministically**?
- [ ] Are there any flaky tests (timing issues, randomness, shared state)?
- [ ] Are dependencies properly controlled to ensure stable results?

---

## 9. Feedback Summary (REQUIRED OUTPUT)

At the end of your review, provide:

### ✅ Strengths
- List 2–5 things the tests do well.

### ⚠️ Issues Found
- List specific problems with references to files/functions/tests.

### 💡 Suggested Improvements
- Provide actionable suggestions (WITHOUT writing code).

### 🚫 Blocking Issues (if any)
- Identify critical problems that should be fixed before merging.

---

## 10. Final Verdict

Choose one:
- [ ] ✅ Approve
- [ ] ⚠️ Approve with minor suggestions
- [ ] ❌ Request changes

Provide a **brief justification** for your decision.