// === CONSTANTS ===
const MAX_EXTRA_PAYMENT = 2000;
const EXTRA_PAYMENT_STEP = 50;
const CHART_COLORS = ['#457b9d', '#e63946', '#2a9d8f'];

// === LAYOUTS ===
const lightLayout = {
    plot_bgcolor: 'white',
    paper_bgcolor: 'white',
    font: { color: 'black' },
    xaxis: { gridcolor: '#e1e1e1', zerolinecolor: '#e1e1e1', titlefont: { color: 'black' }, tickfont: { color: 'black' }, },
    yaxis: { gridcolor: '#e1e1e1', zerolinecolor: '#e1e1e1', titlefont: { color: 'black' }, tickfont: { color: 'black' }, },
    legend: { font: { color: 'black' } },
};
const darkLayout = {
    plot_bgcolor: '#1a1a1a',
    paper_bgcolor: '#1a1a1a',
    font: { color: '#f0f0f0' },
    xaxis: { gridcolor: '#444', zerolinecolor: '#444', titlefont: { color: '#f0f0f0' }, tickfont: { color: '#f0f0f0' }, },
    yaxis: { gridcolor: '#444', zerolinecolor: '#444', titlefont: { color: '#f0f0f0' }, tickfont: { color: '#f0f0f0' }, },
    legend: { font: { color: '#f0f0f0' } },
};

// === UTILITY & HELPER FUNCTIONS ===
const getLayout = ({ title, xTitle, yTitle }, base) =>
    Object.assign({}, base, {
        title,
        xaxis: Object.assign({}, base.xaxis, { title: xTitle }),
        yaxis: Object.assign({}, base.yaxis, { title: yTitle }),
        height: 400,
    });

const createBarTrace = ({ x, y, name, color, text }) => ({
    x, y, name,
    type: 'bar',
    marker: { color },
    text,
    textposition: 'auto',
});

const createLineTrace = ({ x, y, name, color, mode = 'lines', fill }) => ({
    x, y, name,
    type: 'scatter',
    mode,
    line: { color },
    fill,
});

const formatNumber = number =>
    Number(number).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = date => {
    const options = { year: 'numeric', month: 'short' };
    return date.toLocaleDateString('en-US', options);
};

const showError = message => {
    let errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
};
const hideError = () => {
    let errorDiv = document.getElementById('error-message');
    errorDiv.style.display = 'none';
};

// === INPUT VALIDATION ===
const validateInputs = ({ principal, amortization, term, interestRate, extraPayment, firstPaymentDate }) => {
    if (
        [principal, amortization, term, interestRate, extraPayment]
            .some(v => typeof v !== "number" || isNaN(v))
    ) return "All numerical fields must be valid numbers.";
    if (principal <= 0 || amortization <= 0 || term <= 0 || interestRate < 0) return "Principal, amortization, and term must be positive.";
    if (extraPayment < 0) return "Extra payment cannot be negative.";
    if (firstPaymentDate && !/^\d{4}-\d{2}-\d{2}$/.test(firstPaymentDate)) return "Invalid date format.";
    return null;
};

// === MORTGAGE/AMORTIZATION CORE ===
const calculateMonthlyPayment = (principal, monthlyRate, numPayments) =>
    principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);

const computeAmortizationSchedule = (balance, monthlyRate, mortgagePayment, extraPayment, numPayments) => {
    const schedule = [];
    let remainingBalance = balance;
    for (let i = 1; i <= numPayments; i++) {
        const interestPayment = remainingBalance * monthlyRate;
        let principalPayment = mortgagePayment - interestPayment;
        let totalPrincipalPayment = principalPayment + extraPayment;
        let actualExtraPayment = extraPayment;
        if (remainingBalance - totalPrincipalPayment < 0) {
            totalPrincipalPayment = remainingBalance;
            principalPayment = totalPrincipalPayment > principalPayment ? principalPayment : totalPrincipalPayment - extraPayment;
            actualExtraPayment = totalPrincipalPayment - principalPayment;
            if (principalPayment < 0) {
                principalPayment = 0;
                actualExtraPayment = totalPrincipalPayment;
            }
        }
        remainingBalance -= totalPrincipalPayment;
        schedule.push({
            paymentNumber: i,
            paymentYear: i / 12,
            interestPayment,
            principalPayment,
            extraPayment: actualExtraPayment,
            totalPrincipalPayment,
            remainingBalance: remainingBalance < 0 ? 0 : remainingBalance,
        });
        if (remainingBalance <= 0) break;
    }
    return schedule;
};

