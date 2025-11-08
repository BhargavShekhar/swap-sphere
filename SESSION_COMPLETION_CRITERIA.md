# Session Completion Criteria

## 📋 Overview

A collaboration session is considered **completed** when **BOTH users** have confirmed that the session has ended.

---

## ✅ Completion Requirements

### 1. **Session Status Must Be `in_progress`**
   - The exchange must have status: `'in_progress'`
   - Sessions cannot be confirmed if they are:
     - `'pending'` - Not yet started
     - `'accepted'` - Accepted but not started
     - `'completed'` - Already completed
     - `'cancelled'` - Cancelled

### 2. **Both Users Must Confirm**
   - **User A** must click "Confirm Session Completion" → Sets `userAConfirmed = true`
   - **User B** must click "Confirm Session Completion" → Sets `userBConfirmed = true`
   - **Only when BOTH are true** → Session status changes to `'completed'`

### 3. **Automatic Status Update**
   - When both `userAConfirmed` AND `userBConfirmed` are `true`:
     - Exchange status automatically changes: `'in_progress'` → `'completed'`
     - `completedAt` timestamp is set to the current date/time

---

## 🔄 Session Status Flow

```
1. pending
   ↓ (User accepts)
2. accepted
   ↓ (Session starts)
3. in_progress
   ↓ (User A confirms) → userAConfirmed = true
   ↓ (User B confirms) → userBConfirmed = true
   ↓ (BOTH confirmed)
4. completed ✅
```

---

## 📝 Code Implementation

### From `apps/backend/src/controllers/review.controller.ts`:

```typescript
// Prerequisites check
if (exchange.status !== 'in_progress') {
  return res.status(400).json({ 
    error: 'Session must be in progress to confirm' 
  });
}

// Mark user's confirmation
if (isUserA) {
  exchange.userAConfirmed = true;
} else {
  exchange.userBConfirmed = true;
}

// Auto-complete when both confirmed
const bothConfirmed = exchange.userAConfirmed && exchange.userBConfirmed;
if (bothConfirmed) {
  exchange.status = 'completed';
  exchange.completedAt = new Date();
}
```

---

## 🎯 Review Eligibility

A session becomes **ready for review** when:

1. ✅ Status is `'completed'`
2. ✅ `userAConfirmed = true`
3. ✅ `userBConfirmed = true`
4. ✅ User has not already submitted a review for this session

**Code check:**
```typescript
readyForReview = exchange.status === 'completed' 
  && exchange.userAConfirmed 
  && exchange.userBConfirmed
```

---

## 🚫 What Prevents Completion?

### ❌ Cannot confirm if:
- Session status is not `'in_progress'`
- User is not part of the exchange (not userA or userB)
- Session doesn't exist

### ❌ Cannot submit review if:
- Session status is not `'completed'`
- User has already submitted a review
- User is not part of the session
- Partner ID doesn't match the session

---

## 📊 Database Fields

### Exchange Model Fields:
- `status`: `'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'`
- `userAConfirmed`: `boolean` (default: `false`)
- `userBConfirmed`: `boolean` (default: `false`)
- `startedAt`: `Date?` (set when session starts)
- `completedAt`: `Date?` (set when both users confirm)

---

## 🔍 Example Scenarios

### Scenario 1: Normal Completion
1. Session is `in_progress`
2. User A clicks "Confirm Session Completion"
   - `userAConfirmed = true`
   - Status remains `in_progress`
3. User B clicks "Confirm Session Completion"
   - `userBConfirmed = true`
   - Status automatically changes to `completed`
   - `completedAt` is set
4. Both users can now submit reviews ✅

### Scenario 2: One User Confirms
1. Session is `in_progress`
2. User A clicks "Confirm Session Completion"
   - `userAConfirmed = true`
   - Status remains `in_progress`
3. User B has NOT confirmed yet
   - `userBConfirmed = false`
   - Status remains `in_progress`
   - Reviews are NOT yet available
4. User B must confirm before reviews can be submitted ⏳

### Scenario 3: Already Completed
1. Session is `completed`
2. User tries to confirm again
   - Returns error: `"Session must be in progress to confirm"`
   - Cannot confirm an already completed session

---

## 🎨 UI Flow

1. **Session ends** → Exchange status: `in_progress`
2. **User clicks "Leave Review"** → Modal opens
3. **Modal checks status:**
   - If `in_progress` and user hasn't confirmed → Show "Confirm Session Completion" button
   - If user confirmed but partner hasn't → Show "Waiting for partner..." message
   - If both confirmed → Show review form ✅

---

## 📌 Summary

**Session Completion = Mutual Confirmation**

- ✅ Both users must explicitly confirm
- ✅ Session must be `in_progress` to confirm
- ✅ Status automatically becomes `completed` when both confirm
- ✅ Reviews can only be submitted after completion
- ✅ Prevents accidental or premature completion

This ensures that both parties agree the session has ended before reviews can be submitted, maintaining fairness and accuracy in the review system.


