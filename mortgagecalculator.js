/* mortgagecalculator.js */

// Layout configurations for Plotly charts
const lightLayout = {
    plot_bgcolor: 'white',
    paper_bgcolor: 'white',
    font: { color: 'black' },
    xaxis: {
        gridcolor: '#e1e1e1',
        zerolinecolor: '#e1e1e1',
        titlefont: { color: 'black' },
        tickfont: { color: 'black' },
    },
    yaxis: {
        gridcolor: '#e1e1e1',
        zerolinecolor: '#e1e1e1',
        titlefont: { color: 'black' },
        tickfont: { color: 'black' },
    },
    legend: {
        font: { color: 'black' },
    },
};

const darkLayout = {
    plot_bgcolor: '#1a1a1a',
    paper_bgcolor: '#1a1a1a',
    font: { color: '#f0f0f0' },
    xaxis: {
        gridcolor: '#444',
        zerolinecolor: '#444',
        titlefont: { color: '#f0f0f0' },
        tickfont: { color: '#f0f0f0' },
    },
    yaxis: {
        gridcolor: '#444',
        zerolinecolor: '#444',
        titlefont: { color: '#f0f0f0' },
        tickfont: { color: '#f0f0f0' },
    },
    legend: {
        font: { color: '#f0f0f0' },
    },
};

/**
 * Calculates the mortgage based on user inputs and updates the UI accordingly.
 * @param {Event} event - The form submission event.
 */
function calculateMortgage(event) {
    if (event) event.preventDefault();

    // Retrieve and parse user inputs
    const principal = parseFloat(document.getElementById("principal").value);
    const amortization = parseFloat(document.getElementById("amortization").value);
    const term = parseFloat(document.getElementById("term").value);
    const interestRate = parseFloat(document.getElementById("interestRate").value.replace('%', '')) / 100;
    const extraPayment = parseFloat(document.getElementById("extraPayment").value);
    const firstPaymentDate = document.getElementById("firstPaymentDate").value;

    // Validate inputs
    if (isNaN(principal) || isNaN(amortization) || isNaN(term) || isNaN(interestRate) || isNaN(extraPayment)) {
        alert("Please enter valid numbers for all fields.");
        return;
    }

    const monthlyRate = interestRate / 12;
    const numPayments = Math.round(amortization * 12);

    // Calculate the standard mortgage payment
    const mortgagePayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
        (Math.pow(1 + monthlyRate, numPayments) - 1);

    // Display the Monthly Payment in the Circle
    const monthlyPaymentFormatted = `$${formatNumber(mortgagePayment.toFixed(2))}`;
    const monthlyPaymentCircle = document.getElementById("monthlyPaymentCircle");
    monthlyPaymentCircle.textContent = monthlyPaymentFormatted;

    // Optional: Trigger fade-in effect for the monthly payment circle
    monthlyPaymentCircle.classList.remove('visible'); // Reset visibility
    void monthlyPaymentCircle.offsetWidth; // Trigger reflow
    monthlyPaymentCircle.classList.add('visible'); // Fade in

    // Compute amortization schedule with extra payments
    const scheduleWithExtraTotal = computeAmortizationSchedule(principal, monthlyRate, mortgagePayment, extraPayment, numPayments);

    // Determine current theme for chart styling
    const isDarkMode = document.body.classList.contains('dark-mode');
    const currentLayout = isDarkMode ? darkLayout : lightLayout;

    // Plot various charts based on the schedule
    plotPaymentBreakdown(scheduleWithExtraTotal, currentLayout);
    plotCumulativeChart(scheduleWithExtraTotal, currentLayout);
    plotEquityBuildUp(scheduleWithExtraTotal, principal, currentLayout);

    // Plot the new Payment Breakdown Donut Chart
    plotPaymentBreakdownDonut(scheduleWithExtraTotal, currentLayout);

    let scheduleWithoutExtraTotal = null;
    if (extraPayment > 0) {
        // Compute amortization schedule without extra payments
        scheduleWithoutExtraTotal = computeAmortizationSchedule(principal, monthlyRate, mortgagePayment, 0, numPayments);

        // Calculate total interest paid in both scenarios
        const totalInterestPaidWithoutExtraTotal = scheduleWithoutExtraTotal.reduce((sum, p) => sum + p.interestPayment, 0);
        const totalInterestPaidWithExtraTotal = scheduleWithExtraTotal.reduce((sum, p) => sum + p.interestPayment, 0);

        const extraSavedTotal = totalInterestPaidWithoutExtraTotal - totalInterestPaidWithExtraTotal;

        // Update UI with interest saved
        document.getElementById("extraSavedTotal").value = `$${formatNumber(extraSavedTotal.toFixed(2))}`;

        // Calculate loan term reductions
        const loanPaidOffInYears = (scheduleWithExtraTotal.length / 12).toFixed(2);
        const totalLoanYears = (numPayments / 12).toFixed(2);
        document.getElementById("paidOffIn").value = `${loanPaidOffInYears} years`;
        document.getElementById("outOf").value = `${totalLoanYears} years`;

        // Plot comparison charts
        plotRemainingBalanceComparison(scheduleWithoutExtraTotal, scheduleWithExtraTotal, currentLayout);
        plotTotalInterestComparison(totalInterestPaidWithoutExtraTotal, totalInterestPaidWithExtraTotal, currentLayout);
        plotLoanTermComparison(scheduleWithoutExtraTotal.length, scheduleWithExtraTotal.length, currentLayout);
        plotInterestSavingsOverTime(scheduleWithoutExtraTotal, scheduleWithExtraTotal, currentLayout);
        plotTotalPaymentsComparison(scheduleWithoutExtraTotal, scheduleWithExtraTotal, principal, currentLayout);
        plotEquityComparisonOverTime(scheduleWithoutExtraTotal, scheduleWithExtraTotal, principal, currentLayout);

        // Show comparison charts
        showComparisonCharts(true);
    } else {
        // Hide comparison charts if no extra payment
        clearComparisonCharts();
        showComparisonCharts(false);

        // Reset UI fields related to extra payments
        document.getElementById("extraSavedTotal").value = "$0.00";
        document.getElementById("paidOffIn").value = `${(numPayments / 12).toFixed(2)} years`;
        document.getElementById("outOf").value = `${(numPayments / 12).toFixed(2)} years`;
    }

    // Plot additional charts
    plotInterestPrincipalComponents(scheduleWithExtraTotal, currentLayout);
    plotAnnualPaymentSummary(scheduleWithExtraTotal, currentLayout);
    plotExtraPaymentEffectOnLoanTerm(principal, monthlyRate, numPayments, currentLayout);
    plotExtraPaymentEffectOnTotalInterest(principal, monthlyRate, numPayments, currentLayout);

    // Generate amortization table
    createAmortizationTable(scheduleWithExtraTotal, mortgagePayment, extraPayment, firstPaymentDate);

    resizeAllCharts();
}