// === CHARTS ===

// -- Donut Chart
const plotDonut = (schedule, layout) => {
    if (!schedule || !schedule.length) return showError("No amortization data.");
    const [principalPayment, interestPayment, extraPayment] = [
        schedule[0].principalPayment,
        schedule[0].interestPayment,
        schedule[0].extraPayment
    ];
    Plotly.newPlot('paymentBreakdownCircle', [{
        type: 'pie',
        labels: ['Principal', 'Interest', 'Extra Payment'],
        values: [principalPayment, interestPayment, extraPayment],
        hole: 0.6,
        marker: { colors: CHART_COLORS },
        textinfo: 'none',
        hoverinfo: 'label+percent+value',
        hovertemplate: '<b>%{label}</b>: $%{value:.2f} (%{percent})<extra></extra>'
    }], Object.assign({}, layout, {
        showlegend: true,
        legend: Object.assign({}, layout.legend, {
            orientation: 'h', x: 0.5, xanchor: 'center', y: -0.1
        }),
        margin: { t: 40, b: 40, l: 40, r: 40 },
        annotations: [{
            text: 'First Payment<br>Breakdown',
            showarrow: false,
            font: { size: 16, color: layout.font.color },
            x: 0.5, y: 0.5
        }],
    }), { responsive: true });
};

// -- Payment Breakdown (stacked bar)
const plotPaymentBreakdown = (schedule, layout) => {
    const data = schedule.map(p => ({
        x: p.paymentYear,
        y: [p.principalPayment, p.interestPayment, p.extraPayment]
    }));
    const xValues = data.map((d) => d.x.toFixed(2));
    Plotly.newPlot('chart', [
        createBarTrace({ x: xValues, y: data.map(d => d.y[1]), name: 'Interest', color: CHART_COLORS[1], text: data.map(d => `$${formatNumber(d.y[1])}`) }),
        createBarTrace({ x: xValues, y: data.map(d => d.y[0]), name: 'Principal', color: CHART_COLORS[0], text: data.map(d => `$${formatNumber(d.y[0])}`) }),
        createBarTrace({ x: xValues, y: data.map(d => d.y[2]), name: 'Extra Payment', color: CHART_COLORS[2], text: data.map(d => `$${formatNumber(d.y[2])}`) }),
    ], Object.assign({}, layout, {
        barmode: 'stack'
    }, getLayout({ title: 'Mortgage Payment Breakdown', xTitle: 'Year', yTitle: 'Payment Amount' }, layout)), { responsive: true });
};

// -- Cumulative Payments
const plotCumulativeChart = (schedule, layout) => {
    const cumulativePayments = [];
    let totalPayment = 0;
    schedule.forEach((p) => {
        totalPayment += Math.max(0, p.principalPayment + p.interestPayment + p.extraPayment);
        cumulativePayments.push({ x: p.paymentYear, y: totalPayment });
    });
    const xValues = cumulativePayments.map((d) => parseFloat(d.x.toFixed(2)));
    const yValues = cumulativePayments.map((d) => parseFloat(d.y.toFixed(2)));
    Plotly.newPlot('chart2', [createLineTrace({
        x: xValues, y: yValues, name: 'Cumulative Payments', color: CHART_COLORS[0], mode: 'lines+markers'
    })], getLayout({ title: 'Cumulative Payments Over Time', xTitle: 'Year', yTitle: 'Total Payments' }, layout), { responsive: true });
};

// -- Equity Build-up
const plotEquityBuildUp = (schedule, principal, layout) => {
    const equityData = schedule.map(p => ({
        x: p.paymentYear.toFixed(2),
        y: (principal - p.remainingBalance).toFixed(2)
    }));
    const xValues = equityData.map((d) => parseFloat(d.x));
    const yValues = equityData.map((d) => parseFloat(d.y));
    Plotly.newPlot('chart4', [createLineTrace({
        x: xValues, y: yValues, name: 'Home Equity', color: CHART_COLORS[2], mode: 'lines'
    })], getLayout({ title: 'Equity Build-up Over Time', xTitle: 'Year', yTitle: 'Equity' }, layout), { responsive: true });
};

