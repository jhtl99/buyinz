### User Story
As a buyer or seller, I want to create a verified profile so that I can establish my identity and build trust with my local community.

### Prerequisites

- App runs locally (`cd Buyinz && npx expo start`) on a device or simulator with network.
- An **email address** you control (prefer one **not** already used on this Supabase project for a clean signup path).
- If Supabase **email rate limits** block signup, use an existing test account or adjust limits in the Supabase dashboard (the app may show this in an alert).

### Human steps

1. Open the app → **Profile** tab.
2. Start **create profile / sign up** (navigation to **`/create-profile`**).
3. Enter **email** (if you are not already authenticated).
4. Fill **display name**, **username**, and **location / zip** (required). Optionally add **bio** and **profile photo**.
5. **Save** / complete the flow.
6. Confirm **success** (e.g. alert) and that you appear **signed in** on Profile (your identity is shown).

**Optional checks:** empty username → clear error; duplicate username → clear error (e.g. “Username must be unique”).

### Three satisfaction metrics (why these)

| Metric | What you observe | Why it indicates value (Lean Startup / Mom Test / product metrics) |
|--------|------------------|---------------------------------------------------------------------|
| **1. Unassisted completion** | Tester finishes without you explaining the next tap; note if they **abandon**. | **Lean Startup:** observable outcome beats opinions. **Activation** is a leading indicator of retention and eventual willingness to pay. |
| **2. Outcome clarity** | Afterward, ask them to state **in one sentence** what they have now (e.g. “I’m logged in as X”). | **Mom Test:** concrete description of what happened, not “would you use this?” **Trust** in identity flows predicts marketplace use. |
| **3. Friction count** | Number of **confusing labels**, **unclear errors**, or **extra taps** they mention. | **Vanity metrics** (likes, signups) miss pain; **friction** predicts churn. Improving measurable steps is **build–measure–learn**. |

### Three survey questions (indirect)

1. *Walk me through the first three things you tapped or typed after opening the app for this task.*  
2. *What was the most confusing or annoying moment—even a small one—and what did you expect to happen instead?*  
3. *If you did this again next week, what would you skip, keep, or change?*

Answered by Evelyn Lo:
1) First thing was profile tab, then sign in with google, and then closing the pop up.
2) Didn't read the pop up that tells you to finish creating your profile by entering in zip code. 
3) Fix profile creation (add an asterisk on the zip code to make it required)