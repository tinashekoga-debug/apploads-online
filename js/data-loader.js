// ===========================================
// data-loader.js - SIMPLE VERSION
// ===========================================
// Only handles loading real Firestore data
// No demo data, no complex error handling
// ===========================================

import { collection, getDocs, query, orderBy, limit } from './firebase-config.js';
import { db } from './main.js';
import { showToast } from './ui.js';
import { getCachedData, setCachedData } from './firestore-cache.js';

export class DataLoader {
    
async loadInitialData() {
    console.log('📥 Loading initial data...');
    
    // Try cache first
    const cachedLoads = await getCachedData('initial-loads');
    const cachedSales = await getCachedData('initial-sales');
    
    if (cachedLoads && cachedSales) {
        console.log('✅ Using cached data');
        return { loads: cachedLoads, sales: cachedSales };
    }
    
    try {
        // Fast initial load from Firestore
        const [loadsSnapshot, salesSnapshot] = await Promise.all([
            getDocs(query(collection(db, 'loads'), orderBy('postedAt', 'desc'), limit(6))),
            getDocs(query(collection(db, 'sales'), orderBy('postedAt', 'desc'), limit(6)))
        ]);

        const loads = loadsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                postedAt: data.postedAt?.toMillis?.() || 
                          (typeof data.postedAt === 'number' ? data.postedAt : Date.now())
            };
        });

        const sales = salesSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data, 
                postedAt: data.postedAt?.toMillis?.() || 
                          (typeof data.postedAt === 'number' ? data.postedAt : Date.now())
            };
        });

        // Cache for next time
        await setCachedData('initial-loads', loads, 'loads');
        await setCachedData('initial-sales', sales, 'sales');

        console.log(`✅ Loaded ${loads.length} loads, ${sales.length} sales`);
        return { loads, sales };
        
    } catch (error) {
        console.error('Data load failed:', error);
        
        if (!navigator.onLine) {
            showToast('📵 You are not connected to the internet', 'error');
        } else {
            showToast('Failed to load data. Please check your connection.', 'error');
        }
        
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

            const loads = allLoads.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    postedAt: data.postedAt?.toMillis?.() || 
                              (typeof data.postedAt === 'number' ? data.postedAt : Date.now())
                };
            });

            const sales = allSales.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    postedAt: data.postedAt?.toMillis?.() || 
                              (typeof data.postedAt === 'number' ? data.postedAt : Date.now())
                };
            });

            console.log(`✅ Loaded all: ${loads.length} loads, ${sales.length} sales`);
            return { loads, sales };
            
        } catch (error) {
            console.error('Full data load failed:', error);
            return { loads: [], sales: [] };
        }
    }

    // =========================
    // ADD THIS FUNCTION FOR RATINGS DATA
    // =========================
    async loadRatingsData() {
        console.log('⭐ Loading ratings data...');
            
        try {
            const ratingsSnapshot = await getDocs(collection(db, 'loadRatings'));
            const ratingsData = {};
            
            ratingsSnapshot.forEach(doc => {
                ratingsData[doc.id] = doc.data();
            });
            
            console.log(`✅ Loaded ratings for ${Object.keys(ratingsData).length} loads`);
            return ratingsData;
            
        } catch (error) {
            console.error('Error loading ratings data:', error);
            return {};
        }
    }
}