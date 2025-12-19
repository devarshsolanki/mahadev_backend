# Twilio SMS Quick Troubleshooting

## ⚡ Quick Fixes

### SMS Not Sending (But OTP Created)?

**Check 1:** Is `TWILIO_SEND_IN_DEV=true` in `.env`?
```bash
grep TWILIO_SEND_IN_DEV .env
# Should output: TWILIO_SEND_IN_DEV=true
```

**Check 2:** Are credentials real (not examples)?
```bash
# Real format examples:
# TWILIO_ACCOUNT_SID=AC... (34 chars, starts with AC)
# TWILIO_AUTH_TOKEN=... (32 hex chars)
# Get real ones from: https://www.twilio.com/console
```

**Check 3:** Is the backend restarted after .env changes?
```bash
# Stop current process (Ctrl+C)
npm start
```

---

### Invalid Phone Number Error

**Problem:** `Invalid phone format. Expected E.164`

**Solution:** Use format with country code
```
✅ Correct:   +919876543210
✅ Correct:   +12025551234  
❌ Wrong:     9876543210 (missing country code)
❌ Wrong:     919876543210 (missing +)
```

**Country Codes:**
- India: `+91`
- USA: `+1`
- UK: `+44`
- Canada: `+1`

---

### "SMS NOT SENT" in Logs

**Meaning:** OTP was created but SMS wasn't attempted

**Reasons:**
1. `NODE_ENV=production` AND `TWILIO_SEND_IN_DEV≠true`
   - Fix: Add `TWILIO_SEND_IN_DEV=true` to `.env`

2. Twilio client not initialized
   - Check logs for: `❌ Failed to initialize Twilio client`
   - Fix: Verify credentials format

3. No sender phone configured
   - Check: `TWILIO_PHONE_NUMBER=+16592344658` in `.env`
   - Fix: Add valid Twilio phone number

---

### Twilio API Errors in Logs

**Error 21211:** Invalid 'To' parameter
```
Cause: Phone number format wrong or unverified
Fix: Use E.164 format (+1234567890)
     For trial: verify number in Twilio console
```

**Error 21608:** Unregistered number (trial account)
```
Cause: Trial accounts can only text verified numbers
Fix: Add recipient number to Twilio console
     Or upgrade to paid account
```

**Error 20003:** Invalid access token
```
Cause: TWILIO_AUTH_TOKEN is wrong
Fix: Copy correct token from https://www.twilio.com/console
```

---

## 🧪 Test Endpoint

```bash
# Test without creating OTP
curl -X POST http://localhost:5000/api/v1/auth/test-sms \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'

# Response shows:
# "smsSent": true  → SMS attempted
# "smsSent": false → SMS not sent (see reason in debugInfo)
# "messageSid": "..." → SMS successfully queued
```

---

## 📋 Step-by-Step Debugging

### 1. Check Configuration
```bash
echo "=== Twilio Config ==="
grep TWILIO .env | head -4
```

### 2. Check Logs
```bash
# Watch for SMS
tail -f logs/combined.log | grep "SMS\|Twilio\|OTP"

# Expected success line:
# ✅ SMS sent successfully
```

### 3. Test SMS
```bash
curl -X POST http://localhost:5000/api/v1/auth/test-sms \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'
```

### 4. Read Response
- ✅ `"smsSent": true` → Check phone for SMS
- ❌ `"smsSent": false` → Check `debugInfo` for reason
- ❌ Error → Check `message` field and logs

### 5. Check Actual Delivery
- Paid account: Check Twilio console > Messages
- Trial account: Check verified phone for SMS

---

## 🚀 Complete Test (New User)

```bash
# 1. Request OTP (creates OTP, attempts SMS)
RESPONSE=$(curl -s -X POST http://localhost:5000/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}')

echo "OTP Response: $RESPONSE"
OTP=$(echo $RESPONSE | grep -o '"otp":"[^"]*' | cut -d'"' -f4)
echo "Extracted OTP: $OTP"

# 2. Verify OTP (creates user if first time)
curl -X POST http://localhost:5000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d "{\"phone\": \"+919876543210\", \"otp\": \"$OTP\", \"name\": \"Test User\"}"

# 3. Check logs
tail -f logs/combined.log | head -20
```

---

## 🎯 Key Log Indicators

| Log | Meaning |
|-----|---------|
| `✅ Twilio client initialized` | Credentials valid, ready to send |
| `❌ Failed to initialize Twilio` | Bad credentials, SMS won't work |
| `📱 Sending OTP - START` | OTP process started |
| `📝 OTP generated` | Random code created |
| `💾 OTP stored in database` | DB save successful |
| `✅ SMS sent successfully` | Twilio accepted the message |
| `❌ Twilio API error` | Twilio rejected the request |
| `⏭️ SMS NOT SENT` | Skipped due to config |

---

## 📞 Real Example Flow

**Request:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/test-sms \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'
```

**Logs Generated:**
```
📱 Sending OTP - START { phone: '+919876543210' }
📝 OTP generated { otpCode: '432156', expiryMinutes: 5 }
💾 OTP stored in database { documentId: '507f...' }
🔍 SMS sending decision { canSendSms: true, shouldSendSms: true }
📤 Sending SMS via Twilio { from: '+16592344658', to: '+919876543210' }
✅ SMS sent successfully { messageSid: 'SM1234567...', status: 'queued' }
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "otp": "432156",
  "smsSent": true,
  "messageSid": "SM1234567890abcdef1234567890abcdef",
  "debugInfo": {
    "nodeEnv": "development",
    "sendInDev": true,
    "twilioConfigured": true,
    "senderPhone": "+16592344658"
  }
}
```

---

## 🔧 Common Quick Fixes

| Problem | Solution | Command |
|---------|----------|---------|
| SMS not sending | Add `TWILIO_SEND_IN_DEV=true` | `echo 'TWILIO_SEND_IN_DEV=true' >> .env` |
| Bad credentials | Get real ones | https://www.twilio.com/console |
| Phone format wrong | Use +Country# | `+919876543210` |
| Trial limit | Verify number | https://www.twilio.com/console |
| Server not running | Start backend | `npm start` |
| Old logs confusing | Clear logs | `echo "" > logs/combined.log` |

---

## ✅ Pre-Launch Checklist

- [ ] Real Twilio credentials in `.env`
- [ ] `TWILIO_SEND_IN_DEV=true` in `.env`
- [ ] Backend running (`npm start` shows `Server running...`)
- [ ] Test endpoint works (`curl .../test-sms` returns 200)
- [ ] Logs show `✅ Twilio client initialized`
- [ ] SMS received on test number within 30 seconds
- [ ] Read `TWILIO_SMS_DEBUG_GUIDE.md` for full details

---

## 📞 Support

**If SMS not arriving:**
1. Check logs for `✅ SMS sent successfully` with messageSid
2. Check messageSid status in Twilio console
3. Verify phone number is correct (E.164 format)
4. If trial: verify phone in Twilio console
5. If paid: check account balance

**For detailed help:** See `TWILIO_SMS_DEBUG_GUIDE.md`

---

*Quick Reference Version - See main guide for details*
