// ===========================================
// data-loader.js - SIMPLE VERSION
// ===========================================
// Only handles loading real Firestore data
// No demo data, no complex error handling
// ===========================================

import { collection, getDocs, query, orderBy, limit } from './firebase-config.js';
import { db } from './main.js';
import { showToast } from './ui.js';

export class DataLoader {
    
    async loadInitialData() {
    console.log('📥 Loading initial data...');
    
    try {
        // Fast initial load
        const [loadsSnapshot, salesSnapshot] = await Promise.all([
            getDocs(query(collection(db, 'loads'), orderBy('postedAt', 'desc'), limit(6))),
            getDocs(query(collection(db, 'sales'), orderBy('postedAt', 'desc'), limit(6)))
        ]);

        // Convert to simple format
        const loads = loadsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            postedAt: doc.data().postedAt?.toMillis?.() || Date.now()
        }));

        const sales = salesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(), 
            postedAt: doc.data().postedAt?.toMillis?.() || Date.now()
        }));

        console.log(`✅ Loaded ${loads.length} loads, ${sales.length} sales`);
        
        return { loads, sales };
        
    } catch (error) {
        console.error('Data load failed:', error);
        
        // ✅ ADD THIS OFFLINE CHECK:
        if (!navigator.onLine) {
            showToast('📵 You are not connected to the internet', 'error');
        } else {
            showToast('Failed to load data. Please check your connection.', 'error');
        }
        
        // Return empty arrays - no demo data
        return { loads: [], sales: [] };
    }
}

    async loadAllData() {
        console.log('🔄 Loading all data...');
        
        try {
            const [allLoads, allSales] = await Promise.all([
                getDocs(query(collection(db, 'loads'), orderBy('postedAt', 'desc'))),
                getDocs(query(collection(db, 'sales'), orderBy('postedAt', 'desc')))
            ]);

            const loads = allLoads.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                postedAt: doc.data().postedAt?.toMillis?.() || Date.now()
            }));

            const sales = allSales.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                postedAt: doc.data().postedAt?.toMillis?.() || Date.now()
            }));

            console.log(`✅ Loaded all: ${loads.length} loads, ${sales.length} sales`);
            return { loads, sales };
            
        } catch (error) {
            console.error('Full data load failed:', error);
            return { loads: [], sales: [] };
        }
    }
}