// -- Interest vs Principal Components
const plotInterestPrincipalComponents = (schedule, layout) => {
    const xValues = schedule.map(p => parseFloat(p.paymentYear.toFixed(2)));
    const principalPayments = schedule.map(p => p.principalPayment + p.extraPayment);
    const interestPayments = schedule.map(p => p.interestPayment);
    Plotly.newPlot('chart6', [
        createLineTrace({ x: xValues, y: interestPayments, name: 'Interest', color: CHART_COLORS[1], fill: 'tozeroy' }),
        createLineTrace({ x: xValues, y: principalPayments, name: 'Principal + Extra', color: CHART_COLORS[0], fill: 'tonexty' })
    ], getLayout({ title: 'Interest vs Principal Components Over Time', xTitle: 'Year', yTitle: 'Payment Amount ($)' }, layout), { responsive: true });
};

// -- Annual Payment Summary (stacked bar)
const plotAnnualPaymentSummary = (schedule, layout) => {
    const annualData = {};
    schedule.forEach((p) => {
        const year = Math.ceil(p.paymentYear);
        if (!annualData[year]) annualData[year] = { principal: 0, interest: 0, extra: 0 };
        annualData[year].principal += p.principalPayment;
        annualData[year].interest += p.interestPayment;
        annualData[year].extra += p.extraPayment;
    });
    const years = Object.keys(annualData).map(y => parseInt(y));
    const principalPayments = years.map(y => annualData[y].principal);
    const interestPayments = years.map(y => annualData[y].interest);
    const extraPayments = years.map(y => annualData[y].extra);
    Plotly.newPlot('chart11', [
        createBarTrace({ x: years, y: interestPayments.map(v=>+v.toFixed(2)), name: 'Interest', color: CHART_COLORS[1] }),
        createBarTrace({ x: years, y: principalPayments.map(v=>+v.toFixed(2)), name: 'Principal', color: CHART_COLORS[0] }),
        createBarTrace({ x: years, y: extraPayments.map(v=>+v.toFixed(2)), name: 'Extra Payment', color: CHART_COLORS[2] }),
    ], Object.assign({}, layout, {
        barmode: 'stack'
    }, getLayout({ title: 'Annual Payment Summary', xTitle: 'Year', yTitle: 'Payment Amount' }, layout)), { responsive: true });
};

// -- Extra Payment Effect on Loan Term
const plotExtraPaymentEffectOnLoanTerm = (principal, monthlyRate, numPayments, layout) => {
    const extraPayments = [];
    const loanTerms = [];
    for (let extra = 0; extra <= MAX_EXTRA_PAYMENT; extra += EXTRA_PAYMENT_STEP) {
        const mortgagePayment = calculateMonthlyPayment(principal, monthlyRate, numPayments);
        const schedule = computeAmortizationSchedule(principal, monthlyRate, mortgagePayment, extra, numPayments);
        loanTerms.push(parseFloat((schedule.length / 12).toFixed(2)));
        extraPayments.push(extra);
    }
    Plotly.newPlot('chart12', [
        createLineTrace({ x: extraPayments, y: loanTerms, name: 'Loan Term Reduction', color: CHART_COLORS[2], mode: 'lines+markers' }),
    ], getLayout({ title: 'Effect of Extra Payments on Loan Term', xTitle: 'Extra Payment Amount ($)', yTitle: 'Loan Term (Years)' }, layout), { responsive: true });
};