/**
 * Resizes all Plotly charts to fit their containers.
 */
function resizeAllCharts() {
    const chartIds = [
        'chart', 'chart2', 'chart4', 'chart6', 'chart11', 'chart12', 'chart13',
        'chart3', 'chart7', 'chart8', 'chart9', 'chart10', 'chart14',
        'paymentBreakdownCircle' // Include the donut chart if necessary
    ];

    chartIds.forEach(chartId => {
        const chartDiv = document.getElementById(chartId);
        if (chartDiv && chartDiv.style.display !== 'none') {
            Plotly.Plots.resize(chartDiv);
        }
    });
}

/**
 * Plots the payment breakdown as a donut chart using Plotly.
 * @param {Array} schedule - The amortization schedule.
 * @param {Object} layout - The Plotly layout configuration.
 */
function plotPaymentBreakdownDonut(schedule, layout) {
    // Check if schedule is not empty
    if (!schedule || schedule.length === 0) {
        console.error('Amortization schedule is empty or undefined.');
        return;
    }

    // Get the first payment's data
    const firstPayment = schedule[0];

    // Use the exact values from the first payment
    const principalPayment = firstPayment.principalPayment;
    const interestPayment = firstPayment.interestPayment;
    const extraPayment = firstPayment.extraPayment;

    // Prepare data for the donut chart
    const data = [{
        type: 'pie',
        labels: ['Principal', 'Interest', 'Extra Payment'],
        values: [principalPayment, interestPayment, extraPayment],
        hole: 0.6, // Makes it a donut chart
        marker: {
            colors: ['#457b9d', '#e63946', '#2a9d8f'] // Colors used in other charts
        },
        textinfo: 'none', // Hide labels inside the slices
        hoverinfo: 'label+percent+value',
        hovertemplate: '<b>%{label}</b>: $%{value:.2f} (%{percent})<extra></extra>' // Display amount and percentage
    }];

    // Define layout for the donut chart
    const chartLayout = Object.assign({}, layout, {
        showlegend: true, // Show legend to identify slices
        legend: Object.assign({}, layout.legend, {
            orientation: 'h',
            x: 0.5,
            xanchor: 'center',
            y: -0.1
        }),
        margin: { t: 40, b: 40, l: 40, r: 40 },
        annotations: [{
            text: 'First Payment<br>Breakdown',
            showarrow: false,
            font: {
                size: 16,
                color: layout.font.color
            },
            x: 0.5,
            y: 0.5
        }],
        paper_bgcolor: layout.paper_bgcolor,
        plot_bgcolor: layout.plot_bgcolor,
        font: {
            color: layout.font.color
        }
    });

    // Plot the donut chart with responsive configuration
    Plotly.newPlot('paymentBreakdownCircle', data, chartLayout, { responsive: true });
}

/**
 * Computes the amortization schedule.
 * @param {number} balance - The remaining balance.
 * @param {number} monthlyRate - The monthly interest rate.
 * @param {number} mortgagePayment - The standard mortgage payment.
 * @param {number} extraPayment - The extra monthly payment.
 * @param {number} numPayments - Total number of payments.
 * @returns {Array} The amortization schedule.
 */
function computeAmortizationSchedule(balance, monthlyRate, mortgagePayment, extraPayment, numPayments) {
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

        if (remainingBalance <= 0) {
            break;
        }
    }
    return schedule;
}

/**
 * Plots the mortgage payment breakdown using Plotly.
 * @param {Array} schedule - The amortization schedule.
 * @param {Object} layout - The Plotly layout configuration.
 */
function plotPaymentBreakdown(schedule, layout) {
    const data = schedule.map(p => ({
        x: p.paymentYear,
        y: [p.principalPayment, p.interestPayment, p.extraPayment]
    }));

    const xValues = data.map((d) => d.x.toFixed(2));

    const traceExtra = {
        x: xValues,
        y: data.map((d) => d.y[2]),
        name: 'Extra Payment',
        type: 'bar',
        text: data.map((d) => `$${formatNumber(d.y[2].toFixed(2))}`),
        textposition: 'auto',
        marker: { color: '#2a9d8f' }
    };

    const tracePrincipal = {
        x: xValues,
        y: data.map((d) => d.y[0]),
        name: 'Principal',
        type: 'bar',
        text: data.map((d) => `$${formatNumber(d.y[0].toFixed(2))}`),
        textposition: 'auto',
        marker: { color: '#457b9d' }
    };

    const traceInterest = {
        x: xValues,
        y: data.map((d) => d.y[1]),
        name: 'Interest',
        type: 'bar',
        text: data.map((d) => `$${formatNumber(d.y[1].toFixed(2))}`),
        textposition: 'auto',
        marker: { color: '#e63946' }
    };

    const chartLayout = Object.assign({}, layout, {
        barmode: 'stack',
        title: 'Mortgage Payment Breakdown',
        xaxis: Object.assign({}, layout.xaxis, {
            title: 'Year',
            tickmode: 'linear',
            dtick: 1
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Payment Amount',
        }),
        height: 400,
    });

    const config = { responsive: true };

    Plotly.newPlot('chart', [traceInterest, tracePrincipal, traceExtra], chartLayout, config);
}

/**
 * Plots the cumulative payments over time using Plotly.
 * @param {Array} schedule - The amortization schedule.
 * @param {Object} layout - The Plotly layout configuration.
 */
function plotCumulativeChart(schedule, layout) {
    const cumulativePayments = [];
    let totalPayment = 0;

    schedule.forEach((p) => {
        totalPayment += Math.max(0, p.principalPayment + p.interestPayment + p.extraPayment);
        cumulativePayments.push({ x: p.paymentYear, y: totalPayment });
    });

    const xValues = cumulativePayments.map((d) => parseFloat(d.x.toFixed(2)));
    const yValues = cumulativePayments.map((d) => parseFloat(d.y.toFixed(2)));

    const trace = {
        x: xValues,
        y: yValues,
        name: 'Cumulative Payments',
        type: 'scatter',
        mode: 'lines+markers',
        marker: { color: '#457b9d' }
    };

    const chartLayout = Object.assign({}, layout, {
        title: 'Cumulative Payments Over Time',
        xaxis: Object.assign({}, layout.xaxis, {
            title: 'Year',
            tickmode: 'linear',
            dtick: 1,
            zeroline: false
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Total Payments',
        }),
        height: 400,
        paper_bgcolor: layout.paper_bgcolor,
        plot_bgcolor: layout.plot_bgcolor,
        font: {
            color: layout.font.color
        }
    });

    const config = { responsive: true };

    Plotly.newPlot('chart2', [trace], chartLayout, config);
}

