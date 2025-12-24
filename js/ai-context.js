
// ===========================================
// ai-context.js - Context Builder for Afi
// ===========================================
// Provides Afi with app context WITHOUT importing from main.js
// Uses window.appState instead to avoid circular dependencies
// ===========================================

// ===========================================
// HELPER: Get app state safely
// ===========================================
function getAppState() {
    return window.appState || { 
        loads: [], 
        sales: [], 
        profile: null,
        currentUser: null 
    };
}

// ===========================================
// BUILD CONTEXT: Create context string for AI
// ===========================================
// This function gathers relevant info and formats it for the AI
export function buildContext(userMessage) {
    const state = getAppState();
    const contextParts = [];
    
    // 1. SYSTEM PROMPT - Who is Afi?
    contextParts.push(`You are Afi, an AI logistics assistant for AppLoads, a trucking platform in Southern Africa (SADC region).`);
    contextParts.push(`You help with: route planning, price estimates, border documents, and general logistics advice.`);
    contextParts.push(`Keep responses concise, practical, and specific to SADC trucking.`);
    
    contextParts.push(`
If the question lacks sufficient data:
- Ask ONE clarifying question
- Do not guess prices or regulations
`);
    
    // 2. APP STATE CONTEXT
    contextParts.push(`\nCurrent Platform Status:`);
    contextParts.push(`- Active loads: ${state.loads?.length || 0}`);
    contextParts.push(`- Marketplace items: ${state.sales?.length || 0}`);
    
    // 3. USER CONTEXT (if signed in)
    if (state.profile) {
        contextParts.push(`\nUser Info:`);
        contextParts.push(`- Country: ${state.profile.country || 'unknown'}`);
        if (state.profile.company) {
            contextParts.push(`- Company: ${state.profile.company}`);
        }
    }
    
    // 4. DETECT QUERY TYPE and add relevant context
    const queryType = detectQueryType(userMessage);
    
    if (queryType === 'route') {
        contextParts.push(getRouteContext());
if (queryType === 'price') {
    contextParts.push(getPriceContext(state).slice(0, 800));
}
    } else if (queryType === 'documents') {
        contextParts.push(getDocumentContext());
    } else if (queryType === 'loads') {
        contextParts.push(getLoadContext(state));
    } else if (queryType === 'country') {
        const country = extractCountryFromMessage(userMessage);
        if (country) {
            const info = getCountryInfo(country);
            if (info) {
                contextParts.push(`\n${country} Info: Capital: ${info.capital}, Currency: ${info.currency}, Borders: ${info.borders.join(', ')}`);
            }
        }
    }
    
   return `
SYSTEM:
You are Afi, an AI logistics assistant for AppLoads operating in Southern Africa (SADC).

BEHAVIOR RULES:
- Be practical and industry-focused
- Avoid generic advice
- Prefer bullet points and numbers
- Use Southern African trucking realities
- If unsure, say so clearly

CONTEXT:
${contextParts.join('\n')}

USER QUESTION:
${userMessage}

RESPONSE FORMAT:
- Short intro (1–2 lines)
- Bullet points or numbered steps
- Use USD unless otherwise stated
- No emojis
- No disclaimers

ANSWER:
`.trim();
}

// ===========================================
// DETECT QUERY TYPE
// ===========================================
function detectQueryType(message) {
    const lower = message.toLowerCase();
    
    if (lower.includes('route') || (lower.includes('from') && lower.includes('to'))) {
        return 'route';
    }
    if (lower.includes('price') || lower.includes('cost') || lower.includes('rate') || lower.includes('estimate')) {
        return 'price';
    }
    if (lower.includes('document') || lower.includes('border') || lower.includes('permit') || lower.includes('papers')) {
        return 'documents';
    }
    if (lower.includes('load') || lower.includes('cargo') || lower.includes('available')) {
        return 'loads';
    }
    if (lower.includes('country') || lower.includes('zimbabwe') || lower.includes('zambia') || 
        lower.includes('botswana') || lower.includes('south africa') || lower.includes('namibia')) {
        return 'country';
    }
    
    return 'general';
}