// -- Extra Payment Effect on Total Interest Paid
const plotExtraPaymentEffectOnTotalInterest = (principal, monthlyRate, numPayments, layout) => {
    const extraPayments = [];
    const totalInterests = [];
    for (let extra = 0; extra <= MAX_EXTRA_PAYMENT; extra += EXTRA_PAYMENT_STEP) {
        const mortgagePayment = calculateMonthlyPayment(principal, monthlyRate, numPayments);
        const schedule = computeAmortizationSchedule(principal, monthlyRate, mortgagePayment, extra, numPayments);
        totalInterests.push(parseFloat(schedule.reduce((sum, p) => sum + p.interestPayment, 0).toFixed(2)));
        extraPayments.push(extra);
    }
    Plotly.newPlot('chart13', [
        createLineTrace({ x: extraPayments, y: totalInterests, name: 'Total Interest Reduction', color: CHART_COLORS[1], mode: 'lines+markers' }),
    ], getLayout({ title: 'Effect of Extra Payments on Total Interest Paid', xTitle: 'Extra Payment Amount ($)', yTitle: 'Total Interest Paid ($)' }, layout), { responsive: true });
};

// -- Comparison charts: Remaining Balance, Total Interest, Loan Term, Interest Savings, Total Payments, Equity
const plotRemainingBalanceComparison = (scheduleWithoutExtra, scheduleWithExtra, layout) => {
    const xValuesWithout = scheduleWithoutExtra.map((d) => parseFloat(d.paymentYear.toFixed(2)));
    const yValuesWithout = scheduleWithoutExtra.map((d) => parseFloat(d.remainingBalance.toFixed(2)));
    const xValuesWith = scheduleWithExtra.map((d) => parseFloat(d.paymentYear.toFixed(2)));
    const yValuesWith = scheduleWithExtra.map((d) => parseFloat(d.remainingBalance.toFixed(2)));
    Plotly.newPlot('chart3', [
        createLineTrace({ x: xValuesWithout, y: yValuesWithout, name: 'Without Extra Payments', color: CHART_COLORS[1] }),
        createLineTrace({ x: xValuesWith, y: yValuesWith, name: 'With Extra Payments', color: CHART_COLORS[2] })
    ], getLayout({ title: 'Remaining Balance Over Time', xTitle: 'Year', yTitle: 'Remaining Balance ($)' }, layout), { responsive: true });
};

const plotTotalInterestComparison = (totalInterestWithout, totalInterestWith, layout) => {
    Plotly.newPlot('chart7', [createBarTrace({
        x: ['Without Extra Payments', 'With Extra Payments'],
        y: [parseFloat(totalInterestWithout.toFixed(2)), parseFloat(totalInterestWith.toFixed(2))],
        name: 'Interest Comparison',
        color: [CHART_COLORS[1], CHART_COLORS[2]],
        text: [`$${formatNumber(totalInterestWithout)}`, `$${formatNumber(totalInterestWith)}`]
    })], getLayout({ title: 'Total Interest Paid Comparison', xTitle: 'Scenario', yTitle: 'Total Interest Paid ($)' }, layout), { responsive: true });
};

const plotLoanTermComparison = (termWithout, termWith, layout) => {
    const yearsWithout = (termWithout / 12).toFixed(2), yearsWith = (termWith / 12).toFixed(2);
    Plotly.newPlot('chart8', [createBarTrace({
        x: ['Without Extra Payments', 'With Extra Payments'],
        y: [parseFloat(yearsWithout), parseFloat(yearsWith)],
        name: 'Loan Term Comparison',
        color: [CHART_COLORS[1], CHART_COLORS[2]],
        text: [`${yearsWithout} years`, `${yearsWith} years`]
    })], getLayout({ title: 'Loan Term Comparison', xTitle: 'Scenario', yTitle: 'Loan Term (Years)' }, layout), { responsive: true });
};

const plotInterestSavingsOverTime = (scheduleWithoutExtra, scheduleWithExtra, layout) => {
    const xValues = [], interestSavings = [];
    let cumulativeInterestWithout = 0, cumulativeInterestWith = 0;
    const maxLength = Math.max(scheduleWithoutExtra.length, scheduleWithExtra.length);
    for (let i = 0; i < maxLength; i++) {
        cumulativeInterestWithout += scheduleWithoutExtra[i] ? scheduleWithoutExtra[i].interestPayment : 0;
        cumulativeInterestWith += scheduleWithExtra[i] ? scheduleWithExtra[i].interestPayment : 0;
        xValues.push((i + 1) / 12);
        interestSavings.push(cumulativeInterestWithout - cumulativeInterestWith);
    }
    Plotly.newPlot('chart9', [
        createLineTrace({ x: xValues.map(x=>+x.toFixed(2)), y: interestSavings.map(s=>+s.toFixed(2)), name: 'Interest Savings', color: CHART_COLORS[2] })
    ], getLayout({ title: 'Cumulative Interest Savings Over Time', xTitle: 'Year', yTitle: 'Interest Savings ($)' }, layout), { responsive: true });
};