/**
 * Plots the equity build-up over time using Plotly.
 * @param {Array} schedule - The amortization schedule.
 * @param {number} principal - The initial principal amount.
 * @param {Object} layout - The Plotly layout configuration.
 */
function plotEquityBuildUp(schedule, principal, layout) {
    const equityData = schedule.map(p => ({
        x: p.paymentYear.toFixed(2),
        y: (principal - p.remainingBalance).toFixed(2)
    }));

    const xValues = equityData.map((d) => parseFloat(d.x));
    const yValues = equityData.map((d) => parseFloat(d.y));

    const trace = {
        x: xValues,
        y: yValues,
        name: 'Home Equity',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#2a9d8f' }
    };

    const xStart = 0;
    const xEnd = Math.max(...xValues);
    const xPadding = (xEnd - xStart) * 0.05;
    const yStart = 0;
    const yEnd = Math.max(...yValues);
    const yPadding = yEnd * 0.05;

    const chartLayout = Object.assign({}, layout, {
        title: 'Equity Build-up Over Time',
        xaxis: Object.assign({}, layout.xaxis, {
            title: 'Year',
            tickmode: 'linear',
            dtick: 1,
            range: [Math.max(0, xStart - xPadding), xEnd + xPadding],
            zeroline: false
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Equity',
            range: [yStart - yPadding, yEnd + yPadding]
        }),
        height: 400,
    });

    const config = { responsive: true };

    Plotly.newPlot('chart4', [trace], chartLayout, config);
}

/**
 * Plots the interest vs principal components over time using Plotly.
 * @param {Array} schedule - The amortization schedule.
 * @param {Object} layout - The Plotly layout configuration.
 */
function plotInterestPrincipalComponents(schedule, layout) {
    const xValues = schedule.map(p => parseFloat(p.paymentYear.toFixed(2)));
    const principalPayments = schedule.map(p => p.principalPayment + p.extraPayment);
    const interestPayments = schedule.map(p => p.interestPayment);

    const tracePrincipal = {
        x: xValues,
        y: principalPayments,
        name: 'Principal + Extra Payment',
        type: 'scatter',
        mode: 'lines',
        fill: 'tonexty',
        line: { color: '#457b9d' }
    };

    const traceInterest = {
        x: xValues,
        y: interestPayments,
        name: 'Interest',
        type: 'scatter',
        mode: 'lines',
        fill: 'tonexty',
        line: { color: '#e63946' }
    };

    const xStart = 0;
    const xEnd = Math.max(...xValues);
    const xPadding = (xEnd - xStart) * 0.05;
    const yStart = 0;
    const yEnd = Math.max(...principalPayments, ...interestPayments);
    const yPadding = yEnd * 0.05;

    const chartLayout = Object.assign({}, layout, {
        title: 'Interest vs Principal Components Over Time',
        xaxis: Object.assign({}, layout.xaxis, {
            title: 'Year',
            tickmode: 'linear',
            dtick: 1,
            range: [Math.max(0, xStart - xPadding), xEnd + xPadding],
            zeroline: false
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Payment Amount',
            range: [yStart - yPadding, yEnd + yPadding]
        }),
        height: 400,
    });

    const config = { responsive: true };

    Plotly.newPlot('chart6', [traceInterest, tracePrincipal], chartLayout, config);
}

/**
 * Plots the annual payment summary using Plotly.
 * @param {Array} schedule - The amortization schedule.
 * @param {Object} layout - The Plotly layout configuration.
 */
function plotAnnualPaymentSummary(schedule, layout) {
    const annualData = {};

    schedule.forEach((p) => {
        const year = Math.ceil(p.paymentYear);
        if (!annualData[year]) {
            annualData[year] = {
                principal: 0,
                interest: 0,
                extra: 0
            };
        }
        annualData[year].principal += p.principalPayment;
        annualData[year].interest += p.interestPayment;
        annualData[year].extra += p.extraPayment;
    });

    const years = Object.keys(annualData).map(y => parseInt(y));
    const principalPayments = years.map(y => annualData[y].principal);
    const interestPayments = years.map(y => annualData[y].interest);
    const extraPayments = years.map(y => annualData[y].extra);

    const tracePrincipal = {
        x: years,
        y: principalPayments.map(v => parseFloat(v.toFixed(2))),
        name: 'Principal',
        type: 'bar',
        marker: { color: '#457b9d' }
    };

    const traceInterest = {
        x: years,
        y: interestPayments.map(v => parseFloat(v.toFixed(2))),
        name: 'Interest',
        type: 'bar',
        marker: { color: '#e63946' }
    };

    const traceExtra = {
        x: years,
        y: extraPayments.map(v => parseFloat(v.toFixed(2))),
        name: 'Extra Payment',
        type: 'bar',
        marker: { color: '#2a9d8f' }
    };

    const chartLayout = Object.assign({}, layout, {
        barmode: 'stack',
        title: 'Annual Payment Summary',
        xaxis: Object.assign({}, layout.xaxis, {
            title: 'Year',
            tickmode: 'linear',
            dtick: 1,
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Payment Amount',
        }),
        height: 400,
    });
    const config = { responsive: true };

    Plotly.newPlot('chart11', [traceInterest, tracePrincipal, traceExtra], chartLayout);
}

/**
 * Plots the remaining balance comparison between scenarios using Plotly.
 * @param {Array} scheduleWithoutExtra - Schedule without extra payments.
 * @param {Array} scheduleWithExtra - Schedule with extra payments.
 * @param {Object} layout - The Plotly layout configuration.
 */
function plotRemainingBalanceComparison(scheduleWithoutExtra, scheduleWithExtra, layout) {
    const xValuesWithoutExtra = scheduleWithoutExtra.map((d) => parseFloat(d.paymentYear.toFixed(2)));
    const yValuesWithoutExtra = scheduleWithoutExtra.map((d) => parseFloat(d.remainingBalance.toFixed(2)));

    const xValuesWithExtra = scheduleWithExtra.map((d) => parseFloat(d.paymentYear.toFixed(2)));
    const yValuesWithExtra = scheduleWithExtra.map((d) => parseFloat(d.remainingBalance.toFixed(2)));

    const trace1 = {
        x: xValuesWithoutExtra,
        y: yValuesWithoutExtra,
        name: 'Without Extra Payments',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#e63946' }
    };

    const trace2 = {
        x: xValuesWithExtra,
        y: yValuesWithExtra,
        name: 'With Extra Payments',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#2a9d8f' }
    };

    const allXValues = xValuesWithoutExtra.concat(xValuesWithExtra);
    const allYValues = yValuesWithoutExtra.concat(yValuesWithExtra).map(y => parseFloat(y));

    const xStart = 0;
    const xEnd = Math.max(...allXValues);
    const xPadding = (xEnd - xStart) * 0.05;
    const yStart = 0;
    const yEnd = Math.max(...allYValues);
    const yPadding = yEnd * 0.05;

    const chartLayout = Object.assign({}, layout, {
        title: 'Remaining Balance Over Time',
        xaxis: Object.assign({}, layout.xaxis, {
            title: 'Year',
            tickmode: 'linear',
            dtick: 1,
            range: [Math.max(0, xStart - xPadding), xEnd + xPadding],
            zeroline: false
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Remaining Balance ($)',
            range: [yStart - yPadding, yEnd + yPadding]
        }),
        height: 400,
    });

    const config = { responsive: true };

    Plotly.newPlot('chart3', [trace1, trace2], chartLayout, config);
}

