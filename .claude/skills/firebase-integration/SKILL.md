---
name: firebase-integration
description: |
  Firebase統合スキル。Firestore、Authentication、Cloud Functions、
  Storage、Hostingの実装パターン。
  Firebase、Firestore、Cloud Functions使用時に自動適用。
  トリガー: firebase, firestore, cloud functions, firebase auth
---

# Firebase Integration Skill

## Setup

```bash
# Firebase CLI
npm install -g firebase-tools
firebase login
firebase init

# SDK
pnpm add firebase firebase-admin
```

## Client Setup

```typescript
// lib/firebase/client.ts
import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
```

## Admin Setup (Server Only)

```typescript
// lib/firebase/admin.ts
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })

export const adminAuth = getAuth(app)
export const adminDb = getFirestore(app)
```

## Firestore Patterns

### CRUD Operations
```typescript
import { 
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot 
} from 'firebase/firestore'
import { db } from '@/lib/firebase/client'

// Create
async function createUser(data: UserData) {
  const docRef = await addDoc(collection(db, 'users'), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

// Read
async function getUser(id: string) {
  const docSnap = await getDoc(doc(db, 'users', id))
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null
}

// Query
async function getUsersByRole(role: string) {
  const q = query(
    collection(db, 'users'),
    where('role', '==', role),
    orderBy('createdAt', 'desc'),
    limit(10)
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

// Realtime
function subscribeToUsers(callback: (users: User[]) => void) {
  return onSnapshot(collection(db, 'users'), (snapshot) => {
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    callback(users)
  })
}
```

### Security Rules
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 認証必須
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    
    // 管理者のみ
    match /admin/{document=**} {
      allow read, write: if request.auth.token.admin == true;
    }
  }
}
```

## Authentication

```typescript
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from 'firebase/auth'

// Email/Password
async function login(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password)
}

// Google OAuth
async function loginWithGoogle() {
  const provider = new GoogleAuthProvider()
  return signInWithPopup(auth, provider)
}

// Auth State Hook
function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })
  }, [])

  return { user, loading }
}
```

## Cloud Functions

```typescript
// functions/src/index.ts
import { onCall, onRequest } from 'firebase-functions/v2/https'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'

// Callable Function
export const processOrder = onCall(async (request) => {
  if (!request.auth) {
    throw new Error('Unauthorized')
  }
  
  const { orderId } = request.data
  // Process order...
  return { success: true }
})

// Firestore Trigger
export const onUserCreated = onDocumentCreated('users/{userId}', async (event) => {
  const userData = event.data?.data()
  // Send welcome email, etc.
})
```

## Storage

```typescript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

async function uploadFile(file: File, path: string) {
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}
```

## Checklist
- [ ] Firebase プロジェクト作成
- [ ] 環境変数設定
- [ ] Firestore Security Rules
- [ ] Authentication 設定
- [ ] Cloud Functions デプロイ
