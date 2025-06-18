// Constants
const RPC = "https://fullnode.mainnet.sui.io:443";
const UPDATE_INTERVAL = 60000; // 60 seconds
const COINGECKO_API = "https://api.coingecko.com/api/v3";

// Treasury configurations
const TREASURIES = [
    { 
        id: "suins",
        addresses: [
            "0x9b388a6da9dd4f73e0b13abc6100f1141782ef105f6f5e9d986fb6e00f0b2591",
            "0x15842c6ed94d1f93e51bd9c324aa07c0a80e017406455383fce0b9132276e69f",
            "0x451766ec55fb9df787eb37c2ead273fdba067da043c88cbe4866f2ddf33a1338",
            "0xbe847f00db9c9816222024e50e9024c18afc910c682a47026873527e102c132c"
        ]
    },
    { 
        id: "aeon", 
        address: "0xecd6ff59119adb34f0e7c4ba57534f1e2e14cc524e319926af9b73cfe9362e18" 
    }
];

// Token configurations with CoinGecko IDs
const SUINS_TOKENS = [
    {
        type: "0x5145494a5f5100e645e4b0aa950fa6b68f614e8c59e17bc5ded3495123a79178::ns::NS",
        symbol: "NS",
        logo: "https://imagedelivery.net/cBNDGgkrsEA-b_ixIp9SkQ/suins.svg/public",
        coingeckoId: "suins-token" // Correct CoinGecko ID for SuiNS
    },
    {
        type: "0x2::sui::SUI",
        symbol: "SUI",
        logo: "https://imagedelivery.net/cBNDGgkrsEA-b_ixIp9SkQ/sui-coin.svg/public",
        coingeckoId: "sui" // CoinGecko ID for SUI
    },
    {
        type: "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
        symbol: "USDC",
        logo: "https://imagedelivery.net/cBNDGgkrsEA-b_ixIp9SkQ/usdc.png/public",
        coingeckoId: "usd-coin" // CoinGecko ID for USDC
    }
];

// API Functions
async function fetchRPC(method, params) {
    try {
        const resp = await fetch(RPC, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method,
                params
            })
        });
        const data = await resp.json();
        return data.result;
    } catch (error) {
        console.error(`Error in ${method}:`, error);
        throw error;
    }
}