/**
 * Plots the total interest paid comparison using Plotly.
 * @param {number} totalInterestWithoutExtra - Total interest without extra payments.
 * @param {number} totalInterestWithExtra - Total interest with extra payments.
 * @param {Object} layout - The Plotly layout configuration.
 */
function plotTotalInterestComparison(totalInterestWithoutExtra, totalInterestWithExtra, layout) {
    const data = [
        {
            x: ['Without Extra Payments', 'With Extra Payments'],
            y: [parseFloat(totalInterestWithoutExtra.toFixed(2)), parseFloat(totalInterestWithExtra.toFixed(2))],
            type: 'bar',
            marker: { color: ['#e63946', '#2a9d8f'] },
            text: [`$${formatNumber(totalInterestWithoutExtra.toFixed(2))}`, `$${formatNumber(totalInterestWithExtra.toFixed(2))}`],
            textposition: 'auto'
        }
    ];

    const chartLayout = Object.assign({}, layout, {
        title: 'Total Interest Paid Comparison',
        xaxis: Object.assign({}, layout.xaxis, {
            title: 'Scenario',
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Total Interest Paid ($)',
        }),
        height: 400,
    });
    
    const config = { responsive: true };

    Plotly.newPlot('chart7', data, chartLayout, { responsive: true });
}

/**
 * Plots the loan term comparison using Plotly.
 * @param {number} termWithoutExtraPayments - Number of payments without extra payments.
 * @param {number} termWithExtraPayments - Number of payments with extra payments.
 * @param {Object} layout - The Plotly layout configuration.
 */
function plotLoanTermComparison(termWithoutExtraPayments, termWithExtraPayments, layout) {
    const termWithoutExtraYears = (termWithoutExtraPayments / 12).toFixed(2);
    const termWithExtraYears = (termWithExtraPayments / 12).toFixed(2);

    const data = [
        {
            x: ['Without Extra Payments', 'With Extra Payments'],
            y: [parseFloat(termWithoutExtraYears), parseFloat(termWithExtraYears)],
            type: 'bar',
            marker: { color: ['#e63946', '#2a9d8f'] },
            text: [`${termWithoutExtraYears} years`, `${termWithExtraYears} years`],
            textposition: 'auto'
        }
    ];

    const chartLayout = Object.assign({}, layout, {
        title: 'Loan Term Comparison',
        xaxis: Object.assign({}, layout.xaxis, {
            title: 'Scenario',
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Loan Term (Years)',
        }),
        height: 400,
    });

    const config = { responsive: true };

    Plotly.newPlot('chart8', data, chartLayout, { responsive: true });
}

/**
 * Plots the cumulative interest savings over time using Plotly.
 * @param {Array} scheduleWithoutExtra - Schedule without extra payments.
 * @param {Array} scheduleWithExtra - Schedule with extra payments.
 * @param {Object} layout - The Plotly layout configuration.
 */
function plotInterestSavingsOverTime(scheduleWithoutExtra, scheduleWithExtra, layout) {
    const xValues = [];
    const interestSavings = [];
    let cumulativeInterestWithoutExtra = 0;
    let cumulativeInterestWithExtra = 0;

    const maxLength = Math.max(scheduleWithoutExtra.length, scheduleWithExtra.length);

    for (let i = 0; i < maxLength; i++) {
        cumulativeInterestWithoutExtra += scheduleWithoutExtra[i] ? scheduleWithoutExtra[i].interestPayment : 0;
        cumulativeInterestWithExtra += scheduleWithExtra[i] ? scheduleWithExtra[i].interestPayment : 0;
        xValues.push((i + 1) / 12);
        const savings = cumulativeInterestWithoutExtra - cumulativeInterestWithExtra;
        interestSavings.push(savings);
    }

    const xStart = 0;
    const xEnd = xValues[xValues.length - 1];
    const xPadding = (xEnd - xStart) * 0.05;
    const yStart = 0;
    const yEnd = Math.max(...interestSavings);
    const yPadding = yEnd * 0.05;

    const trace = {
        x: xValues.map(x => parseFloat(x.toFixed(2))),
        y: interestSavings.map(s => parseFloat(s.toFixed(2))),
        name: 'Interest Savings',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#2a9d8f' },
    };

    const chartLayout = Object.assign({}, layout, {
        title: 'Cumulative Interest Savings Over Time',
        xaxis: Object.assign({}, layout.xaxis, {
            title: 'Year',
            tickmode: 'linear',
            dtick: 1,
            range: [Math.max(0, xStart - xPadding), xEnd + xPadding],
            zeroline: false
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Interest Savings ($)',
            range: [yStart - yPadding, yEnd + yPadding]
        }),
        height: 400,
    });

    const config = { responsive: true };

    Plotly.newPlot('chart9', [trace], chartLayout, { responsive: true });
}

/**
 * Plots the total payments comparison using Plotly.
 * @param {Array} scheduleWithoutExtra - Schedule without extra payments.
 * @param {Array} scheduleWithExtra - Schedule with extra payments.
 * @param {number} principal - The initial principal amount.
 * @param {Object} layout - The Plotly layout configuration.
 */
function plotTotalPaymentsComparison(scheduleWithoutExtra, scheduleWithExtra, principal, layout) {
    const totalPaidWithoutExtra = scheduleWithoutExtra.reduce((sum, p) => sum + p.interestPayment + p.principalPayment, 0);
    const totalPaidWithExtra = scheduleWithExtra.reduce((sum, p) => sum + p.interestPayment + p.principalPayment + p.extraPayment, 0);

    const data = [
        {
            x: ['Without Extra Payments', 'With Extra Payments'],
            y: [parseFloat(totalPaidWithoutExtra.toFixed(2)), parseFloat(totalPaidWithExtra.toFixed(2))],
            type: 'bar',
            marker: { color: ['#e63946', '#2a9d8f'] },
            text: [`$${formatNumber(totalPaidWithoutExtra.toFixed(2))}`, `$${formatNumber(totalPaidWithExtra.toFixed(2))}`],
            textposition: 'auto'
        }
    ];

    const chartLayout = Object.assign({}, layout, {
        title: 'Total Payments Comparison',
        xaxis: Object.assign({}, layout.xaxis, {
            title: 'Scenario',
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Total Amount Paid ($)',
        }),
        height: 400,
    });

    const config = { responsive: true };

    Plotly.newPlot('chart10', data, chartLayout, { responsive: true });
}

