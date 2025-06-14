// Constants
const RPC = "https://fullnode.mainnet.sui.io:443";
const UPDATE_INTERVAL = 60000; // 60 seconds

// Treasury configurations
const TREASURIES = [
    { 
        id: "suins",
        address: "0x9b388a6da9dd4f73e0b13abc6100f1141782ef105f6f5e9d986fb6e00f0b2591" 
    },
    { 
        id: "aeon", 
        address: "0xecd6ff59119adb34f0e7c4ba57534f1e2e14cc524e319926af9b73cfe9362e18" 
    }
];

// Token configurations
const SUINS_TOKENS = [
    {
        type: "0x5145494a5f5100e645e4b0aa950fa6b68f614e8c59e17bc5ded3495123a79178::ns::NS",
        symbol: "NS",
        logo: "https://imagedelivery.net/cBNDGgkrsEA-b_ixIp9SkQ/suins.svg/public"
    },
    {
        type: "0x2::sui::SUI",
        symbol: "SUI",
        logo: "https://imagedelivery.net/cBNDGgkrsEA-b_ixIp9SkQ/sui-coin.svg/public"
    },
    {
        type: "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
        symbol: "USDC",
        logo: "https://imagedelivery.net/cBNDGgkrsEA-b_ixIp9SkQ/usdc.png/public"
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
        const { display, note } = formatAmount(balance, 9, true);
        container.innerHTML = `
            <div class="balance-row">${display}</div>
            <div class="balance-note">${note}</div>
        `;
    } else {
        container.innerHTML = "<div>No tokens</div>";
    }
}

async function updateSuinsBalance(treasury, container) {
    const balances = await fetchBalances(treasury.address);
    let html = "";
    
    for (const token of SUINS_TOKENS) {
        const balance = balances.find(b => b.coinType === token.type);
        if (balance) {
            const meta = await fetchMetadata(balance.coinType);
            const { display, note } = formatAmount(balance.totalBalance, meta.decimals, false, token);
            html += `
                <div class="balance-row">${display}</div>
                <div class="balance-note">${note}</div>
            `;
        }
    }
    
    // Add SuiVision link with social-btn class
    html += `
        <div class="balance-note" style="margin-top:1.5rem;">
            <a href="https://suivision.xyz/account/0x9b388a6da9dd4f73e0b13abc6100f1141782ef105f6f5e9d986fb6e00f0b2591?tab=Portfolio" 
               target="_blank" 
               rel="noopener" 
               class="social-btn">
                Check it on SuiVision
            </a>
        </div>
    `;
    
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

