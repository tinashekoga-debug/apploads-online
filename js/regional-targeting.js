// ===========================================
// REGIONAL TARGETING & CONTENT LOCALIZATION
// ===========================================

import { countries } from './countries.js';

// Define fallback order for countries
const COUNTRY_FALLBACK_ORDER = ['South Africa', 'Zimbabwe', 'Zambia'];

// Regional content targeting with silent fallback
export function getUserRegion() {
    // 1. Check browser language for country hints
    const browserLang = navigator.language || navigator.userLanguage;
    
    // Common SADC country language codes
    if (browserLang.includes('en-ZA') || browserLang.includes('af-ZA')) return 'South Africa';
    if (browserLang.includes('en-ZW')) return 'Zimbabwe';
    if (browserLang.includes('en-ZM')) return 'Zambia';
    if (browserLang.includes('en-BW') || browserLang.includes('tn-BW')) return 'Botswana';
    if (browserLang.includes('en-NA')) return 'Namibia';
    if (browserLang.includes('en-MW')) return 'Malawi';
    if (browserLang.includes('en-MZ') || browserLang.includes('pt-MZ')) return 'Mozambique';
    if (browserLang.includes('en-TZ') || browserLang.includes('sw-TZ')) return 'Tanzania';
    
    // 2. Default to first in fallback order (South Africa)
    return COUNTRY_FALLBACK_ORDER[0];
}

export function getRegionalPosts(loads, sales) {
    const userRegion = getUserRegion();
    console.log('📍 User region detected:', userRegion); // ⬅️ KEEP THIS LINE - it was missing!
    
    // Get posts for detected region first
    let finalLoads = getLoadsForRegion(loads, userRegion);
    let finalSales = getSalesForRegion(sales, userRegion);
    
    console.log(`📊 ${userRegion} - Loads: ${finalLoads.length}, Sales: ${finalSales.length}`);
    
    // ... rest of the function remains exactly as before ...    
    // For LOADS: Keep adding from fallback countries until we reach our limit (3)
    if (finalLoads.length < 3) {
        for (const fallbackCountry of COUNTRY_FALLBACK_ORDER) {
            if (fallbackCountry === userRegion) continue;
            if (finalLoads.length >= 3) break;
            
            const fallbackLoads = getLoadsForRegion(loads, fallbackCountry);
            console.log(`🔄 Loads fallback ${fallbackCountry}: ${fallbackLoads.length} available`);
            
            // Add as many as needed from this fallback country
            const needed = 3 - finalLoads.length;
            const toAdd = fallbackLoads.slice(0, needed);
            finalLoads = [...finalLoads, ...toAdd];
            
            console.log(`✅ Added ${toAdd.length} loads from ${fallbackCountry}, total: ${finalLoads.length}`);
        }
        
        // If still not enough, add latest from ANY country
        if (finalLoads.length < 3) {
            const needed = 3 - finalLoads.length;
            const globalLoads = loads
                .filter(load => !finalLoads.some(l => l.id === load.id)) // Avoid duplicates
                .slice(0, needed);
            finalLoads = [...finalLoads, ...globalLoads];
            console.log(`🌍 Added ${globalLoads.length} global loads, total: ${finalLoads.length}`);
        }
    }
    
    // For SALES: Keep adding from fallback countries until we reach our limit (2)
    if (finalSales.length < 2) {
        for (const fallbackCountry of COUNTRY_FALLBACK_ORDER) {
            if (fallbackCountry === userRegion) continue;
            if (finalSales.length >= 2) break;
            
            const fallbackSales = getSalesForRegion(sales, fallbackCountry);
            console.log(`🔄 Sales fallback ${fallbackCountry}: ${fallbackSales.length} available`);
            
            // Add as many as needed from this fallback country
            const needed = 2 - finalSales.length;
            const toAdd = fallbackSales.slice(0, needed);
            finalSales = [...finalSales, ...toAdd];
            
            console.log(`✅ Added ${toAdd.length} sales from ${fallbackCountry}, total: ${finalSales.length}`);
        }
        
        // If still not enough, add latest from ANY country
        if (finalSales.length < 2) {
            const needed = 2 - finalSales.length;
            const globalSales = sales
                .filter(sale => !finalSales.some(s => s.id === sale.id)) // Avoid duplicates
                .slice(0, needed);
            finalSales = [...finalSales, ...globalSales];
            console.log(`🌍 Added ${globalSales.length} global sales, total: ${finalSales.length}`);
        }
    }
    
    console.log(`🎯 Final - Loads: ${finalLoads.length}, Sales: ${finalSales.length}`);
    
    return {
        loads: finalLoads.slice(0, 3),
        sales: finalSales.slice(0, 2)
    };
}

function getLoadsForRegion(loads, country) {
    return loads.filter(load => {
        const isFromRegion = load.originCountry === country;
        const isToRegion = load.destCountry === country;
        
        // Major cross-border routes
        const isMajorRoute = 
            (load.originCountry === 'Zimbabwe' && load.destCountry === 'Mozambique') ||
            (load.originCountry === 'Zambia' && load.destCountry === 'South Africa') ||
            (load.originCountry === 'Mozambique' && load.destCountry === 'Zimbabwe') ||
            (load.originCountry === 'South Africa' && load.destCountry === 'Zimbabwe') ||
            (load.originCountry === 'South Africa' && load.destCountry === 'Zambia');
        
        return isFromRegion || isToRegion || isMajorRoute;
    });
}

function getSalesForRegion(sales, country) {
    return sales.filter(sale => sale.country === country);
}