/**
 * Plots the equity comparison over time using Plotly.
 * @param {Array} scheduleWithoutExtra - Schedule without extra payments.
 * @param {Array} scheduleWithExtra - Schedule with extra payments.
 * @param {number} principal - The initial principal amount.
 * @param {Object} layout - The Plotly layout configuration.
 */
function plotEquityComparisonOverTime(scheduleWithoutExtra, scheduleWithExtra, principal, layout) {
    const xValuesWithoutExtra = scheduleWithoutExtra.map(p => parseFloat(p.paymentYear.toFixed(2)));
    const equityWithoutExtra = scheduleWithoutExtra.map(p => parseFloat((principal - p.remainingBalance).toFixed(2)));

    const xValuesWithExtra = scheduleWithExtra.map(p => parseFloat(p.paymentYear.toFixed(2)));
    const equityWithExtra = scheduleWithExtra.map(p => parseFloat((principal - p.remainingBalance).toFixed(2)));

    const traceWithoutExtra = {
        x: xValuesWithoutExtra,
        y: equityWithoutExtra,
        name: 'Without Extra Payments',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#e63946' }
    };

    const traceWithExtra = {
        x: xValuesWithExtra,
        y: equityWithExtra,
        name: 'With Extra Payments',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#2a9d8f' }
    };

    const allXValues = xValuesWithoutExtra.concat(xValuesWithExtra);
    const allYValues = equityWithoutExtra.concat(equityWithExtra).map(y => parseFloat(y));

    const xStart = 0;
    const xEnd = Math.max(...allXValues);
    const xPadding = (xEnd - xStart) * 0.05;
    const yStart = 0;
    const yEnd = Math.max(...allYValues);
    const yPadding = yEnd * 0.05;

    const chartLayout = Object.assign({}, layout, {
        title: 'Cumulative Equity Over Time',
        xaxis: Object.assign({}, layout.xaxis, {
            title: 'Year',
            tickmode: 'linear',
            dtick: 1,
            range: [Math.max(0, xStart - xPadding), xEnd + xPadding],
            zeroline: false
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Cumulative Equity ($)',
            range: [yStart - yPadding, yEnd + yPadding]
        }),
        height: 400,
    });

    const config = { responsive: true };

    Plotly.newPlot('chart14', [traceWithoutExtra, traceWithExtra], chartLayout, { responsive: true });
}

/**
 * Plots the remaining balance over time comparison using Plotly.
 * @param {Array} scheduleWithoutExtra - Schedule without extra payments.
 * @param {Array} scheduleWithExtra - Schedule with extra payments.
 * @param {Object} layout - The Plotly layout configuration.
 */
function plotRemainingBalanceComparison(scheduleWithoutExtra, scheduleWithExtra, layout) {
    const xValuesWithoutExtra = scheduleWithoutExtra.map((d) => parseFloat(d.paymentYear.toFixed(2)));
    const yValuesWithoutExtra = scheduleWithoutExtra.map((d) => parseFloat(d.remainingBalance.toFixed(2)));

    const xValuesWithExtra = scheduleWithExtra.map((d) => parseFloat(d.paymentYear.toFixed(2)));
    const yValuesWithExtra = scheduleWithExtra.map((d) => parseFloat(d.remainingBalance.toFixed(2)));

    const trace1 = {
        x: xValuesWithoutExtra,
        y: yValuesWithoutExtra,
        name: 'Without Extra Payments',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#e63946' }
    };

    const trace2 = {
        x: xValuesWithExtra,
        y: yValuesWithExtra,
        name: 'With Extra Payments',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#2a9d8f' }
    };

    const allXValues = xValuesWithoutExtra.concat(xValuesWithExtra);
    const allYValues = yValuesWithoutExtra.concat(yValuesWithExtra).map(y => parseFloat(y));

    const xStart = 0;
    const xEnd = Math.max(...allXValues);
    const xPadding = (xEnd - xStart) * 0.05;
    const yStart = 0;
    const yEnd = Math.max(...allYValues);
    const yPadding = yEnd * 0.05;

    const chartLayout = Object.assign({}, layout, {
        title: 'Remaining Balance Over Time',
        xaxis: Object.assign({}, layout.xaxis, {
            title: 'Year',
            tickmode: 'linear',
            dtick: 1,
            range: [Math.max(0, xStart - xPadding), xEnd + xPadding],
            zeroline: false
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Remaining Balance ($)',
            range: [yStart - yPadding, yEnd + yPadding]
        }),
        height: 400,
    });

    const config = { responsive: true };

    Plotly.newPlot('chart3', [trace1, trace2], chartLayout, config);
}

/**
 * Plots the total interest paid comparison using Plotly.
 * @param {number} totalInterestWithoutExtra - Total interest without extra payments.
 * @param {number} totalInterestWithExtra - Total interest with extra payments.
 * @param {Object} layout - The Plotly layout configuration.
 */
function plotTotalInterestComparison(totalInterestWithoutExtra, totalInterestWithExtra, layout) {
    const data = [
        {
            x: ['Without Extra Payments', 'With Extra Payments'],
            y: [parseFloat(totalInterestWithoutExtra.toFixed(2)), parseFloat(totalInterestWithExtra.toFixed(2))],
            type: 'bar',
            marker: { color: ['#e63946', '#2a9d8f'] },
            text: [`$${formatNumber(totalInterestWithoutExtra.toFixed(2))}`, `$${formatNumber(totalInterestWithExtra.toFixed(2))}`],
            textposition: 'auto'
        }
    ];

    const chartLayout = Object.assign({}, layout, {
        title: 'Total Interest Paid Comparison',
        xaxis: Object.assign({}, layout.xaxis, {
            title: 'Scenario',
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Total Interest Paid ($)',
        }),
        height: 400,
    });

    const config = { responsive: true };

    Plotly.newPlot('chart7', data, chartLayout, { responsive: true });
}

/**
 * Plots the loan term comparison using Plotly.
 * @param {number} termWithoutExtraPayments - Number of payments without extra payments.
 * @param {number} termWithExtraPayments - Number of payments with extra payments.
 * @param {Object} layout - The Plotly layout configuration.
 */
