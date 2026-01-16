// src/hooks/useAdminQueries.js - Enhanced version
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/firebase/config';

// ===== USERS =====
export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        uid: doc.id,
        ...doc.data()
      }));
    }
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userData) => {
      // Create auth user
      const authUser = await createUserWithEmailAndPassword(
        auth, 
        userData.email, 
        'TempPass123!' // You'll want to generate this properly
      );
      
      // Create Firestore document
      const userDoc = {
        name: userData.name,
        email: userData.email,
        role: userData.role,
        status: 'ACTIVE',
        accessLevel: userData.role === 'ADMIN' ? 5 : userData.role === 'EMERGENCY' ? 3 : 2,
        createdAt: Timestamp.now(),
        uid: authUser.user.uid
      };
      
      await addDoc(collection(db, 'users'), userDoc);
      return userDoc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
    }
  });
};

// ===== SYSTEM HEALTH =====
export const useSystemHealth = () => {
  return useQuery({
    queryKey: ['systemHealth'],
    queryFn: async () => {
      // Mock data - replace with real system monitoring
      return {
        databaseStatus: 'OPERATIONAL',
        apiLatency: '23ms',
        aiModelStatus: 'ACTIVE',
        activeConnections: '47',
        uptime: '23:45:12',
        cpuUsage: 34,
        memoryUsage: 62,
        gpuUsage: 78
      };
    },
    refetchInterval: 5000 // Refresh every 5 seconds
  });
};

// ===== AUDIT LOGS =====
export const useAuditLogs = () => {
  return useQuery({
    queryKey: ['auditLogs'],
    queryFn: async () => {
      const logsRef = collection(db, 'auditLogs');
      const q = query(logsRef, orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        time: doc.data().timestamp?.toDate().toLocaleTimeString() || new Date().toLocaleTimeString()
      }));
    }
  });
};

// ===== INCIDENTS (for Police) =====
export const useIncidents = () => {
  return useQuery({
    queryKey: ['incidents'],
    queryFn: async () => {
      const incidentsRef = collection(db, 'incidents');
      const q = query(incidentsRef, orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
  });
};

// ===== AMBULANCE TRACKING (for Hospital) =====
export const useAmbulanceTracking = () => {
  return useQuery({
    queryKey: ['ambulances'],
    queryFn: async () => {
      const ambulancesRef = collection(db, 'ambulances');
      const q = query(ambulancesRef, where('status', '==', 'ACTIVE'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
  });
};

// ===== GREEN WAVE CONTROLS =====
export const useGreenWave = () => {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['greenWave'],
    queryFn: async () => {
      const greenWaveRef = collection(db, 'greenWaveRequests');
      const q = query(greenWaveRef, orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
  });

  const activateGreenWave = useMutation({
    mutationFn: async ({ ambulanceId, route, priority }) => {
      const greenWaveDoc = {
        ambulanceId,
        route,
        priority,
        status: 'ACTIVE',
        timestamp: Timestamp.now(),
        estimatedDuration: 300 // 5 minutes
      };
      
      await addDoc(collection(db, 'greenWaveRequests'), greenWaveDoc);
      return greenWaveDoc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['greenWave']);
    }
  });

  return { ...query, activateGreenWave };
};
