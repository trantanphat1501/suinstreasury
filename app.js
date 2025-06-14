// RPC endpoint for Sui network
const RPC = "https://fullnode.mainnet.sui.io:443";

// Treasury addresses for both SuiNS and AEON
const TREASURIES = [
  { id: "suins", address: "0x9b388a6da9dd4f73e0b13abc6100f1141782ef105f6f5e9d986fb6e00f0b2591" },
  { id: "aeon", address: "0xecd6ff59119adb34f0e7c4ba57534f1e2e14cc524e319926af9b73cfe9362e18" }
];

// Token metadata for SuiNS treasury in specific order
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

// Fetch all token balances for a given address
async function fetchBalances(addr) {
  const resp = await fetch(RPC, {
    method: "POST", 
    headers:{ "Content-Type": "application/json" },
    body: JSON.stringify({ 
      jsonrpc:"2.0", 
      id:1, 
      method:"suix_getAllBalances", 
      params:[addr] 
    })
  });
  const j = await resp.json();
  return j.result;
}

// Fetch object details including balance
async function fetchObject(addr) {
  const resp = await fetch(RPC, {
    method: "POST", 
    headers:{ "Content-Type": "application/json" },
    body: JSON.stringify({ 
      jsonrpc:"2.0", 
      id:1, 
      method:"sui_getObject", 
      params:[addr, { showContent: true }] 
    })
  });
  const j = await resp.json();
  return j.result;
}

// Fetch token metadata (decimals & symbol)
async function fetchMetadata(type) {
  const resp = await fetch(RPC, {
    method: "POST", 
    headers:{ "Content-Type": "application/json" },
    body: JSON.stringify({ 
      jsonrpc:"2.0", 
      id:1, 
      method:"suix_getCoinMetadata", 
      params:[type] 
    })
  });
  const j = await resp.json();
  return j.result;
}

// Format amount with proper decimals and special handling for AEON
function formatAmount(amount, decimals, isAeon = false, tokenInfo = null) {
  if (isAeon) {
    // Special handling for AEON: divide by 1e9 and add SUI logo
    const suiAmount = Number(amount) / 1000000000;
    return {
      display: `${suiAmount.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 })} <img src="https://imagedelivery.net/cBNDGgkrsEA-b_ixIp9SkQ/sui-coin.svg/public" alt="SUI" class="token-icon">`,
      note: "AEON only have SUI in treasury"
    };
  }
  
  if (tokenInfo) {
    // Format for SuiNS treasury tokens
    const n = BigInt(amount);
    const denom = BigInt(10) ** BigInt(decimals);
    const whole = n / denom;
    const frac = (n % denom).toString().padStart(decimals, '0').slice(0,6);
    const formattedWhole = whole.toLocaleString('en-US');
    return {
      display: `${formattedWhole}.${frac} <img src="${tokenInfo.logo}" alt="${tokenInfo.symbol}" class="token-icon">`,
      note: ""
    };
  }
  
  // Standard formatting for other tokens
  const n = BigInt(amount);
  const denom = BigInt(10) ** BigInt(decimals);
  const whole = n / denom;
  const frac = (n % denom).toString().padStart(decimals, '0').slice(0,6);
  const formattedWhole = whole.toLocaleString('en-US');
  return {
    display: `${formattedWhole}.${frac}`,
    note: ""
  };
}

// Update balances every 60 seconds
async function update() {
  const lastUpdate = document.getElementById("last-update");
  for (const t of TREASURIES) {
    const cont = document.getElementById(t.id + "-balances");
    try {
      cont.textContent = "Loading…";
      
      if (t.id === "aeon") {
        // Special handling for AEON treasury
        const obj = await fetchObject(t.address);
        if (obj && obj.data && obj.data.content && obj.data.content.fields) {
          const balance = obj.data.content.fields.balance;
          const { display, note } = formatAmount(balance, 9, true);
          cont.innerHTML = `
            <div class="balance-row">${display}</div>
            <div class="balance-note">${note}</div>
          `;
        } else {
          cont.innerHTML = "<div>No tokens</div>";
        }
      } else {
        // Standard handling for SuiNS treasury
        const bals = await fetchBalances(t.address);
        let html = "";
        // Process tokens in specific order
        for (const token of SUINS_TOKENS) {
          const balance = bals.find(b => b.coinType === token.type);
          if (balance) {
            const meta = await fetchMetadata(balance.coinType);
            const { display, note } = formatAmount(balance.totalBalance, meta.decimals, false, token);
            html += `
              <div class="balance-row">${display}</div>
              <div class="balance-note">${note}</div>
            `;
          }
        }
        cont.innerHTML = html || "<div>No tokens</div>";
      }
    } catch (e) {
      console.error("Error:", e);
      cont.innerHTML = `<span class="error">Error</span>`;
    }
  }
  // Update timestamp
  const now = new Date();
  const dt = now.toLocaleDateString() + " " + now.toLocaleTimeString();
  lastUpdate.textContent = `Last update: ${dt}`;
}

// Initial update and set interval for every 60 seconds
update();
setInterval(update, 60000);