function plotLoanTermComparison(termWithoutExtraPayments, termWithExtraPayments, layout) {
    const termWithoutExtraYears = (termWithoutExtraPayments / 12).toFixed(2);
    const termWithExtraYears = (termWithExtraPayments / 12).toFixed(2);

    const data = [
        {
            x: ['Without Extra Payments', 'With Extra Payments'],
            y: [parseFloat(termWithoutExtraYears), parseFloat(termWithExtraYears)],
            type: 'bar',
            marker: { color: ['#e63946', '#2a9d8f'] },
            text: [`${termWithoutExtraYears} years`, `${termWithExtraYears} years`],
            textposition: 'auto'
        }
    ];

    const chartLayout = Object.assign({}, layout, {
        title: 'Loan Term Comparison',
        xaxis: Object.assign({}, layout.xaxis, {
            title: 'Scenario',
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Loan Term (Years)',
        }),
        height: 400,
    });

    const config = { responsive: true };

    Plotly.newPlot('chart8', data, chartLayout, { responsive: true });
}

/**
 * Plots the cumulative interest savings over time using Plotly.
 * @param {Array} scheduleWithoutExtra - Schedule without extra payments.
 * @param {Array} scheduleWithExtra - Schedule with extra payments.
 * @param {Object} layout - The Plotly layout configuration.
 */
function plotInterestSavingsOverTime(scheduleWithoutExtra, scheduleWithExtra, layout) {
    const xValues = [];
    const interestSavings = [];
    let cumulativeInterestWithoutExtra = 0;
    let cumulativeInterestWithExtra = 0;

    const maxLength = Math.max(scheduleWithoutExtra.length, scheduleWithExtra.length);

    for (let i = 0; i < maxLength; i++) {
        cumulativeInterestWithoutExtra += scheduleWithoutExtra[i] ? scheduleWithoutExtra[i].interestPayment : 0;
        cumulativeInterestWithExtra += scheduleWithExtra[i] ? scheduleWithExtra[i].interestPayment : 0;
        xValues.push((i + 1) / 12);
        const savings = cumulativeInterestWithoutExtra - cumulativeInterestWithExtra;
        interestSavings.push(savings);
    }

    const xStart = 0;
    const xEnd = xValues[xValues.length - 1];
    const xPadding = (xEnd - xStart) * 0.05;
    const yStart = 0;
    const yEnd = Math.max(...interestSavings);
    const yPadding = yEnd * 0.05;

    const trace = {
        x: xValues.map(x => parseFloat(x.toFixed(2))),
        y: interestSavings.map(s => parseFloat(s.toFixed(2))),
        name: 'Interest Savings',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#2a9d8f' },
    };

    const chartLayout = Object.assign({}, layout, {
        title: 'Cumulative Interest Savings Over Time',
        xaxis: Object.assign({}, layout.xaxis, {
            title: 'Year',
            tickmode: 'linear',
            dtick: 1,
            range: [Math.max(0, xStart - xPadding), xEnd + xPadding],
            zeroline: false
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Interest Savings ($)',
            range: [yStart - yPadding, yEnd + yPadding]
        }),
        height: 400,
    });

    const config = { responsive: true };

    Plotly.newPlot('chart9', [trace], chartLayout, { responsive: true });
}

/**
 * Plots the total payments comparison using Plotly.
 * @param {Array} scheduleWithoutExtra - Schedule without extra payments.
 * @param {Array} scheduleWithExtra - Schedule with extra payments.
 * @param {number} principal - The initial principal amount.
 * @param {Object} layout - The Plotly layout configuration.
 */
function plotTotalPaymentsComparison(scheduleWithoutExtra, scheduleWithExtra, principal, layout) {
    const totalPaidWithoutExtra = scheduleWithoutExtra.reduce((sum, p) => sum + p.interestPayment + p.principalPayment, 0);
    const totalPaidWithExtra = scheduleWithExtra.reduce((sum, p) => sum + p.interestPayment + p.principalPayment + p.extraPayment, 0);

    const data = [
        {
            x: ['Without Extra Payments', 'With Extra Payments'],
            y: [parseFloat(totalPaidWithoutExtra.toFixed(2)), parseFloat(totalPaidWithExtra.toFixed(2))],
            type: 'bar',
            marker: { color: ['#e63946', '#2a9d8f'] },
            text: [`$${formatNumber(totalPaidWithoutExtra.toFixed(2))}`, `$${formatNumber(totalPaidWithExtra.toFixed(2))}`],
            textposition: 'auto'
        }
    ];

    const chartLayout = Object.assign({}, layout, {
        title: 'Total Payments Comparison',
        xaxis: Object.assign({}, layout.xaxis, {
            title: 'Scenario',
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Total Amount Paid ($)',
        }),
        height: 400,
    });

    const config = { responsive: true };

    Plotly.newPlot('chart10', data, chartLayout, { responsive: true });
}

/**
 * Plots the equity comparison over time using Plotly.
 * @param {Array} scheduleWithoutExtra - Schedule without extra payments.
 * @param {Array} scheduleWithExtra - Schedule with extra payments.
 * @param {number} principal - The initial principal amount.
 * @param {Object} layout - The Plotly layout configuration.
 */
function plotEquityComparisonOverTime(scheduleWithoutExtra, scheduleWithExtra, principal, layout) {
    const xValuesWithoutExtra = scheduleWithoutExtra.map(p => parseFloat(p.paymentYear.toFixed(2)));
    const equityWithoutExtra = scheduleWithoutExtra.map(p => parseFloat((principal - p.remainingBalance).toFixed(2)));

    const xValuesWithExtra = scheduleWithExtra.map(p => parseFloat(p.paymentYear.toFixed(2)));
    const equityWithExtra = scheduleWithExtra.map(p => parseFloat((principal - p.remainingBalance).toFixed(2)));

    const traceWithoutExtra = {
        x: xValuesWithoutExtra,
        y: equityWithoutExtra,
        name: 'Without Extra Payments',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#e63946' }
    };

    const traceWithExtra = {
        x: xValuesWithExtra,
        y: equityWithExtra,
        name: 'With Extra Payments',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#2a9d8f' }
    };

    const allXValues = xValuesWithoutExtra.concat(xValuesWithExtra);
    const allYValues = equityWithoutExtra.concat(equityWithExtra).map(y => parseFloat(y));

    const xStart = 0;
    const xEnd = Math.max(...allXValues);
    const xPadding = (xEnd - xStart) * 0.05;
    const yStart = 0;
    const yEnd = Math.max(...allYValues);
    const yPadding = yEnd * 0.05;

    const chartLayout = Object.assign({}, layout, {
        title: 'Cumulative Equity Over Time',
        xaxis: Object.assign({}, layout.xaxis, {
            title: 'Year',
            tickmode: 'linear',
            dtick: 1,
            range: [Math.max(0, xStart - xPadding), xEnd + xPadding],
            zeroline: false
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Cumulative Equity ($)',
            range: [yStart - yPadding, yEnd + yPadding]
        }),
        height: 400,
    });

    const config = { responsive: true };

    Plotly.newPlot('chart14', [traceWithoutExtra, traceWithExtra], chartLayout, { responsive: true });
}