const plotTotalPaymentsComparison = (scheduleWithoutExtra, scheduleWithExtra, principal, layout) => {
    const totalPaidWithout = scheduleWithoutExtra.reduce((sum, p) => sum + p.interestPayment + p.principalPayment, 0);
    const totalPaidWith = scheduleWithExtra.reduce((sum, p) => sum + p.interestPayment + p.principalPayment + p.extraPayment, 0);
    Plotly.newPlot('chart10', [createBarTrace({
        x: ['Without Extra Payments', 'With Extra Payments'],
        y: [parseFloat(totalPaidWithout.toFixed(2)), parseFloat(totalPaidWith.toFixed(2))],
        name: 'Total Payments Comparison',
        color: [CHART_COLORS[1], CHART_COLORS[2]],
        text: [`$${formatNumber(totalPaidWithout)}`, `$${formatNumber(totalPaidWith)}`]
    })], getLayout({ title: 'Total Payments Comparison', xTitle: 'Scenario', yTitle: 'Total Amount Paid ($)' }, layout), { responsive: true });
};

const plotEquityComparisonOverTime = (scheduleWithoutExtra, scheduleWithExtra, principal, layout) => {
    const xValuesWithout = scheduleWithoutExtra.map(p => parseFloat(p.paymentYear.toFixed(2)));
    const equityWithout = scheduleWithoutExtra.map(p => parseFloat((principal - p.remainingBalance).toFixed(2)));
    const xValuesWith = scheduleWithExtra.map(p => parseFloat(p.paymentYear.toFixed(2)));
    const equityWith = scheduleWithExtra.map(p => parseFloat((principal - p.remainingBalance).toFixed(2)));
    Plotly.newPlot('chart14', [
        createLineTrace({ x: xValuesWithout, y: equityWithout, name: 'Without Extra Payments', color: CHART_COLORS[1] }),
        createLineTrace({ x: xValuesWith, y: equityWith, name: 'With Extra Payments', color: CHART_COLORS[2] })
    ], getLayout({ title: 'Cumulative Equity Over Time', xTitle: 'Year', yTitle: 'Cumulative Equity ($)' }, layout), { responsive: true });
};

