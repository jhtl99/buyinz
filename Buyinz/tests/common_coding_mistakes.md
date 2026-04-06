# 🧠 Common (and Dumb) Coding Mistakes

A collection of surprisingly common mistakes developers make—from beginners to experienced engineers.

---

## 🧾 Syntax & Language Errors

- Missing or misplaced semicolons  
- Mismatched or missing braces/brackets (`{}`, `()`, `[]`)  
- Incorrect indentation (especially in Python)  
- Using `=` instead of `==` (assignment vs comparison)  
- Using `==` instead of `===` (JavaScript strict equality)  
- Type mismatches (e.g., comparing string to int)  
- Implicit casting issues (e.g., signed vs unsigned integers)  
- Pointer/reference errors (in low-level languages like C/C++)  

---

## 📦 Imports, Dependencies & Environment

- Forgetting to import required modules/libraries  
- Calling functions that don’t exist  
- Using the wrong library version  
- Not importing components before using them (React, etc.)  

---

## 🧮 Logic & Runtime Errors

- Using uninitialized variables  
- Accessing variables without null/None checks  
- Assuming arrays/lists are always non-empty  
- Off-by-one errors (`<` vs `<=`)  
- Not accounting for floating point precision  
- Recursion without a proper base case  
- Base case exists but is never reached  
- Forgetting to actually call a function after defining it  
- Updating code in one place but not updating dependent logic elsewhere  
- Changing unused code and expecting different behavior  

---

## 🔁 Variable & Naming Issues

- Reusing a variable for multiple unrelated purposes  
- Mixing up variable names  
- Misspelling variable names  
- Wrong variable types  
- Poor or inconsistent file naming  
- Duplicate variables/files causing confusion  

---

## 📋 Code Structure & Maintainability

- Duplicated code (lack of DRY principle)  
- Poor modularization (everything in one big function)  
- Accidentally writing code inside the wrong scope (e.g., inside a loop)  
- Out-of-scope function usage  

---

## 🧪 Testing & Debugging Mistakes

- The test case itself is wrong (not the code)  
- Hardcoding solutions to pass visible test cases (fails hidden tests)  
- Misunderstanding input/output format  
- Debugging correct code because expectations are incorrect  

---

## 🗂️ File & Workflow Mistakes

- Forgetting to upload/sync files before running tests (e.g., AFS)  
- Pushing broken code to `main`  
- Accidentally committing API keys  
- Committing generated/build files  
- Deleting important files accidentally  
- Copy-pasting code without adapting variable names or logic  
- Duplicate files in the project  

---

## ⚙️ Language-Specific Pitfalls

### Python
- Using falsy checks instead of explicit `is not None`  
- Indentation errors affecting control flow  
- Writing unintended infinite loops due to indentation  

### C / C++
- Forgetting to free allocated memory  
- Pointer misuse / invalid references  

### JavaScript
- `==` vs `===` confusion  
- Using undefined variables without checks  

---

## 🧹 Tooling & Quality

- Failing the linter  
- Ignoring warnings/errors from tooling  

---

## 😅 Classic “Facepalm” Mistakes

- Calling a function that doesn’t exist  
- Forgetting a closing brace and debugging for 30 minutes  
- Copy-pasting code from ChatGPT without fixing indentation or context  
- Writing correct code but testing it with wrong assumptions  