/**
 * Plots the extra payment effect on loan term using Plotly.
 * @param {number} principal - The initial principal amount.
 * @param {number} monthlyRate - The monthly interest rate.
 * @param {number} numPayments - Total number of payments.
 * @param {Object} layout - The Plotly layout configuration.
 */
function plotExtraPaymentEffectOnLoanTerm(principal, monthlyRate, numPayments, layout) {
    const extraPayments = [];
    const loanTerms = [];

    for (let extra = 0; extra <= 2000; extra += 50) {
        const mortgagePayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
        const schedule = computeAmortizationSchedule(principal, monthlyRate, mortgagePayment, extra, numPayments);
        const loanTermYears = (schedule.length / 12).toFixed(2);

        extraPayments.push(extra);
        loanTerms.push(parseFloat(loanTermYears));
    }

    const xStart = 0;
    const xEnd = Math.max(...extraPayments);
    const xPadding = (xEnd - xStart) * 0.05;
    const yStart = Math.min(...loanTerms);
    const yEnd = Math.max(...loanTerms);
    const yPadding = yEnd * 0.05;

    const trace = {
        x: extraPayments,
        y: loanTerms,
        type: 'scatter',
        mode: 'lines+markers',
        marker: { color: '#2a9d8f' },
        name: 'Loan Term Reduction'
    };

    const chartLayout = Object.assign({}, layout, {
        title: 'Effect of Extra Payments on Loan Term',
        xaxis: Object.assign({}, layout.xaxis, {
            title: 'Extra Payment Amount ($)',
            tickmode: 'linear',
            dtick: 200,
            range: [Math.max(0, xStart - xPadding), xEnd + xPadding],
            zeroline: false
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Loan Term (Years)',
            range: [yStart - yPadding, yEnd + yPadding]
        }),
        height: 400,
    });

    const config = { responsive: true };

    Plotly.newPlot('chart12', [trace], chartLayout, { responsive: true });
}

/**
 * Plots the extra payment effect on total interest paid using Plotly.
 * @param {number} principal - The initial principal amount.
 * @param {number} monthlyRate - The monthly interest rate.
 * @param {number} numPayments - Total number of payments.
 * @param {Object} layout - The Plotly layout configuration.
 */
function plotExtraPaymentEffectOnTotalInterest(principal, monthlyRate, numPayments, layout) {
    const extraPayments = [];
    const totalInterests = [];

    for (let extra = 0; extra <= 2000; extra += 50) {
        const mortgagePayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
            (Math.pow(1 + monthlyRate, numPayments) - 1);
        const schedule = computeAmortizationSchedule(principal, monthlyRate, mortgagePayment, extra, numPayments);
        const totalInterest = parseFloat(schedule.reduce((sum, p) => sum + p.interestPayment, 0).toFixed(2));

        extraPayments.push(extra);
        totalInterests.push(totalInterest);
    }

    const xStart = 0;
    const xEnd = Math.max(...extraPayments);
    const xPadding = (xEnd - xStart) * 0.05;
    const yStart = Math.min(...totalInterests);
    const yEnd = Math.max(...totalInterests);
    const yPadding = yEnd * 0.05;

    const trace = {
        x: extraPayments,
        y: totalInterests,
        type: 'scatter',
        mode: 'lines+markers',
        marker: { color: '#e63946' },
        name: 'Total Interest Reduction'
    };

    const chartLayout = Object.assign({}, layout, {
        title: 'Effect of Extra Payments on Total Interest Paid',
        xaxis: Object.assign({}, layout.xaxis, {
            title: 'Extra Payment Amount ($)',
            tickmode: 'linear',
            dtick: 200,
            range: [Math.max(0, xStart - xPadding), xEnd + xPadding],
            zeroline: false
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Total Interest Paid ($)',
            range: [yStart - yPadding, yEnd + yPadding]
        }),
        height: 400,
    });

    const config = { responsive: true };

    Plotly.newPlot('chart13', [trace], chartLayout, { responsive: true });
}

/**
 * Plots the interest vs principal components over time using Plotly.
 * @param {Array} schedule - The amortization schedule.
 * @param {Object} layout - The Plotly layout configuration.
 */
function plotInterestPrincipalComponents(schedule, layout) {
    const xValues = schedule.map(p => parseFloat(p.paymentYear.toFixed(2)));
    const principalPayments = schedule.map(p => p.principalPayment + p.extraPayment);
    const interestPayments = schedule.map(p => p.interestPayment);

    const tracePrincipal = {
        x: xValues,
        y: principalPayments,
        name: 'Principal + Extra Payment',
        type: 'scatter',
        mode: 'lines',
        fill: 'tonexty',
        line: { color: '#457b9d' }
    };

    const traceInterest = {
        x: xValues,
        y: interestPayments,
        name: 'Interest',
        type: 'scatter',
        mode: 'lines',
        fill: 'tonexty',
        line: { color: '#e63946' }
    };

    const xStart = 0;
    const xEnd = Math.max(...xValues);
    const xPadding = (xEnd - xStart) * 0.05;
    const yStart = 0;
    const yEnd = Math.max(...principalPayments, ...interestPayments);
    const yPadding = yEnd * 0.05;

    const chartLayout = Object.assign({}, layout, {
        title: 'Interest vs Principal Components Over Time',
        xaxis: Object.assign({}, layout.xaxis, {
            title: 'Year',
            tickmode: 'linear',
            dtick: 1,
            range: [Math.max(0, xStart - xPadding), xEnd + xPadding],
            zeroline: false
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Payment Amount ($)',
            range: [yStart - yPadding, yEnd + yPadding]
        }),
        height: 400,
    });

    const config = { responsive: true };

    Plotly.newPlot('chart6', [traceInterest, tracePrincipal], chartLayout, { responsive: true });
}

/**
 * Creates the amortization table and inserts it into the DOM.
 * @param {Array} schedule - The amortization schedule.
 * @param {number} mortgagePayment - The standard mortgage payment.
 * @param {number} extraPayment - The extra monthly payment.
 * @param {string} firstPaymentDate - The first payment date (optional).
 */