// ===========================================
// EXTRACT COUNTRY FROM MESSAGE
// ===========================================
function extractCountryFromMessage(message) {
    const lower = message.toLowerCase();
    const countries = ['South Africa', 'Zimbabwe', 'Zambia', 'Botswana', 'Namibia', 'Mozambique', 'Tanzania', 'Malawi'];
    
    for (const country of countries) {
        if (lower.includes(country.toLowerCase())) {
            return country;
        }
    }
    return null;
}

// ===========================================
// ROUTE CONTEXT
// ===========================================
function getRouteContext() {
    return `
SADC Major Routes:
- Johannesburg-Harare: 1100km (~14hrs), via Beitbridge border
- Durban-Harare: 1400km (~18hrs), via Beitbridge
- Lusaka-Dar es Salaam: 1800km (~24hrs), via TAZARA
- Cape Town-Windhoek: 1500km (~16hrs), via Namibia border
- Johannesburg-Gaborone: 370km (~4hrs)

Key Border Crossings:
- Beitbridge (SA-ZW): Busiest, expect delays
- Chirundu (ZW-ZM): 24hr operations
- Kazungula (BW-ZM): New bridge, efficient
- Lebombo (SA-MZ): Main Mozambique crossing

Tips: Travel early morning, prepare docs in advance, check seasonal closures
`;
}

// ===========================================
// PRICE CONTEXT
// ===========================================
function getPriceContext(state) {
    const loads = state.loads || [];
    
    if (loads.length === 0) {
        return `
Typical SADC Pricing (No live data available):
- Base rate: $2.50-4.00 per km
- 20-ton load Johannesburg-Harare: $2,800-3,500
- Fuel surcharges: 10-15% extra
- Border crossing fees: $50-200 per crossing
- Peak season (Dec-Jan, Jun-Jul): +20-30%
`;
    }
    
    // Calculate average from real loads
    const totalPrice = loads.reduce((sum, load) => sum + (Number(load.price) || 0), 0);
    const avgPrice = loads.length > 0 ? Math.round(totalPrice / loads.length) : 0;
    
    // Get price range
    const prices = loads.map(l => Number(l.price) || 0).filter(p => p > 0).sort((a, b) => a - b);
    const minPrice = prices[0] || 0;
    const maxPrice = prices[prices.length - 1] || 0;
    
    return `
Current Market Pricing (Live Data):
- Average load price: $${avgPrice}
- Price range: $${minPrice} - $${maxPrice}
- Active loads: ${loads.length}
- Base rate: $2.50-4.00 per km (industry standard)
- Peak season: Prices 20-30% higher Dec-Jan, Jun-Jul
`;
}

// ===========================================
// DOCUMENT CONTEXT
// ===========================================
function getDocumentContext() {
    return `
SADC Border Documents Required:

South Africa:
- Certificate of Fitness (COF) - mandatory for all trucks
- Cross-border road transport permit
- Valid driver's license & passport
- SADC vehicle registration

Zimbabwe:
- Temporary Import Permit (TIP) - $10-30
- Road toll fees - prepaid or cash
- Carbon Tax - based on emissions
- Third-party insurance

Zambia:
- Road Tax receipt - purchase at border
- COMESA Yellow Card insurance - $50-150
- Vehicle fitness certificate
- Driver's license (international or SADC)

Botswana:
- Cross-border permit - free for SADC
- Valid insurance (third-party minimum)
- Driver's license

General Tips:
✓ Prepare all documents 48 hours before travel
✓ Keep original documents + 2 photocopies
✓ Check vehicle load limits per country
✓ Have USD cash for border fees
✓ Carnet de Passage for temporary imports (some countries)
`;
}

// ===========================================
// LOAD CONTEXT
// ===========================================
function getLoadContext(state) {
    const loads = state.loads || [];
    
    if (loads.length === 0) {
        return `\nNo loads currently available. Users can post loads in the app.`;
    }
    
    // Get top 5 recent loads
    const recentLoads = loads
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, 5);
    
    const loadSummary = recentLoads.map((load, i) => 
        `${i + 1}. ${load.cargo || 'Cargo'}: ${load.originCity}, ${load.originCountry} → ${load.destCity}, ${load.destCountry} (${load.currency} ${load.price || 'TBC'})`
    ).join('\n');
    
    return `
Recent Available Loads:
${loadSummary}

Total active loads: ${loads.length}
Users can browse all loads in the Loads tab.
`;
}

