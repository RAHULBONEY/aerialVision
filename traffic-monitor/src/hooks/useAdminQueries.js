
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
import { db } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';


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
      // console.log('🚀 Creating user with data:', userData);
      
      const token = localStorage.getItem('aerialvision_token');
      
      if (!token) {
        console.error('❌ No authentication token found');
        throw new Error('Authentication required. Please login first.');
      }
      
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
      // console.log('🌐 API URL:', `${apiUrl}/auth/users`);
      
      const payload = {
        name: userData.name?.trim(),
        email: userData.email?.toLowerCase(),
        role: userData.role,
        department: userData.department || '',
        password: userData.password || 'TempPass123!'
      };
      
      // console.log('📦 Sending payload:', payload);
      
      const response = await fetch(`${apiUrl}/auth/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      // console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        
        let errorMessage;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || `Server error: ${response.status}`;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText || 'Unknown error'}`;
        }
        
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      // console.log('✅ Success Response:', result);
      
      return result.data || result;
    },
    onSuccess: (data) => {
      // console.log('🎉 User created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      console.error('💥 User creation FAILED:', error.message);
    }
  });
};



export const useSystemHealth = () => {
  return useQuery({
    queryKey: ['systemHealth'],
    queryFn: async () => {
      
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
    refetchInterval: 5000 
  });
};


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
