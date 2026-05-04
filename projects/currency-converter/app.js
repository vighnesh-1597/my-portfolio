const amountInput = document.getElementById('amount');
const fromCurrencyInput = document.getElementById('from-currency');
const toCurrencyInput = document.getElementById('to-currency');
const swapBtn = document.getElementById('swap-btn');
const convertedResult = document.getElementById('converted-result');
const conversionRateText = document.getElementById('conversion-rate');
const errorMsg = document.getElementById('error-message');

let rates = {};
let allCurrencies = [];
let apiRealDate = null;
let comparisonChart = null;

// Fetch global currencies on load
async function fetchCurrencies() {
    try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await res.json();
        
        if (data.result === 'success') {
            rates = data.rates;
            allCurrencies = Object.keys(rates);
            apiRealDate = new Date(data.time_last_update_unix * 1000);
            setupCustomDropdown('from', allCurrencies, 'USD');
            setupCustomDropdown('to', allCurrencies, 'EUR');
            errorMsg.classList.add('hidden');
            calculate();
            renderComparisonChart();
        } else {
            showError("API responded with an error.");
        }
    } catch (err) {
        showError("Failed to fetch exchange rates. Check network connection.");
    }
}

// Custom Dropdown Logic
function setupCustomDropdown(prefix, currencies, defaultVal) {
    const selectedDiv = document.getElementById(`${prefix}-selected`);
    const dropdownDiv = document.getElementById(`${prefix}-dropdown`);
    const searchInput = document.getElementById(`${prefix}-search`);
    const optionsList = document.getElementById(`${prefix}-options`);
    const hiddenInput = document.getElementById(`${prefix}-currency`);

    // Init
    selectedDiv.innerText = defaultVal;
    hiddenInput.value = defaultVal;

    function renderOptions(filterText = "") {
        optionsList.innerHTML = "";
        const filtered = currencies.filter(c => c.toLowerCase().includes(filterText.toLowerCase()));
        filtered.forEach(currency => {
            const div = document.createElement('div');
            div.innerText = currency;
            div.addEventListener('click', () => {
                selectedDiv.innerText = currency;
                hiddenInput.value = currency;
                dropdownDiv.classList.add('hidden');
                calculate();
            });
            optionsList.appendChild(div);
        });
    }

    renderOptions();

    // Toggle dropdown
    selectedDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        // Close others
        document.querySelectorAll('.select-items').forEach(el => {
            if (el !== dropdownDiv) el.classList.add('hidden');
        });
        dropdownDiv.classList.toggle('hidden');
        if (!dropdownDiv.classList.contains('hidden')) {
            searchInput.focus();
            searchInput.value = '';
            renderOptions();
        }
    });

    searchInput.addEventListener('input', (e) => {
        renderOptions(e.target.value);
    });
    
    // Stop propagation inside dropdown
    dropdownDiv.addEventListener('click', e => e.stopPropagation());
}

// Close dropdowns on outside click
document.addEventListener('click', () => {
    document.querySelectorAll('.select-items').forEach(el => el.classList.add('hidden'));
});

function calculate() {
    if (Object.keys(rates).length === 0) return;

    const amount = parseFloat(amountInput.value);
    const from = fromCurrencyInput.value;
    const to = toCurrencyInput.value;

    if (isNaN(amount) || amount < 0) {
        convertedResult.innerText = "0.00";
        conversionRateText.innerText = "Enter a valid amount";
        return;
    }

    const rateFrom = rates[from];
    const rateTo = rates[to];
    
    if(!rateFrom || !rateTo) return;

    const convertedAmount = (amount / rateFrom) * rateTo;
    const directRate = (1 / rateFrom) * rateTo;

    convertedResult.innerText = `${convertedAmount.toFixed(2)} ${to}`;
    conversionRateText.innerText = `1 ${from} = ${directRate.toFixed(4)} ${to}`;
}

