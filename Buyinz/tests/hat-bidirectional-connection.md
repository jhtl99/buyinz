## Implemented User Story
As a Buyinz user, I want to search for people I know and send/manage follow requests so that I can build a private, trusted circle for buying and selling.

---

## Scope Under Test
- Search by name / `@username`
- Follow request flow (`Follow` → `Requested`)
- Requests tab with `Accept` / `Decline`
- Recommended profiles
- Followers / Following lists
- Counts update after actions
- Follow-back behavior works correctly

---

## Prerequisites
1. Use **mobile app** (not web).
2. Create 3 accounts: **A** (tester), **B** (peer), **C** (control).
3. Ensure each account has `name` and `username`.
4. Use two devices/simulators or switch accounts.

---

## Human Acceptance Steps
1. Login as **A** → Profile → Connections.
2. In Discover, search **B** by name and by `@username`.
3. Tap **Follow** on B and confirm button changes to **Requested**.
4. Login as **B** → Requests tab → verify A appears.
5. Tap **Accept** for A.
6. Return to **A**:
   - Verify relationship state is accurate.
   - If one-way, verify A can **Follow back**.
7. Complete follow-back (if needed), then verify both sides in Followers/Following.
8. Verify counts update after each action and after navigating away/back.
9. Decline path: **C** sends request to A; A declines; verify removal from Requests.
10. Verify Recommendations are shown and actionable.

---

## Satisfaction Metrics (3)
1. **First-Pass Scenario Completion**  
   Metric: Did the tester complete the full flow without help and without restarting? (Yes/No), plus % of required steps completed. 
   **Target:** Yes, and 100% of required steps completed
   **Why:** Works with very small samples (even 1 tester), still measures real usability and friction in a concrete way.

2. **Time to Accepted Connection (TTC)**  
   Median time from opening Connections to accepted connection.  
   **Target:** ≤ 2 minutes  
   **Why:** Captures friction and efficiency.

3. **State Clarity Confidence (Likert 1–5)**  
   “I understood what each relationship state meant and what I could do next.”  
   **Target:** ≥ 4.2/5  
   **Why:** Prevents trust-breaking social state confusion.

---

## 3-Question Survey
1. What, if anything, slowed you down while connecting with another user?
2. Was there any moment where relationship status felt unclear (Requested / Follows you / Following)? Where?
3. If this were your real buying/selling circle, how confident are you using this weekly? (1–5)  
   Follow-up: What would make your score a 5?

Answered by Evelyn Lo:
1) Can't search for users in the explore page
2) No
3) 3, if I were more of a consumer I would use the app more. 