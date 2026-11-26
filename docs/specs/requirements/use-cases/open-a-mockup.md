# Open a mockup

Actor: BA
Trigger: The BA wants to compare a confirmed mockup with its requirements.
Requirements: REQ-REQUIREMENTS-009, REQ-REQUIREMENTS-010, REQ-REQUIREMENTS-011, REQ-REQUIREMENTS-018

## Goal

Use a confirmed mockup without a checkout.

## Main flow
1. The BA opens the Mockups section.
2. The system lists the confirmed folders by capability.
3. The BA selects a folder.
4. The system shows the description and the mockup in an isolated frame.

## Alternative flows
### 2a. No folder is confirmed
1. The system says so.
2. Use case ends.

### 4a. The folder holds images only
1. The system shows the description and the images.
2. Use case ends.

## Business rules

- REQ-REQUIREMENTS-010 and REQ-REQUIREMENTS-011 limit what a mockup can read and call.
