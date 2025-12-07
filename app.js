// Constants
const RPC = "https://fullnode.mainnet.sui.io:443";
const UPDATE_INTERVAL = 180000; // 3 minutes
const COINGECKO_API = "https://api.coingecko.com/api/v3";
const BURN_ADDRESS = "0x0000000000000000000000000000000000000000000000000000000000000000";
const NS_TOTAL_SUPPLY = 500_000_000;
const NS_TOKEN_TYPE = "0x5145494a5f5100e645e4b0aa950fa6b68f614e8c59e17bc5ded3495123a79178::ns::NS";

// Price cache
let priceCache = { suins: 0, sui: 0, usdc: 0 };
let burnDataCache = { totalBurnt: 0, todayBurnt: 0, yesterdayBurnt: 0, recentTransactions: [] };
let totalsCache = { suins: 0, aeon: 0, buyback: 0 };

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

const SUINS_TOKENS = [
    {
        type: "0x5145494a5f5100e645e4b0aa950fa6b68f614e8c59e17bc5ded3495123a79178::ns::NS",
        symbol: "NS",
        logo: "https://imagedelivery.net/cBNDGgkrsEA-b_ixIp9SkQ/suins.svg/public",
        coingeckoId: "suins-token"
    },
    {
        type: "0x2::sui::SUI",
        symbol: "SUI",
        logo: "https://imagedelivery.net/cBNDGgkrsEA-b_ixIp9SkQ/sui-coin.svg/public",
        coingeckoId: "sui"
    },
    {
        type: "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
        symbol: "USDC",
        logo: "https://imagedelivery.net/cBNDGgkrsEA-b_ixIp9SkQ/usdc.png/public",
        coingeckoId: "usd-coin"
    }
];

async function fetchRPC(method, params) {
    try {
        const resp = await fetch(RPC, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params })
        });
        const data = await resp.json();
        return data.result;
    } catch (error) {
        throw error;
    }
}

async function fetchCoinGeckoPrices(ids) {
    try {
        const response = await fetch(`${COINGECKO_API}/simple/price?ids=${ids.join(',')}&vs_currencies=usd`);
        const data = await response.json();
        if (data["suins-token"]) priceCache.suins = data["suins-token"].usd || 0;
        if (data["sui"]) priceCache.sui = data["sui"].usd || 0;
        if (data["usd-coin"]) priceCache.usdc = data["usd-coin"].usd || 0;
        return data;
    } catch (error) {
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

async function queryTransactionBlocks(filter, limit = 100) {
    return fetchRPC("suix_queryTransactionBlocks", [{ filter }, { limit, order: "descending" }]);
}

// Burn Data Functions
async function getBurnMetrics() {
    try {
        // Get total NS burnt (current balance at burn address) - FETCH THIS FIRST
        const balances = await fetchBalances(BURN_ADDRESS);
        const nsBal = balances.find(b => b.coinType === NS_TOKEN_TYPE);
        const totalBurntAmount = nsBal ? Number(nsBal.totalBalance) / 1_000_000 : 0;
        
        // Update cache immediately with total burnt
        burnDataCache.totalBurnt = totalBurntAmount;
        
        // Query recent transactions to burn address (in parallel)
        const recentTxns = await queryTransactionBlocks(
            { ToAddress: BURN_ADDRESS },
            100
        );
        
        // Parse transactions for today's and yesterday's burn
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        
        let todayBurnt = 0;
        let yesterdayBurnt = 0;
        const recentTxnsFormatted = [];
        
        if (recentTxns?.data) {
            for (const txn of recentTxns.data) {
                try {
                    const txnTime = new Date(txn.timestampMs);
                    let txnAmount = 0;
                    
                    // Try object changes first
                    if (txn.effects?.objectChanges) {
                        for (const change of txn.effects.objectChanges) {
                            if (change.objectType === NS_TOKEN_TYPE && change.content?.fields?.balance) {
                                txnAmount = Number(change.content.fields.balance) / 1_000_000;
                                break;
                            }
                        }
                    }
                    
                    // Fallback to events
                    if (txnAmount === 0 && txn.effects?.events) {
                        for (const event of txn.effects.events) {
                            if (event.type === "0x2::coin::CoinTransfer" && event.parsedJson?.amount) {
                                if (JSON.stringify(event.parsedJson).includes(NS_TOKEN_TYPE.split("::")[0])) {
                                    txnAmount = Number(event.parsedJson.amount) / 1_000_000;
                                    break;
                                }
                            }
                        }
                    }
                    
                    // Categorize by date
                    if (txnAmount > 0) {
                        if (txnTime >= todayStart) {
                            todayBurnt += txnAmount;
                        } else if (txnTime >= yesterdayStart) {
                            yesterdayBurnt += txnAmount;
                        }
                        
                        if (recentTxnsFormatted.length < 5) {
                            recentTxnsFormatted.push({
                                amount: txnAmount,
                                timestamp: txn.timestampMs,
                                digest: txn.digest
                            });
                        }
                    }
                } catch (e) {
                    // Skip unparseable transactions
                }
            }
        }
        
        burnDataCache = {
            totalBurnt: totalBurntAmount,
            todayBurnt: todayBurnt,
            yesterdayBurnt: yesterdayBurnt,
            recentTransactions: recentTxnsFormatted
        };
        
        return burnDataCache;
    } catch (error) {
        return burnDataCache;
    }
}

// Formatting & Cache
const metaCache = {};
const formatNum = (num, decimals = 2) => num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: decimals }).replace(/\.?0+$/, '');

