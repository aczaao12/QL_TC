import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { removeItem } from '../../../services/indexedDB';

export async function addTransactionDirectly(userId, transactionData) {
  const { amount, type, category, description, timestamp } = transactionData;

  if (!userId) {
    throw new Error('User not logged in.');
  }

  if (!amount || !type || !category || !description) {
    throw new Error('All transaction fields (amount, type, category, description) are required.');
  }

  try {
    await addDoc(collection(db, 'transactions'), {
      userId,
      amount: parseFloat(amount),
      type,
      category,
      description,
      timestamp: timestamp || serverTimestamp(), // Use provided timestamp or default to serverTimestamp
    });

    // Invalidate IndexedDB cache for transactions and budgets
    await removeItem(`transactions_${userId}`);
    await removeItem(`transactions_for_budgets_${userId}`);

    return { success: true, message: 'Transaction added successfully!' };
  } catch (err) {
    console.error("Error adding document: ", err);
    throw new Error(`Error adding transaction: ${err.message}`);
  }
}
