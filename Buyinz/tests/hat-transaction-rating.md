### **User Story**

As a buyer and seller, I want to mark a transaction as **"Done!"** and rate my experience within our chat so that I can build my reputation and help the community identify trustworthy peers.

### **Prerequisites**

*   **Active Thread:** You will need two accounts (Buyer and Seller) with an existing conversation regarding a specific listing.
    
*   **Physical Simulation:** The test assumes the "meetup" or "agreement" has just happened.
    
*   **Data Check:** The Seller's profile should have a visible (or zero) rating count before starting.
    

### **Instructions for the tester**

1.  **Seller Initiation:** As the **Seller**, open the chat with the Buyer. Tap the **"Done!"** button. In the panel that appears, select the option to mark the transaction as **Complete**.
    
2.  **Buyer Confirmation:** Switch to the **Buyer** account. Open the same chat and observe the status update. Tap **"Done!"** and mark your side as **Complete**.
    
3.  **Submit Rating:** Once both sides are marked complete, the rating interface should trigger. As the Buyer, rate the Seller **5 stars**.
    
4.  **Handle Edge Cases:** (Optional) On a separate test, select **"Sale fell through"** and verify that no rating prompt appears and the transaction is not counted.
    
5.  **Verify Reputation:** Navigate to the **Seller’s Profile**. Verify that the average\_rating and rating\_count have updated to reflect the new feedback.
    

### **Three Salient Metrics**

1.  **Completion Loop Closure (Engagement):** Are users actually clicking "Done!", or are they just stopping the conversation? A successful feature means the "Done!" button provides a sense of "closeness" and satisfaction to the deal.
    
2.  **Reputation Reliability (The Mom Test):** Does the 1-5 star system feel like it captures the "truth" of the meetup? We want to know if users feel the rating accurately reflects their safety and satisfaction.
    
3.  **Feedback Friction:** Does the rating panel appear at the "moment of truth" (right after completion), or is it an annoying after-thought? We measure the speed at which a user can go from "Deal Done" to "Rating Submitted."
    

### **Three-Question Survey**

1.  **Clarity of Resolution:** Once you and the other person both tapped "Done!", did you feel a clear sense of "closure" for that transaction, or were you confused about whether the item was still listed for sale?
    
2.  **Safety/Trust Utility:** Look at the updated star rating on the profile. If that seller had a 3.5-star rating instead of a 5-star rating, what specific "red flag" would you assume happened during their past deals?
    
3.  **Post-Deal Friction:** Did the rating panel pop up at a time that felt helpful, or did it feel like an interruption to your workflow while trying to navigate back to the feed?

Note: Buyer's rating doesn't update after transaction. is this supposed to happen? Also, buyers can't click on seller profiles and see their rating

Answered by Evelyn Lo:
1) No, there's no done status once a transaction is completed.
2) They scammed
3) No I finished the transaction and it immediately popped up so it was okay.