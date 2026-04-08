### User Story
As a buyer, I want to submit an instant price offer on an item, So that I can quickly negotiate with the seller without typing out a long message.

### Prerequisites

- **Signed in** (complete User story 1 or use an existing buyer account).
- A **listing in the feed that is not yours**, with a **non-zero asking price** (so “offer ≤ price” is testable).
- If the feed has no suitable listing, have a teammate **create one** first.

### Human steps

1. From **Home** (or feed), **open a listing** you do not own.
2. Tap **Make Offer** (bottom bar; not shown if you are the seller).
3. Enter a **whole-dollar amount**: **greater than 0** and **not above** the asking price.
4. Tap **Submit Offer**.
5. Confirm **Offer Sent** (or equivalent) and the modal closes.
6. **Optional:** Open **Messages** / chat for that listing and confirm an **offer line** appears in the thread.

**Optional checks:** while **signed out**, try **Make Offer** → should prompt to sign in; offer **above** price → should block with a clear message.

### Three satisfaction metrics (why these)

| Metric | What you observe | Why it indicates value (Lean Startup / Mom Test / product metrics) |
|--------|------------------|---------------------------------------------------------------------|
| **1. Unassisted completion** | Submits a valid offer **without help**; no silent failure. | Core **job-to-be-done** for a buyer; failure here means no transaction loop. |
| **2. Seller-side belief** | Can they articulate **what the seller receives** (message, notification, etc.)? | **Trust** in a two-sided marketplace; unclear outcomes kill **conversion** and payment intent later. |
| **3. Comparison to alternatives** | They compare speed/clarity to **how they usually** buy from strangers (e.g. DM, other apps). | **Mom Test:** past behavior and concrete comparisons beat hypothetical “would you pay?” **Competitive reality** shapes willingness to pay. |

### Three survey questions (indirect)

1. *Right after you submitted, what do you think happened on the seller’s side?*  
2. *Compared to how you’d usually try to buy from someone you don’t know online, what felt faster, slower, or stranger?*  
3. *What would make you hesitate before sending another offer on a different item?*

Answered by Evelyn Lo:
1) They got my offer in messages
2) Faster because you can just tap a button, but you can't offer prices in terms of cents (only dollar amounts right now).
3) If it's legit or not, knowing that the seller is safe.