function createAmortizationTable(schedule, mortgagePayment, extraPayment, firstPaymentDate) {
    const tableBody = document.querySelector("#amortization-table tbody");
    tableBody.innerHTML = '';

    let totalInterest = 0;
    let totalPrincipal = 0;
    let totalExtraPayments = 0;

    let currentDate = null;
    if (firstPaymentDate) {
        const dateParts = firstPaymentDate.split('-');
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // JavaScript months are 0-based
        const day = parseInt(dateParts[2]);
        currentDate = new Date(year, month, day);
    }

    schedule.forEach((p) => {
        totalInterest += p.interestPayment;
        totalPrincipal += p.principalPayment;
        totalExtraPayments += p.extraPayment;

        const row = document.createElement('tr');

        const paymentCell = document.createElement('td');
        if (currentDate) {
            paymentCell.textContent = formatDate(currentDate);
            currentDate.setMonth(currentDate.getMonth() + 1);
        } else {
            paymentCell.textContent = `Payment ${p.paymentNumber}`;
        }
        row.appendChild(paymentCell);

        row.innerHTML += `
            <td>$${formatNumber((p.principalPayment + p.interestPayment + p.extraPayment).toFixed(2))}</td>
            <td>$${formatNumber(p.extraPayment.toFixed(2))}</td>
            <td>$${formatNumber(p.principalPayment.toFixed(2))}</td>
            <td>$${formatNumber(p.interestPayment.toFixed(2))}</td>
            <td>$${formatNumber(p.remainingBalance.toFixed(2))}</td>
        `;

        tableBody.appendChild(row);
    });

    const summaryRow = document.createElement('tr');
    summaryRow.innerHTML = `
        <td colspan="2"><strong>Totals</strong></td>
        <td><strong>$${formatNumber(totalExtraPayments.toFixed(2))}</strong></td>
        <td><strong>$${formatNumber(totalPrincipal.toFixed(2))}</strong></td>
        <td><strong>$${formatNumber(totalInterest.toFixed(2))}</strong></td>
        <td><strong>N/A</strong></td>
    `;
    tableBody.appendChild(summaryRow);
}

/**
 * Formats a number with commas for thousands separators.
 * @param {string} numberStr - The number as a string.
 * @returns {string} The formatted number string.
 */
function formatNumber(numberStr) {
    return Number(numberStr).toLocaleString();
}

/**
 * Clears the first payment date and recalculates the mortgage.
 */
function clearDate() {
    const firstPaymentDateInput = document.getElementById("firstPaymentDate");
    firstPaymentDateInput.value = "";

    calculateMortgage(new Event('submit'));
}

/**
 * Formats a Date object into a readable string (e.g., Oct 2024).
 * @param {Date} date - The Date object.
 * @returns {string} The formatted date string.
 */
function formatDate(date) {
    const options = { year: 'numeric', month: 'short' };
    return date.toLocaleDateString('en-US', options);
}

// Event listeners
document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById("mortgageForm");
    form.addEventListener("submit", calculateMortgage);

    const clearDateBtn = document.getElementById("clearDateBtn");
    clearDateBtn.addEventListener("click", clearDate);

    const modeSwitch = document.getElementById('mode-switch');
    const body = document.body;

    // Set the initial theme based on the mode switch
    if (modeSwitch.checked) {
        body.classList.add('dark-mode');
    } else {
        body.classList.remove('dark-mode');
    }

    // Toggle theme and recalculate mortgage on mode switch change
    modeSwitch.addEventListener('change', () => {
        if (modeSwitch.checked) {
            body.classList.add('dark-mode');
        } else {
            body.classList.remove('dark-mode');
        }
        calculateMortgage(); // Recalculate the mortgage to update chart styles
    });

// Adjust chart layouts on window resize
window.addEventListener('resize', function () {
    const charts = [
        'chart', 'chart2', 'chart4', 'chart6', 'chart11', 'chart12', 'chart13',
        'chart3', 'chart7', 'chart8', 'chart9', 'chart10', 'chart14'
    ];

    charts.forEach(chartId => {
        const chartDiv = document.getElementById(chartId);
        if (chartDiv && chartDiv.style.display !== 'none') {
            // Trigger Plotly to resize the chart
            Plotly.Plots.resize(chartDiv);
        }
    });
});

    // Print buttons
    const printChartsBtn = document.getElementById('printChartsBtn');
    printChartsBtn.addEventListener('click', printCharts);

    const printScheduleBtn = document.getElementById('printScheduleBtn');
    printScheduleBtn.addEventListener('click', printAmortizationSchedule);
});

/**
 * Formats a number with commas and decimal places.
 * @param {string} numberStr - The number as a string.
 * @returns {string} The formatted number string.
 */
function formatNumberWithCommas(numberStr) {
    return Number(numberStr).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Triggers printing of the charts.
 */
function printCharts() {
    calculateMortgage();

    document.body.classList.add('print-charts');

    window.print();
}

/**
 * Triggers printing of the amortization schedule.
 */
function printAmortizationSchedule() {
    calculateMortgage();

    document.body.classList.add('print-schedule');

    window.print();
}

// Remove print-related classes after printing
window.addEventListener('afterprint', () => {
    document.body.classList.remove('print-charts');
    document.body.classList.remove('print-schedule');
});

/**
 * Shows or hides the comparison charts.
 * @param {boolean} show - Whether to show the comparison charts.
 */
function showComparisonCharts(show) {
    const comparisonChartIds = ['chart3', 'chart7', 'chart8', 'chart9', 'chart10', 'chart14'];
    comparisonChartIds.forEach(chartId => {
        const chartDiv = document.getElementById(chartId);
        if (chartDiv) {
            chartDiv.style.display = show ? 'block' : 'none';
        }
    });
}

/**
 * Clears all comparison charts by purging them.
 */
function clearComparisonCharts() {
    const comparisonChartIds = ['chart3', 'chart7', 'chart8', 'chart9', 'chart10', 'chart14'];
    comparisonChartIds.forEach(chartId => {
        Plotly.purge(chartId);
    });
}

/**
 * Formats a number with commas and two decimal places.
 * @param {string} numberStr - The number as a string.
 * @returns {string} The formatted number string.
 */
function formatNumber(numberStr) {
    return Number(numberStr).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

document.addEventListener('DOMContentLoaded', function () {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
        // Adjust form container for mobile
        const formContainer = document.getElementById('form-container');
        formContainer.style.flexDirection = 'column';
        formContainer.style.alignItems = 'center';

        // Adjust circles container for better stacking on mobile
        const circlesContainer = document.querySelector('.circles-container');
        circlesContainer.style.flexDirection = 'column';
        circlesContainer.style.alignItems = 'center';

        // Increase padding for inputs for easier touch interaction
        const inputs = document.querySelectorAll('input[type="number"], input[type="text"], input[type="date"]');
        inputs.forEach(input => {
            input.style.padding = '15px';
            input.style.fontSize = '18px';
        });

        // Adjust button sizes for easier tap
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            button.style.padding = '15px';
            button.style.fontSize = '18px';
        });

        // Make the circles larger for better visibility
        const circles = document.querySelectorAll('.monthly-payment-circle, .payment-breakdown-circle');
        circles.forEach(circle => {
            circle.style.width = '250px';
            circle.style.height = '250px';
        });
    }
});