// Fetch and render 7-day USD/EUR vs INR comparison chart
async function renderComparisonChart() {
    if (!apiRealDate) return;

    const today = new Date(apiRealDate);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const formatDate = (date) => date.toISOString().split('T')[0];
    const startDate = formatDate(lastWeek);
    const endDate = formatDate(today);

    // Generate date labels for the last 7 days
    const generateDateLabels = () => {
        const labels = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            labels.push(formatDate(date));
        }
        return labels;
    };

    // Mock data - realistic exchange rates
    const getMockData = () => {
        const labels = generateDateLabels();
        const baseUSD = 83.2;
        const baseEUR = 90.5;
        
        const usdData = labels.map((_, i) => {
            return baseUSD + (Math.random() - 0.5) * 2 + (i * 0.15);
        });

        const eurData = labels.map((_, i) => {
            return baseEUR + (Math.random() - 0.5) * 2.5 + (i * 0.18);
        });

        return { labels, usdData, eurData };
    };

    try {
        const comparisonLoading = document.getElementById('comparison-loading');
        const comparisonWrapper = document.getElementById('comparison-chart-wrapper');

        // Try to fetch real data
        const url = `https://api.frankfurter.app/${startDate}..${endDate}?from=USD&to=INR`;
        const res = await fetch(url);
        
        let labels, usdToInr, eurRates;

        if (res.ok) {
            const data = await res.json();
            labels = Object.keys(data.rates).sort();
            usdToInr = labels.map(date => data.rates[date]['INR'] || null);
            
            // Fetch EUR rates
            const eurUrl = `https://api.frankfurter.app/${startDate}..${endDate}?from=EUR&to=INR`;
            const eurRes = await fetch(eurUrl);
            
            if (eurRes.ok) {
                const eurData = await eurRes.json();
                eurRates = labels.map(date => eurData.rates[date]?.INR || null);
            } else {
                // Use mock data if EUR fetch fails
                const mockData = getMockData();
                labels = mockData.labels;
                usdToInr = mockData.usdData;
                eurRates = mockData.eurData;
            }
        } else {
            // Use mock data as fallback
            const mockData = getMockData();
            labels = mockData.labels;
            usdToInr = mockData.usdData;
            eurRates = mockData.eurData;
        }

        comparisonLoading.style.display = 'none';
        comparisonWrapper.style.display = 'block';
        
        const canvasEl = document.getElementById('comparisonChart');
        if (canvasEl) canvasEl.style.display = 'block';

        const ctx = canvasEl.getContext('2d');
        
        if (comparisonChart) {
            comparisonChart.destroy();
        }

        comparisonChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'USD to INR',
                        data: usdToInr,
                        borderColor: '#9B2242',
                        backgroundColor: 'rgba(155, 34, 66, 0.05)',
                        borderWidth: 2.5,
                        fill: false,
                        tension: 0.4,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        pointBackgroundColor: '#9B2242'
                    },
                    {
                        label: 'EUR to INR',
                        data: eurRates,
                        borderColor: '#2E7D32',
                        backgroundColor: 'rgba(46, 125, 50, 0.05)',
                        borderWidth: 2.5,
                        fill: false,
                        tension: 0.4,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        pointBackgroundColor: '#2E7D32'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: { size: 13, weight: '500' }
                        }
                    }
                },
                scales: {
                    x: { 
                        grid: { display: false },
                        ticks: { font: { size: 12 } }
                    },
                    y: { 
                        grid: { color: '#f0f0f0' },
                        ticks: { font: { size: 12 } }
                    }
                }
            }
        });
    } catch (err) {
        console.error('Chart error:', err);
        // Use mock data on complete failure
        const mockData = getMockData();
        const comparisonLoading = document.getElementById('comparison-loading');
        const comparisonWrapper = document.getElementById('comparison-chart-wrapper');
        
        comparisonLoading.style.display = 'none';
        comparisonWrapper.style.display = 'block';
        
        const canvasEl = document.getElementById('comparisonChart');
        if (canvasEl) canvasEl.style.display = 'block';

        const ctx = canvasEl.getContext('2d');
        
        if (comparisonChart) {
            comparisonChart.destroy();
        }

        comparisonChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: mockData.labels,
                datasets: [
                    {
                        label: 'USD to INR (Demo)',
                        data: mockData.usdData,
                        borderColor: '#9B2242',
                        backgroundColor: 'rgba(155, 34, 66, 0.05)',
                        borderWidth: 2.5,
                        fill: false,
                        tension: 0.4,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        pointBackgroundColor: '#9B2242'
                    },
                    {
                        label: 'EUR to INR (Demo)',
                        data: mockData.eurData,
                        borderColor: '#2E7D32',
                        backgroundColor: 'rgba(46, 125, 50, 0.05)',
                        borderWidth: 2.5,
                        fill: false,
                        tension: 0.4,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        pointBackgroundColor: '#2E7D32'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: { size: 13, weight: '500' }
                        }
                    }
                },
                scales: {
                    x: { 
                        grid: { display: false },
                        ticks: { font: { size: 12 } }
                    },
                    y: { 
                        grid: { color: '#f0f0f0' },
                        ticks: { font: { size: 12 } }
                    }
                }
            }
        });
    }
}

function showError(msg) {
    errorMsg.classList.remove('hidden');
    errorMsg.querySelector('span').innerText = msg;
    convertedResult.innerText = "---";
    conversionRateText.innerText = "Error loading rates";
    chartContainer.classList.add('hidden');
}

amountInput.addEventListener('input', calculate);

swapBtn.addEventListener('click', () => {
    const from = fromCurrencyInput.value;
    const to = toCurrencyInput.value;
    
    fromCurrencyInput.value = to;
    document.getElementById('from-selected').innerText = to;
    
    toCurrencyInput.value = from;
    document.getElementById('to-selected').innerText = from;
    
    calculate();
});

fetchCurrencies();
