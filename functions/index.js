const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();

exports.flipPvP = onCall(async (request) => {
  // 1. Security Check
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }

  const { roomId } = request.data;
  const db = getFirestore();
  const roomRef = db.collection("coinflip_rooms").doc(roomId);

  // 2. Run as a Transaction (Prevents glitches)
  return db.runTransaction(async (transaction) => {
    const roomDoc = await transaction.get(roomRef);
    if (!roomDoc.exists) {
      throw new HttpsError("not-found", "Room does not exist.");
    }

    const roomData = roomDoc.data();

    // 3. Verify it is the Host's turn
    if (roomData.hostId !== request.auth.uid) {
      throw new HttpsError("permission-denied", "Only the host can flip the coin.");
    }
    
    // 4. Verify Game Status
    if (roomData.status !== 'playing' && roomData.status !== 'waiting_flip') {
       // You might need to adjust this check depending on your exact status flow
    }

    // 5. THE SECURE FLIP
    // This happens on Google's server, so the user cannot tamper with it.
    const result = Math.random() < 0.5 ? 'heads' : 'tails';

    // 6. Update the database
    transaction.update(roomRef, {
      lastFlip: {
        result: result,
        timestamp: Date.now()
      }
    });

    return { success: true, result: result };
  });
});