async function updateBalances() {
    await fetchCoinGeckoPrices(["suins-token", "sui", "usd-coin"]);
    
    totalsCache = { suins: 0, aeon: 0, buyback: 0 };
    
    for (const treasury of TREASURIES) {
        const container = document.getElementById(`${treasury.id}-balances`);
        if (!container) continue;
        
        container.textContent = "Loading…";
        try {
            treasury.id === "aeon" 
                ? await updateAeonBalance(treasury, container)
                : await updateSuinsBalance(treasury, container);
        } catch (e) {
            container.innerHTML = `<div class="error">Error</div>`;
        }
    }
    
    const buyback = document.getElementById("buyback-balances");
    if (buyback) {
        buyback.textContent = "Loading…";
        try {
            await updateBuybackBalance(buyback);
        } catch (e) {
            buyback.innerHTML = `<div class="error">Error</div>`;
        }
    }
    
    // Update individual treasury total boxes
    const suinsBox = document.getElementById("suins-total-box");
    if (suinsBox) {
        suinsBox.textContent = `Total: $${formatNum(totalsCache.suins, 2)}`;
    }
    
    const aeonBox = document.getElementById("aeon-total-box");
    if (aeonBox) {
        aeonBox.textContent = `Total: $${formatNum(totalsCache.aeon, 2)}`;
    }
    
    const buybackBox = document.getElementById("buyback-total-box");
    if (buybackBox) {
        buybackBox.textContent = `Total: $${formatNum(totalsCache.buyback, 2)}`;
    }
    
    const time = document.getElementById("last-update");
    if (time) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        time.textContent = `${timeString} ${timeZone}`;
    }
}

async function updateBuybackBalance(container) {
    // Show total burnt immediately (from cache or initial fetch)
    if (burnDataCache.totalBurnt > 0) {
        container.innerHTML = `
            <div class="balance-row">
                <img src="https://imagedelivery.net/cBNDGgkrsEA-b_ixIp9SkQ/suins.svg/public" alt="NS" class="token-icon">
                ${formatNum(burnDataCache.totalBurnt)} NS
            </div>
            <div style="font-size: 0.9rem; color: #999; text-align: center;">Loading details...</div>
        `;
    }
    
    // Now fetch full metrics for complete display
    const burnMetrics = await getBurnMetrics();
    const nsPrice = priceCache.suins || 0;
    const totalBurntUSD = burnMetrics.totalBurnt * nsPrice;
    const percentOfSupply = (burnMetrics.totalBurnt / NS_TOTAL_SUPPLY) * 100;
    
    totalsCache.buyback = totalBurntUSD;
    
    const changePercent = burnMetrics.yesterdayBurnt > 0 
        ? ((burnMetrics.todayBurnt - burnMetrics.yesterdayBurnt) / burnMetrics.yesterdayBurnt) * 100
        : burnMetrics.todayBurnt > 0 ? 100 : 0;
    
    const changeClass = changePercent > 0 ? 'positive' : changePercent < 0 ? 'negative' : 'neutral';
    const txnsHtml = burnMetrics.recentTransactions.length > 0 ? `
        <div class="recent-txns">
            <h4>Recent Burns</h4>
            ${burnMetrics.recentTransactions.map(txn => `
                <div class="txn-item">
                    <span class="txn-amount">${formatNum(txn.amount)} NS</span>
                    <span class="txn-value">$${formatNum(txn.amount * nsPrice, 2)}</span>
                    <span class="txn-time">${new Date(txn.timestamp).toLocaleDateString()}</span>
                </div>
            `).join('')}
        </div>
    ` : '';
    
    container.innerHTML = `
        <div class="balance-row">
            <img src="https://imagedelivery.net/cBNDGgkrsEA-b_ixIp9SkQ/suins.svg/public" alt="NS" class="token-icon">
            ${formatNum(burnMetrics.totalBurnt)} NS
        </div>
        <div class="balance-note">${percentOfSupply.toFixed(4)}% of total supply</div>
        <div class="burn-today">
            <div><b>Today:</b> ${formatNum(burnMetrics.todayBurnt)} NS</div>
            <div><span class="change-${changeClass}">${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%</span></div>
        </div>
        ${txnsHtml}
    `;
}