// === MAIN CALCULATION HANDLER ===
const calculateMortgage = event => {
    if (event) event.preventDefault();
    hideError();

    // Gather inputs
    const getVal = id => document.getElementById(id).value;
    const principal = parseFloat(getVal("principal"));
    const amortization = parseFloat(getVal("amortization"));
    const term = parseFloat(getVal("term"));
    const interestRate = parseFloat(getVal("interestRate").replace('%', '')) / 100;
    const extraPayment = parseFloat(getVal("extraPayment"));
    const firstPaymentDate = getVal("firstPaymentDate");

    const validationMsg = validateInputs({ principal, amortization, term, interestRate, extraPayment, firstPaymentDate });
    if (validationMsg) { showError(validationMsg); return; }

    const monthlyRate = interestRate / 12;
    const numPayments = Math.round(amortization * 12);
    const mortgagePayment = calculateMonthlyPayment(principal, monthlyRate, numPayments);

    // Display monthly payment
    const monthlyPaymentFormatted = `$${formatNumber(mortgagePayment.toFixed(2))}`;
    const monthlyPaymentCircle = document.getElementById("monthlyPaymentCircle");
    monthlyPaymentCircle.textContent = monthlyPaymentFormatted;
    monthlyPaymentCircle.classList.remove('visible');
    void monthlyPaymentCircle.offsetWidth;
    monthlyPaymentCircle.classList.add('visible');

    // Schedule calculations
    const scheduleWithExtra = computeAmortizationSchedule(principal, monthlyRate, mortgagePayment, extraPayment, numPayments);
    const isDarkMode = document.body.classList.contains('dark-mode');
    const currentLayout = isDarkMode ? darkLayout : lightLayout;

    // Main charts
    plotPaymentBreakdown(scheduleWithExtra, currentLayout);
    plotCumulativeChart(scheduleWithExtra, currentLayout);
    plotEquityBuildUp(scheduleWithExtra, principal, currentLayout);
    plotDonut(scheduleWithExtra, currentLayout);
    plotInterestPrincipalComponents(scheduleWithExtra, currentLayout);
    plotAnnualPaymentSummary(scheduleWithExtra, currentLayout);
    plotExtraPaymentEffectOnLoanTerm(principal, monthlyRate, numPayments, currentLayout);
    plotExtraPaymentEffectOnTotalInterest(principal, monthlyRate, numPayments, currentLayout);

    // Comparison charts (when extra payment entered)
    let scheduleWithoutExtra = null;
    if (extraPayment > 0) {
        scheduleWithoutExtra = computeAmortizationSchedule(principal, monthlyRate, mortgagePayment, 0, numPayments);

        // Interest saved
        const totalInterestPaidWithoutExtra = scheduleWithoutExtra.reduce((sum, p) => sum + p.interestPayment, 0);
        const totalInterestPaidWithExtra = scheduleWithExtra.reduce((sum, p) => sum + p.interestPayment, 0);
        const extraSavedTotal = totalInterestPaidWithoutExtra - totalInterestPaidWithExtra;
        document.getElementById("extraSavedTotal").value = `$${formatNumber(extraSavedTotal)}`;

        // Loan term reductions
        const loanPaidOffInYears = (scheduleWithExtra.length / 12).toFixed(2);
        const totalLoanYears = (numPayments / 12).toFixed(2);
        document.getElementById("paidOffIn").value = `${loanPaidOffInYears} years`;
        document.getElementById("outOf").value = `${totalLoanYears} years`;

        // Plot comparison charts
        plotRemainingBalanceComparison(scheduleWithoutExtra, scheduleWithExtra, currentLayout);
        plotTotalInterestComparison(totalInterestPaidWithoutExtra, totalInterestPaidWithExtra, currentLayout);
        plotLoanTermComparison(scheduleWithoutExtra.length, scheduleWithExtra.length, currentLayout);
        plotInterestSavingsOverTime(scheduleWithoutExtra, scheduleWithExtra, currentLayout);
        plotTotalPaymentsComparison(scheduleWithoutExtra, scheduleWithExtra, principal, currentLayout);
        plotEquityComparisonOverTime(scheduleWithoutExtra, scheduleWithExtra, principal, currentLayout);
        showComparisonCharts(true);
    } else {
        clearComparisonCharts();
        showComparisonCharts(false);
        document.getElementById("extraSavedTotal").value = "$0.00";
        document.getElementById("paidOffIn").value = `${(numPayments / 12).toFixed(2)} years`;
        document.getElementById("outOf").value = `${(numPayments / 12).toFixed(2)} years`;
    }

    createAmortizationTable(scheduleWithExtra, mortgagePayment, extraPayment, firstPaymentDate);
    resizeAllCharts();
};

// === TABLE RENDERING WITH ACCESSIBILITY & PERFORMANCE ===
const createAmortizationTable = (schedule, mortgagePayment, extraPayment, firstPaymentDate) => {
    const tableBody = document.querySelector("#amortization-table tbody");
    tableBody.innerHTML = '';
    let fragment = document.createDocumentFragment();
    let totalInterest = 0, totalPrincipal = 0, totalExtraPayments = 0;
    let currentDate = null;
    if (firstPaymentDate) {
        const [year, month, day] = firstPaymentDate.split('-').map(Number);
        currentDate = new Date(year, month - 1, day);
    }
    schedule.forEach(p => {
        totalInterest += p.interestPayment;
        totalPrincipal += p.principalPayment;
        totalExtraPayments += p.extraPayment;
        const row = document.createElement('tr');
        const paymentCell = document.createElement('td');
        paymentCell.textContent = currentDate ? formatDate(currentDate) : `Payment ${p.paymentNumber}`;
        if (currentDate) currentDate.setMonth(currentDate.getMonth() + 1);
        row.appendChild(paymentCell);
        row.innerHTML += `
            <td>$${formatNumber((p.principalPayment + p.interestPayment + p.extraPayment))}</td>
            <td>$${formatNumber(p.extraPayment)}</td>
            <td>$${formatNumber(p.principalPayment)}</td>
            <td>$${formatNumber(p.interestPayment)}</td>
            <td>$${formatNumber(p.remainingBalance)}</td>
        `;
        fragment.appendChild(row);
    });
    // Totals row
    const summaryRow = document.createElement('tr');
    summaryRow.innerHTML = `
        <td colspan="2"><strong>Totals</strong></td>
        <td><strong>$${formatNumber(totalExtraPayments)}</strong></td>
        <td><strong>$${formatNumber(totalPrincipal)}</strong></td>
        <td><strong>$${formatNumber(totalInterest)}</strong></td>
        <td><strong>N/A</strong></td>
    `;
    fragment.appendChild(summaryRow);
    tableBody.appendChild(fragment);
};