// ===========================================
// STATIC SADC DATA
// ===========================================
export const SADC_COUNTRIES = {
    'South Africa': {
        capital: 'Pretoria/Cape Town',
        major_cities: ['Johannesburg', 'Cape Town', 'Durban', 'Port Elizabeth'],
        borders: ['Botswana', 'Zimbabwe', 'Mozambique', 'Namibia', 'Lesotho', 'Eswatini'],
        currency: 'ZAR (Rand)',
        trucking_notes: 'COF mandatory, well-maintained highways, strict weight limits'
    },
    'Zimbabwe': {
        capital: 'Harare',
        major_cities: ['Bulawayo', 'Mutare', 'Gweru'],
        borders: ['South Africa', 'Botswana', 'Zambia', 'Mozambique'],
        currency: 'USD/ZWL',
        trucking_notes: 'TIP required, road tolls, fuel sometimes scarce'
    },
    'Zambia': {
        capital: 'Lusaka',
        major_cities: ['Kitwe', 'Ndola', 'Livingstone'],
        borders: ['Zimbabwe', 'Tanzania', 'Malawi', 'Mozambique', 'Namibia', 'Botswana', 'DR Congo', 'Angola'],
        currency: 'ZMW (Kwacha)',
        trucking_notes: 'Road tax at border, COMESA insurance needed, good highway network'
    },
    'Botswana': {
        capital: 'Gaborone',
        major_cities: ['Francistown', 'Maun', 'Kasane'],
        borders: ['South Africa', 'Namibia', 'Zimbabwe', 'Zambia'],
        currency: 'BWP (Pula)',
        trucking_notes: 'Excellent roads, minimal border delays, free SADC permits'
    },
    'Namibia': {
        capital: 'Windhoek',
        major_cities: ['Walvis Bay', 'Swakopmund', 'Oshakati'],
        borders: ['South Africa', 'Botswana', 'Zambia', 'Angola'],
        currency: 'NAD (Dollar)',
        trucking_notes: 'Long distances, good roads, fuel readily available'
    },
    'Mozambique': {
        capital: 'Maputo',
        major_cities: ['Beira', 'Nampula', 'Matola'],
        borders: ['South Africa', 'Zimbabwe', 'Zambia', 'Malawi', 'Tanzania', 'Eswatini'],
        currency: 'MZN (Metical)',
        trucking_notes: 'Coastal route important, some road quality issues, port access'
    },
    'Tanzania': {
        capital: 'Dodoma',
        major_cities: ['Dar es Salaam', 'Mwanza', 'Arusha'],
        borders: ['Kenya', 'Uganda', 'Rwanda', 'Burundi', 'DR Congo', 'Zambia', 'Malawi', 'Mozambique'],
        currency: 'TZS (Shilling)',
        trucking_notes: 'Major port at Dar es Salaam, TAZARA route to Zambia'
    },
    'Malawi': {
        capital: 'Lilongwe',
        major_cities: ['Blantyre', 'Mzuzu'],
        borders: ['Zambia', 'Tanzania', 'Mozambique'],
        currency: 'MWK (Kwacha)',
        trucking_notes: 'Landlocked, depends on Mozambique ports, hilly terrain'
    }
};

// ===========================================
// GET COUNTRY INFO
// ===========================================
export function getCountryInfo(countryName) {
    return SADC_COUNTRIES[countryName] || null;
}

// ===========================================
// ESTIMATE DISTANCE (Simplified matrix)
// ===========================================
export function estimateDistance(origin, destination) {
    const distances = {
        'Johannesburg-Harare': 1100,
        'Harare-Johannesburg': 1100,
        'Durban-Harare': 1400,
        'Harare-Durban': 1400,
        'Lusaka-Harare': 570,
        'Harare-Lusaka': 570,
        'Lusaka-Dar es Salaam': 1800,
        'Dar es Salaam-Lusaka': 1800,
        'Johannesburg-Gaborone': 370,
        'Gaborone-Johannesburg': 370,
        'Cape Town-Windhoek': 1500,
        'Windhoek-Cape Town': 1500,
        'Maputo-Johannesburg': 500,
        'Johannesburg-Maputo': 500
    };
    
    const key = `${origin}-${destination}`;
    return distances[key] || null;
}
