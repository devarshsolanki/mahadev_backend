# Twilio / OTP Configuration

This note explains how the backend uses Twilio to send OTP (SMS) and how to enable SMS sending in development.

Environment variables
- `TWILIO_ACCOUNT_SID` - Twilio Account SID
- `TWILIO_AUTH_TOKEN` - Twilio Auth Token
- `TWILIO_PHONE_NUMBER` - Twilio phone number (in E.164 format) used as the `from` number
- `TWILIO_SEND_IN_DEV` - (optional) set to `true` to allow sending SMS while `NODE_ENV` is not `production`

Behavior
- By default the OTP service will attempt to send SMS only when `NODE_ENV === 'production'` and valid Twilio credentials are present.
- To explicitly enable sending SMS while developing locally, set `TWILIO_SEND_IN_DEV=true` in your `backend/.env`. This prevents you from having to change `NODE_ENV` to `production`.

Important notes
- Twilio trial accounts are limited: you can only send SMS to numbers that are verified in your Twilio console. If you're using a trial account, either verify the recipient number in Twilio or upgrade the account to remove this restriction.
- Ensure the recipient phone number is in E.164 format (for example `+919876543210`). The backend validates phone numbers using a simple regex; the frontend should normalize numbers before sending (there is a helper utility in the frontend to do this).
- Keep your Twilio credentials secret. Do NOT commit `.env` to your repository.

Debugging tips
- Check backend logs for messages from `src/services/otpService.js`. When SMS isn't sent the logs include `OTP NOT SENT` along with flags indicating whether sending was attempted.
- If you see Twilio authentication errors, verify `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are correct.
- If using a Twilio trial account and you don't receive SMS, confirm the destination number is verified in Twilio.

Example `.env` entries (do NOT commit this):
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1650xxxxxxx
TWILIO_SEND_IN_DEV=true
```

If you want me to run a quick live test, provide:
- A phone number to test (in E.164 format), and
- Confirm whether your Twilio account is a trial account (trial accounts require the recipient number to be verified).

