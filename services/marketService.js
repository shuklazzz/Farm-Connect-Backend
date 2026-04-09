const axios = require('axios');
const stringSimilarity = require('string-similarity');




// --- FALLBACK MARKET DATA (Simulated) ---
const MARKET_RATES = {
    // Veg & Fruits
    "Potato": 35, "Onion": 45, "Tomato": 60, "Wheat": 28, "Rice": 50,
    "Apple": 120, "Banana": 40, "Carrot": 30, "Spinach": 20,
    "Cauliflower": 35, "Brinjal": 40, "Ladyfinger": 30,
    // Spices
    "Turmeric": 150, "Chilli": 200, "Cumin": 350, "Coriander": 120, 
    "Black Pepper": 500, "Cardamom": 1500, "Ginger": 180, "Garlic": 160
};

const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

const getMarketPrice = async (userInput, city) => {
    // Generate a unique cache key based on input and city
    const cacheKey = `market_${city || 'national'}_${userInput.toLowerCase()}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
        return cachedData;
    }

    try {
        if (process.env.DATA_GOV_API_KEY) {
            
            // params for axios
            const params = {
                'api-key': process.env.DATA_GOV_API_KEY,
                'format': 'json',
                'limit': 2000, 
                // 'filters[commodity]': userInput 
            };

            // If a city is provided, try to filter by district first
            if (city) {
                params['filters[district]'] = city;
            }

            // 1. Fetch latest data 
            let response = await axios.get('https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070', { params });
            let records = response.data.records;

            // FALLBACK TO NATIONAL if no records found for this district
            if ((!records || records.length === 0) && city) {
                delete params['filters[district]']; // Remove strict filter
                response = await axios.get('https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070', { params });
                records = response.data.records;
            }

            if (!records || records.length === 0) {

            }
            
            if (records && records.length > 0) {
                // 2. Extract unique commodity names from API data
                const availableCommodities = [...new Set(records.map(r => r.commodity))];


                // 3. Find best match for user input in the API data
                const matches = stringSimilarity.findBestMatch(userInput, availableCommodities);
                const bestMatch = matches.bestMatch;
                


                // 4. If we found a good match (rating > 0.3)
                if (bestMatch.rating > 0.3) {
                    const matchedName = bestMatch.target;
                    
                    // 5. Filter records for this specific matched commodity
                    const relevantRecords = records.filter(r => r.commodity === matchedName);
                    
                    // 6. Calculate Average Price
                    const prices = relevantRecords.map(r => Number(r.modal_price));
                    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
                    
                    const pricePerKg = Math.round(avgPrice / 100);

                    // Determine source label
                    const sourceLabel = (city && params['filters[district]']) 
                        ? `Govt Agmarknet (${city})` 
                        : "Govt Agmarknet (National Avg)";

                    const result = {
                        found: true,
                        data: {
                            original: userInput,
                            matchedName: matchedName,
                            price: pricePerKg,
                            source: sourceLabel
                        }
                    };

                    // Save to cache
                    cache.set(cacheKey, result);
                    return result;
                }
            }
        }
    } catch (error) {
        console.error("Govt API Failed:", error.message);
    }

    // 2. Fallback to Simulated Data (Fuzzy Match inside Fallback)
    const knownVegetables = Object.keys(MARKET_RATES);
    const matches = stringSimilarity.findBestMatch(userInput, knownVegetables);
    const bestMatch = matches.bestMatch;

    if (bestMatch.rating > 0.3) {
        const correctName = bestMatch.target;
        const price = MARKET_RATES[correctName];
        // Add random fluctuation
        const finalPrice = price + (Math.floor(Math.random() * 5) - 2);

        return {
            found: true,
            data: {
                original: userInput,
                matchedName: correctName,
                price: finalPrice,
                source: "Govt Mandi (Simulated Fallback)"
            }
        };
    } else {
        return { found: false };
    }
};

module.exports = {
    getMarketPrice
};