async function fetchCoinGeckoPrices(ids) {
    try {
        const response = await fetch(`${COINGECKO_API}/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching CoinGecko prices:', error);
        return {};
    }
}

async function fetchBalances(addr) {
    return fetchRPC("suix_getAllBalances", [addr]);
}

async function fetchObject(addr) {
    return fetchRPC("sui_getObject", [addr, { showContent: true }]);
}

async function fetchMetadata(type) {
    return fetchRPC("suix_getCoinMetadata", [type]);
}

// Formatting Functions
function formatAmount(amount, decimals, isAeon = false, tokenInfo = null) {
    try {
        if (isAeon) {
            const suiAmount = Number(amount) / 1000000000;
            return {
                display: `${suiAmount.toLocaleString('en-US', { 
                    minimumFractionDigits: 0, 
                    maximumFractionDigits: 6 
                }).replace(/\.?0+$/, '')} <img src="https://imagedelivery.net/cBNDGgkrsEA-b_ixIp9SkQ/sui-coin.svg/public" 
                          alt="SUI" 
                          class="token-icon">`,
                note: "AEON only have SUI in treasury"
            };
        }

        const n = BigInt(amount);
        const denom = BigInt(10) ** BigInt(decimals);
        const whole = n / denom;
        const frac = (n % denom).toString().padStart(decimals, '0').slice(0, 6);
        const formattedWhole = whole.toLocaleString('en-US');
        const formattedFrac = frac.replace(/0+$/, '');
        const display = formattedFrac ? `${formattedWhole}.${formattedFrac}` : formattedWhole;

        if (tokenInfo) {
            return {
                display: `${display} <img src="${tokenInfo.logo}" 
                          alt="${tokenInfo.symbol}" 
                          class="token-icon">`,
                note: ""
            };
        }

        return {
            display: display,
            note: ""
        };
    } catch (error) {
        console.error("Error formatting amount:", error);
        return {
            display: "Error formatting amount",
            note: ""
        };
    }
}

// Update Functions
async function updateBalances() {
    const lastUpdate = document.getElementById("last-update");
    
    for (const treasury of TREASURIES) {
        const container = document.getElementById(`${treasury.id}-balances`);
        try {
            container.textContent = "Loading…";
            
            if (treasury.id === "aeon") {
                await updateAeonBalance(treasury, container);
            } else {
                await updateSuinsBalance(treasury, container);
            }
        } catch (error) {
            console.error(`Error updating ${treasury.id} balance:`, error);
            container.innerHTML = `<span class="error">Error loading balance</span>`;
        }
    }

    updateTimestamp(lastUpdate);
}

async function updateAeonBalance(treasury, container) {
    const obj = await fetchObject(treasury.address);
    if (obj?.data?.content?.fields) {
        const balance = obj.data.content.fields.balance;
        // SUI only, 9 decimals
        const amount = Number(balance) / 1_000_000_000;

        // Fetch SUI price from CoinGecko
        const prices = await fetchCoinGeckoPrices(["sui"]);
        let priceInfo = "";
        let totalValue = 0;
        if (prices.sui) {
            const price = prices.sui.usd;
            const change24h = prices.sui.usd_24h_change;
            const priceFormatted = price ? `$${price.toFixed(4)}` : "";
            const changeFormatted = change24h ? `${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}%` : "";
            const changeColor = change24h > 0 ? '#22c55e' : change24h < 0 ? '#ef4444' : '#666';
            priceInfo = `
                <div class=\"price-info\">
                    <span class=\"price\">${priceFormatted}</span>
                    <span class=\"change\" style=\"color: ${changeColor}\">${changeFormatted}</span>
                </div>
            `;
            totalValue = amount * price;
        }

        container.innerHTML = `
            <div class="balance-row">${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 6 }).replace(/\.?0+$/, '')}
                <img src="https://imagedelivery.net/cBNDGgkrsEA-b_ixIp9SkQ/sui-coin.svg/public" alt="SUI" class="token-icon">
            </div>
            ${priceInfo}
            <div class="balance-note">AEON only have SUI in treasury</div>
            <div class="total-value"><b>Total:</b> $${totalValue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
        `;
    } else {
        container.innerHTML = "<div>No tokens</div>";
    }
}

async function updateSuinsBalance(treasury, container) {
    console.log("Starting SuiNS balance update...");
    
    // Fetch balances from main wallet address
    const mainWalletBalances = await fetchBalances(treasury.addresses[0]);
    console.log("Main wallet balances:", mainWalletBalances);
    
    // Fetch balances from object addresses (similar to AEON treasury)
    const objectBalances = [];
    
    // NS object
    try {
        const nsObj = await fetchObject(treasury.addresses[1]);
        console.log("NS object:", nsObj);
        console.log("NS object fields:", nsObj?.data?.content?.fields);
        if (nsObj?.data?.content?.fields?.value) {
            objectBalances.push({
                coinType: "0x5145494a5f5100e645e4b0aa950fa6b68f614e8c59e17bc5ded3495123a79178::ns::NS",
                totalBalance: nsObj.data.content.fields.value
            });
            console.log("Added NS balance:", nsObj.data.content.fields.value);
        }
    } catch (error) {
        console.error(`Error fetching NS object balance:`, error);
    }
    
    // USDC object
    try {
        const usdcObj = await fetchObject(treasury.addresses[2]);
        console.log("USDC object:", usdcObj);
        console.log("USDC object fields:", usdcObj?.data?.content?.fields);
        if (usdcObj?.data?.content?.fields?.value) {
            objectBalances.push({
                coinType: "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
                totalBalance: usdcObj.data.content.fields.value
            });
            console.log("Added USDC balance:", usdcObj.data.content.fields.value);
        }
    } catch (error) {
        console.error(`Error fetching USDC object balance:`, error);
    }
    
    // SUI object
    try {
        const suiObj = await fetchObject(treasury.addresses[3]);
        console.log("SUI object:", suiObj);
        console.log("SUI object fields:", suiObj?.data?.content?.fields);
        if (suiObj?.data?.content?.fields?.value) {
            objectBalances.push({
                coinType: "0x2::sui::SUI",
                totalBalance: suiObj.data.content.fields.value
            });
            console.log("Added SUI balance:", suiObj.data.content.fields.value);
        }
    } catch (error) {
        console.error(`Error fetching SUI object balance:`, error);
    }
    
    console.log("Object balances:", objectBalances);
    
    // Process balances separately and combine
    const finalBalances = {};
    
    for (const token of SUINS_TOKENS) {
        // Get main wallet balance
        const mainBalance = mainWalletBalances.find(b => b.coinType === token.type);
        let mainAmount = 0;
        if (mainBalance) {
            const meta = await fetchMetadata(mainBalance.coinType);
            mainAmount = Number(mainBalance.totalBalance) / (10 ** meta.decimals);
        }
        
        // Get object balance
        const objectBalance = objectBalances.find(b => b.coinType === token.type);
        let objectAmount = 0;
        if (objectBalance) {
            if (token.symbol === "NS" || token.symbol === "USDC") {
                objectAmount = Number(objectBalance.totalBalance) / 1000000; // 6 decimals
            } else if (token.symbol === "SUI") {
                objectAmount = Number(objectBalance.totalBalance) / 1000000000; // 9 decimals
            }
        }
        
        // Combine amounts
        const totalAmount = mainAmount + objectAmount;
        finalBalances[token.type] = totalAmount;
        
        console.log(`${token.symbol}: Main=${mainAmount}, Object=${objectAmount}, Total=${totalAmount}`);
    }
    
    // Fetch prices from CoinGecko
    const coinIds = SUINS_TOKENS.map(token => token.coingeckoId).filter(id => id);
    const prices = await fetchCoinGeckoPrices(coinIds);
    console.log('CoinGecko prices:', prices);
    
    let html = "";
    let totalValue = 0;
    
    for (const token of SUINS_TOKENS) {
        const amount = finalBalances[token.type];
        if (amount > 0) {
            let display;
            if (token.symbol === "USDC") {
                display = `${amount.toLocaleString('en-US', { 
                    minimumFractionDigits: 0, 
                    maximumFractionDigits: 3 
                })} <img src="${token.logo}" 
                          alt="${token.symbol}" 
                          class="token-icon">`;
            } else {
                display = `${amount.toLocaleString('en-US', { 
                    minimumFractionDigits: 0, 
                    maximumFractionDigits: 6 
                }).replace(/\.?0+$/, '')} <img src="${token.logo}" 
                          alt="${token.symbol}" 
                          class="token-icon">`;
            }
            
            // Add price information
            let priceInfo = "";
            let tokenValue = 0;
            if (prices[token.coingeckoId]) {
                const price = prices[token.coingeckoId].usd;
                const change24h = prices[token.coingeckoId].usd_24h_change;
                const priceFormatted = price ? `$${price.toFixed(4)}` : "";
                const changeFormatted = change24h ? `${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}%` : "";
                const changeColor = change24h > 0 ? '#22c55e' : change24h < 0 ? '#ef4444' : '#666';
                
                priceInfo = `
                    <div class="price-info">
                        <span class="price">${priceFormatted}</span>
                        <span class="change" style="color: ${changeColor}">${changeFormatted}</span>
                    </div>
                `;
                // Calculate USD value for this token
                tokenValue = amount * price;
                totalValue += tokenValue;
            }
            
            html += `
                <div class="balance-row">${display}</div>
                ${priceInfo}
                <div class="balance-note"></div>
            `;
        }
    }
    
    // Add total value line
    if (totalValue > 0) {
        html += `<div class="total-value"><b>Total:</b> $${totalValue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>`;
    }
    
    container.innerHTML = html || "<div>No tokens</div>";
}

function updateTimestamp(element) {
    const now = new Date();
    const formattedDate = now.toLocaleDateString();
    const formattedTime = now.toLocaleTimeString();
    element.textContent = `Last update: ${formattedDate} ${formattedTime}`;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateBalances();
    setInterval(updateBalances, UPDATE_INTERVAL);
});

