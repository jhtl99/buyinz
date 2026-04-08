## Context
Validate User Story 2 end-to-end with human testers:

> As a Pittsburgh buyer, I want a location-based Discovery Feed that defaults to my neighborhood and allows radius expansion so that I can instantly see the best items available within my local community.

## Prerequisites
- App runs via Expo (`npx expo start`)
- Tester grants location permissions
- Tester can open Discover tab and see listings
- Optional: simulator/device location override (Oakland -> Shadyside)

## Human Test Steps
1. Open app -> Discover tab.
2. Verify header: **Trending in [Neighborhood]**.
3. Keep radius = **Neighborhood**. Review first 10 listings.
4. Confirm each card shows neighborhood tag + distance.
5. Switch radius: **5 mi -> 10 mi -> 20 mi** and verify wider results.
6. Switch back to **Neighborhood** and verify local-only focus.
7. Change device location significantly; confirm feed/neighborhood refreshes.
8. Final vote: **Story achieved? (Yes/No)** + one-sentence rationale.

## Metrics (3)
1. **Local Relevance Rate (first 10 cards)**  
   % of first 10 listings tester considers realistically local/relevant.

2. **Time to First Considered Listing (TTFCL)**  
   Seconds until tester opens first listing they would consider buying.

3. **Control Confidence Score (1-5)**  
   How well radius controls and location refresh matched expectation.

## Survey (3 questions)
1. In the first 10 listings, how many felt local/relevant enough to consider contacting the seller?  
   (0, 1-2, 3-5, 6+)

2. How long did it take before you opened the first listing you would realistically consider buying?  
   (<15s, 15-30s, 30-60s, >60s, never)

3. After changing radius and changing location, how well did feed behavior match what you expected?  
   (1-5) + What felt off, if anything?

## Vote
- **User story achieved?** Yes / No
- Notes (required): blockers, surprises, confidence level

Answered by Evelyn Lo:
1) 6-7
2) Note: Cannot open listings from the explore page. 
3) Matched it pretty well