async function updateAeonBalance(treasury, container) {
    const obj = await fetchObject(treasury.address);
    if (obj?.data?.content?.fields) {
        const amount = Number(obj.data.content.fields.balance) / 1_000_000_000;
        const totalValue = amount * priceCache.sui;
        totalsCache.aeon = totalValue;
        
        container.innerHTML = `
            <div class="balance-row">${formatNum(amount, 6)}
                <img src="https://imagedelivery.net/cBNDGgkrsEA-b_ixIp9SkQ/sui-coin.svg/public" alt="SUI" class="token-icon">
            </div>
            <div class="price-info">
                <span class="price">$${priceCache.sui.toFixed(4)}</span>
            </div>
            <div class="total-value">$${formatNum(totalValue, 2)}</div>
        `;
    } else {
        container.innerHTML = "<div>No data</div>";
    }
}

async function updateSuinsBalance(treasury, container) {
    const mainWalletBalances = await fetchBalances(treasury.addresses[0]);
    const objResults = await Promise.allSettled([
        fetchObject(treasury.addresses[1]),
        fetchObject(treasury.addresses[2]),
        fetchObject(treasury.addresses[3])
    ]);
    
    let totalValue = 0;
    let html = "";
    
    for (const token of SUINS_TOKENS) {
        let amount = 0;
        const mainBalance = mainWalletBalances.find(b => b.coinType === token.type);
        
        if (mainBalance) {
            const decimals = metaCache[token.type] || (metaCache[token.type] = (await fetchMetadata(token.type)).decimals);
            amount += Number(mainBalance.totalBalance) / (10 ** decimals);
        }
        
        const objIdx = ['NS', 'USDC', 'SUI'].indexOf(token.symbol);
        if (objIdx >= 0 && objResults[objIdx].status === "fulfilled" && objResults[objIdx].value?.data?.content?.fields?.value) {
            const decimals = token.symbol === "SUI" ? 9 : 6;
            amount += Number(objResults[objIdx].value.data.content.fields.value) / (10 ** decimals);
        }
        
        if (amount > 0) {
            const price = [priceCache.suins, priceCache.usdc, priceCache.sui][objIdx] || 0;
            const decimals = token.symbol === "USDC" ? 3 : 6;
            const assetUsdValue = amount * price;
            
            html += `
                <div class="balance-row">${formatNum(amount, decimals)}<img src="${token.logo}" alt="${token.symbol}" class="token-icon"></div>
                <div class="price-info"><span class="price">$${price.toFixed(4)}</span></div>
                <div class="asset-value">USD: <b>$${formatNum(assetUsdValue, 2)}</b></div>
            `;
            totalValue += assetUsdValue;
        }
    }
    
    totalsCache.suins = totalValue;
    if (totalValue > 0) html += `<div class="total-value">$${formatNum(totalValue, 2)}</div>`;
    container.innerHTML = html || "<div>No data</div>";
}

// Theme Toggle
function initTheme() {
    const isDarkMode = localStorage.getItem('theme') === 'dark';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        updateThemeButton();
    }
}

function toggleTheme() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    updateThemeButton();
}

function updateThemeButton() {
    const button = document.getElementById('theme-toggle');
    const isDarkMode = document.body.classList.contains('dark-mode');
    button.textContent = isDarkMode ? '☀️' : '🌙';
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    updateBalances();
    setInterval(updateBalances, UPDATE_INTERVAL);
});