// === MISC ===
const resizeAllCharts = () => {
    [
        'chart', 'chart2', 'chart4', 'chart6', 'chart11', 'chart12', 'chart13',
        'chart3', 'chart7', 'chart8', 'chart9', 'chart10', 'chart14',
        'paymentBreakdownCircle'
    ].forEach(chartId => {
        const chartDiv = document.getElementById(chartId);
        if (chartDiv && chartDiv.style.display !== 'none') Plotly.Plots.resize(chartDiv);
    });
};
const showComparisonCharts = show => {
    ['comp-chart3-box','comp-chart7-box','comp-chart8-box','comp-chart9-box','comp-chart10-box','comp-chart14-box'].forEach(id=>{
        const chartDiv = document.getElementById(id);
        if (chartDiv) chartDiv.style.display = show ? 'block' : 'none';
    });
};
const clearComparisonCharts = () => {
    ['chart3','chart7','chart8','chart9','chart10','chart14'].forEach(id => { Plotly.purge(id); });
};
const clearDate = () => {
    document.getElementById("firstPaymentDate").value = "";
    calculateMortgage(new Event('submit'));
};
const printCharts = () => {
    calculateMortgage();
    document.body.classList.add('print-charts');
    window.print();
};
const printAmortizationSchedule = () => {
    calculateMortgage();
    document.body.classList.add('print-schedule');
    window.print();
};
window.addEventListener('afterprint', () => {
    document.body.classList.remove('print-charts', 'print-schedule');
});

// === INIT ===
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById("mortgageForm");
    form.addEventListener("submit", calculateMortgage);
    document.getElementById("clearDateBtn").addEventListener("click", clearDate);

    const modeSwitch = document.getElementById('mode-switch');
    const body = document.body;
    body.classList.toggle('dark-mode', modeSwitch.checked);
    modeSwitch.addEventListener('change', () => {
        body.classList.toggle('dark-mode', modeSwitch.checked);
        calculateMortgage();
    });
    window.addEventListener('resize', resizeAllCharts);
    document.getElementById('printChartsBtn').addEventListener('click', printCharts);
    document.getElementById('printScheduleBtn').addEventListener('click', printAmortizationSchedule);
    document.getElementById('monthlyPaymentCircle').setAttribute('aria-live', 'polite');
    document.getElementById('paymentBreakdownCircle').setAttribute('aria-live', 'polite');

    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        document.getElementById('form-container').style.flexDirection = 'column';
        document.getElementById('form-container').style.alignItems = 'center';
        document.querySelector('.circles-container').style.flexDirection = 'column';
        document.querySelector('.circles-container').style.alignItems = 'center';
        document.querySelectorAll('input[type="number"], input[type="text"], input[type="date"]').forEach(input => {
            input.style.padding = '15px';
            input.style.fontSize = '18px';
        });
        document.querySelectorAll('button').forEach(button => {
            button.style.padding = '15px';
            button.style.fontSize = '18px';
        });
        document.querySelectorAll('.monthly-payment-circle, .payment-breakdown-circle').forEach(circle => {
            circle.style.width = '250px';
            circle.style.height = '250px';
        });
    }
    calculateMortgage();
});
