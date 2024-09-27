// Define layouts for light and dark modes
const lightLayout = {
    plot_bgcolor: 'white',
    paper_bgcolor: 'white',
    font: { color: 'black' },
    xaxis: {
        gridcolor: '#e1e1e1',
        zerolinecolor: '#e1e1e1',
        titlefont: { color: 'black' },
        tickfont: { color: 'black' }
    },
    yaxis: {
        gridcolor: '#e1e1e1',
        zerolinecolor: '#e1e1e1',
        titlefont: { color: 'black' },
        tickfont: { color: 'black' }
    },
    legend: {
        font: { color: 'black' }
    },
};

const darkLayout = {
    plot_bgcolor: '#1a1a1a', // Match the --bg-color in your CSS for dark mode
    paper_bgcolor: '#1a1a1a',
    font: { color: '#f0f0f0' }, // Match the --text-color in your CSS for dark mode
    xaxis: {
        gridcolor: '#444',
        zerolinecolor: '#444',
        titlefont: { color: '#f0f0f0' },
        tickfont: { color: '#f0f0f0' }
    },
    yaxis: {
        gridcolor: '#444',
        zerolinecolor: '#444',
        titlefont: { color: '#f0f0f0' },
        tickfont: { color: '#f0f0f0' }
    },
    legend: {
        font: { color: '#f0f0f0' }
    },
};

function calculateMortgage(event) {
    event.preventDefault();

    const principal = parseFloat(document.getElementById("principal").value);
    const amortization = parseFloat(document.getElementById("amortization").value);
    const term = parseFloat(document.getElementById("term").value);
    const interestRate = parseFloat(document.getElementById("interestRate").value.replace('%', '')) / 100;
    const extraPayment = parseFloat(document.getElementById("extraPayment").value);
    const firstPaymentDate = document.getElementById("firstPaymentDate").value;

    if (isNaN(principal) || isNaN(amortization) || isNaN(term) || isNaN(interestRate) || isNaN(extraPayment)) {
        alert("Please enter valid numbers for all fields.");
        return;
    }

    const monthlyRate = interestRate / 12;
    const numPayments = Math.round(amortization * 12);
    const termPayments = Math.round(term * 12);

    const mortgagePayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);

    // Compute amortization schedules
    const scheduleWithExtraTotal = computeAmortizationSchedule(principal, monthlyRate, mortgagePayment, extraPayment, numPayments);

    // Determine the current mode
    const isDarkMode = document.body.classList.contains('dark-mode');
    const currentLayout = isDarkMode ? darkLayout : lightLayout;

    // Plot charts with the selected layout
    plotPaymentBreakdown(scheduleWithExtraTotal, currentLayout);
    plotCumulativeChart(scheduleWithExtraTotal, currentLayout);
    plotEquityBuildUp(scheduleWithExtraTotal, principal, currentLayout);

    // Conditionally plot comparison graphs if extraPayment > 0
    if (extraPayment > 0) {
        const scheduleWithoutExtraTotal = computeAmortizationSchedule(principal, monthlyRate, mortgagePayment, 0, numPayments);

        // Compute total interest paid
        const totalInterestPaidWithoutExtraTotal = scheduleWithoutExtraTotal.reduce((sum, p) => sum + p.interestPayment, 0);
        const totalInterestPaidWithExtraTotal = scheduleWithExtraTotal.reduce((sum, p) => sum + p.interestPayment, 0);

        // Compute savings
        const extraSavedTotal = totalInterestPaidWithoutExtraTotal - totalInterestPaidWithExtraTotal;

        document.getElementById("extraSavedTotal").value = extraSavedTotal.toFixed(2);

        // Update loan payoff information in years
        const loanPaidOffInYears = (scheduleWithExtraTotal.length / 12).toFixed(2);
        const totalLoanYears = (numPayments / 12).toFixed(2);
        document.getElementById("paidOffIn").value = loanPaidOffInYears;
        document.getElementById("outOf").value = totalLoanYears;

        // Plot comparison graphs
        plotRemainingBalanceComparison(scheduleWithoutExtraTotal, scheduleWithExtraTotal, currentLayout);
        plotTotalInterestComparison(totalInterestPaidWithoutExtraTotal, totalInterestPaidWithExtraTotal, currentLayout);
        plotLoanTermComparison(scheduleWithoutExtraTotal.length, scheduleWithExtraTotal.length, currentLayout);
        plotInterestSavingsOverTime(scheduleWithoutExtraTotal, scheduleWithExtraTotal, currentLayout);
        plotTotalPaymentsComparison(scheduleWithoutExtraTotal, scheduleWithExtraTotal, principal, currentLayout);
        plotEquityComparisonOverTime(scheduleWithoutExtraTotal, scheduleWithExtraTotal, principal, currentLayout);

        // Show comparison chart divs
        showComparisonCharts(true);
    } else {
        // Clear the comparison charts and hide them
        clearComparisonCharts();
        showComparisonCharts(false);

        // Set values to N/A when extraPayment is zero
        document.getElementById("extraSavedTotal").value = "0.00";
        document.getElementById("paidOffIn").value = (numPayments / 12).toFixed(2);
        document.getElementById("outOf").value = (numPayments / 12).toFixed(2);
    }

    // Plot other charts that don't require comparison
    plotInterestPrincipalComponents(scheduleWithExtraTotal, currentLayout);
    plotAnnualPaymentSummary(scheduleWithExtraTotal, currentLayout);
    plotExtraPaymentEffectOnLoanTerm(principal, monthlyRate, numPayments, currentLayout);
    plotExtraPaymentEffectOnTotalInterest(principal, monthlyRate, numPayments, currentLayout);

    // Create amortization table
    createAmortizationTable(scheduleWithExtraTotal, mortgagePayment, extraPayment, firstPaymentDate);

    // Store data in localStorage for pop-out windows
    const mortgageData = {
        principal,
        amortization,
        term,
        interestRate,
        extraPayment,
        firstPaymentDate,
        monthlyRate,
        numPayments,
        termPayments,
        mortgagePayment,
        scheduleWithExtraTotal,
        // Include comparison schedules only if extraPayment > 0
        scheduleWithoutExtraTotal: extraPayment > 0 ? scheduleWithoutExtraTotal : null,
    };

    localStorage.setItem('mortgageData', JSON.stringify(mortgageData));
}

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

// Plotting functions

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
        text: data.map((d) => `$${d.y[2].toFixed(2)}`),
        textposition: 'auto',
        marker: { color: '#2a9d8f' } // Subtle Green
    };

    const tracePrincipal = {
        x: xValues,
        y: data.map((d) => d.y[0]),
        name: 'Principal',
        type: 'bar',
        text: data.map((d) => `$${d.y[0].toFixed(2)}`),
        textposition: 'auto',
        marker: { color: '#457b9d' } // Professional Blue
    };

    const traceInterest = {
        x: xValues,
        y: data.map((d) => d.y[1]),
        name: 'Interest',
        type: 'bar',
        text: data.map((d) => `$${d.y[1].toFixed(2)}`),
        textposition: 'auto',
        marker: { color: '#e63946' } // Muted Red
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
        width: window.innerWidth * 0.97,
        height: 400,
    });

    const config = { responsive: true };

    Plotly.newPlot('chart', [traceInterest, tracePrincipal, traceExtra], chartLayout, config);
}

function plotCumulativeChart(schedule, layout) {
    const cumulativePayments = [];
    let totalPayment = 0;

    // Ensure the chart starts from 0,0
    cumulativePayments.push({ x: 0, y: 0 });

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
        marker: { color: '#457b9d' } // Professional Blue
    };

    const chartLayout = Object.assign({}, layout, {
        title: 'Cumulative Payments Over Time',
        xaxis: Object.assign({}, layout.xaxis, {
            title: 'Year',
            tickmode: 'linear',
            dtick: 1,
            range: [0, xValues[xValues.length - 1]] // Set x-axis range explicitly to start from 0
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Total Payments',
            range: [0, Math.max(...yValues)] // Force y-axis to start at 0 and adjust to max value
        }),
        width: window.innerWidth * 0.97,
        height: 400,
    });

    const config = { responsive: true };

    Plotly.newPlot('chart2', [trace], chartLayout, config);
}

function plotEquityBuildUp(schedule, principal, layout) {
    const equityData = schedule.map(p => ({
        x: p.paymentYear.toFixed(2),
        y: (principal - p.remainingBalance).toFixed(2)
    }));

    const trace = {
        x: equityData.map((d) => d.x),
        y: equityData.map((d) => d.y),
        name: 'Home Equity',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#2a9d8f' } // Subtle Green
    };

    const chartLayout = Object.assign({}, layout, {
        title: 'Equity Build-up Over Time',
        xaxis: Object.assign({}, layout.xaxis, {
            title: 'Year',
            tickmode: 'linear',
            dtick: 1
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Equity',
        }),
        width: window.innerWidth * 0.97,
        height: 400,
    });

    const config = { responsive: true };

    Plotly.newPlot('chart4', [trace], chartLayout, config);
}

function plotInterestPrincipalComponents(schedule, layout) {
    const xValues = schedule.map(p => p.paymentYear.toFixed(2));
    const principalPayments = schedule.map(p => p.principalPayment + p.extraPayment);
    const interestPayments = schedule.map(p => p.interestPayment);

    const tracePrincipal = {
        x: xValues,
        y: principalPayments,
        name: 'Principal + Extra Payment',
        type: 'scatter',
        mode: 'lines',
        fill: 'tonexty',
        line: { color: '#457b9d' } // Professional Blue
    };

    const traceInterest = {
        x: xValues,
        y: interestPayments,
        name: 'Interest',
        type: 'scatter',
        mode: 'lines',
        fill: 'tonexty',
        line: { color: '#e63946' } // Muted Red
    };

    const chartLayout = Object.assign({}, layout, {
        title: 'Interest vs Principal Components Over Time',
        xaxis: Object.assign({}, layout.xaxis, {
            title: 'Year',
            tickmode: 'linear',
            dtick: 1
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Payment Amount',
        }),
        width: window.innerWidth * 0.97,
        height: 400,
    });

    const config = { responsive: true };

    Plotly.newPlot('chart6', [traceInterest, tracePrincipal], chartLayout, config);
}

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
        y: principalPayments.map(v => v.toFixed(2)),
        name: 'Principal',
        type: 'bar',
        marker: { color: '#457b9d' } // Professional Blue
    };

    const traceInterest = {
        x: years,
        y: interestPayments.map(v => v.toFixed(2)),
        name: 'Interest',
        type: 'bar',
        marker: { color: '#e63946' } // Muted Red
    };

    const traceExtra = {
        x: years,
        y: extraPayments.map(v => v.toFixed(2)),
        name: 'Extra Payment',
        type: 'bar',
        marker: { color: '#2a9d8f' } // Subtle Green
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
        width: window.innerWidth * 0.97,
        height: 400,
    });

    Plotly.newPlot('chart11', [traceInterest, tracePrincipal, traceExtra], chartLayout);
}

// Comparison plotting functions (conditionally called)

function plotRemainingBalanceComparison(scheduleWithoutExtra, scheduleWithExtra, layout) {
    const trace1 = {
        x: scheduleWithoutExtra.map((d) => d.paymentYear.toFixed(2)),
        y: scheduleWithoutExtra.map((d) => d.remainingBalance.toFixed(2)),
        name: 'Without Extra Payments',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#457b9d' } // Professional Blue
    };

    const trace2 = {
        x: scheduleWithExtra.map((d) => d.paymentYear.toFixed(2)),
        y: scheduleWithExtra.map((d) => d.remainingBalance.toFixed(2)),
        name: 'With Extra Payments',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#2a9d8f' } // Subtle Green
    };

    const chartLayout = Object.assign({}, layout, {
        title: 'Remaining Balance Over Time',
        xaxis: Object.assign({}, layout.xaxis, {
            title: 'Year',
            tickmode: 'linear',
            dtick: 1
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Remaining Balance',
        }),
        width: window.innerWidth * 0.97,
        height: 400,
    });

    const config = { responsive: true };

    Plotly.newPlot('chart3', [trace1, trace2], chartLayout, config);
}

function plotTotalInterestComparison(totalInterestWithoutExtra, totalInterestWithExtra, layout) {
    const data = [
        {
            x: ['Without Extra Payments', 'With Extra Payments'],
            y: [totalInterestWithoutExtra.toFixed(2), totalInterestWithExtra.toFixed(2)],
            type: 'bar',
            marker: { color: ['#e63946', '#457b9d'] }, // Muted Red and Professional Blue
            text: [`$${totalInterestWithoutExtra.toFixed(2)}`, `$${totalInterestWithExtra.toFixed(2)}`],
            textposition: 'auto'
        }
    ];

    const chartLayout = Object.assign({}, layout, {
        title: 'Total Interest Paid Comparison',
        xaxis: Object.assign({}, layout.xaxis, {
            title: 'Scenario',
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Total Interest Paid',
        }),
        width: window.innerWidth * 0.97,
        height: 400,
    });

    const config = { responsive: true };

    Plotly.newPlot('chart7', data, chartLayout, config);
}

function plotLoanTermComparison(termWithoutExtraPayments, termWithExtraPayments, layout) {
    const termWithoutExtraYears = (termWithoutExtraPayments / 12).toFixed(2);
    const termWithExtraYears = (termWithExtraPayments / 12).toFixed(2);

    const data = [
        {
            x: ['Without Extra Payments', 'With Extra Payments'],
            y: [termWithoutExtraYears, termWithExtraYears],
            type: 'bar',
            marker: { color: ['#e63946', '#457b9d'] }, // Muted Red and Professional Blue
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
        width: window.innerWidth * 0.97,
        height: 400,
    });

    const config = { responsive: true };

    Plotly.newPlot('chart8', data, chartLayout, config);
}

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

    const trace = {
        x: xValues.map(x => x.toFixed(2)),
        y: interestSavings.map(s => s.toFixed(2)),
        name: 'Interest Savings',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#2a9d8f' }, // Subtle Green
    };

    const chartLayout = Object.assign({}, layout, {
        title: 'Cumulative Interest Savings Over Time',
        xaxis: Object.assign({}, layout.xaxis, {
            title: 'Year',
            tickmode: 'linear',
            dtick: 1,
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Interest Savings',
        }),
        width: window.innerWidth * 0.97,
        height: 400,
    });

    Plotly.newPlot('chart9', [trace], chartLayout);
}

function plotTotalPaymentsComparison(scheduleWithoutExtra, scheduleWithExtra, principal, layout) {
    const totalPaidWithoutExtra = scheduleWithoutExtra.reduce((sum, p) => sum + p.interestPayment + p.principalPayment, 0);
    const totalPaidWithExtra = scheduleWithExtra.reduce((sum, p) => sum + p.interestPayment + p.principalPayment + p.extraPayment, 0);

    const data = [
        {
            x: ['Without Extra Payments', 'With Extra Payments'],
            y: [totalPaidWithoutExtra.toFixed(2), totalPaidWithExtra.toFixed(2)],
            type: 'bar',
            marker: { color: ['#e63946', '#457b9d'] }, // Muted Red and Professional Blue
            text: [`$${totalPaidWithoutExtra.toFixed(2)}`, `$${totalPaidWithExtra.toFixed(2)}`],
            textposition: 'auto'
        }
    ];

    const chartLayout = Object.assign({}, layout, {
        title: 'Total Payments Comparison',
        xaxis: Object.assign({}, layout.xaxis, {
            title: 'Scenario',
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Total Amount Paid',
        }),
        width: window.innerWidth * 0.97,
        height: 400,
    });

    Plotly.newPlot('chart10', data, chartLayout);
}

function plotEquityComparisonOverTime(scheduleWithoutExtra, scheduleWithExtra, principal, layout) {
    const xValuesWithoutExtra = scheduleWithoutExtra.map(p => p.paymentYear.toFixed(2));
    const equityWithoutExtra = scheduleWithoutExtra.map(p => (principal - p.remainingBalance).toFixed(2));

    const xValuesWithExtra = scheduleWithExtra.map(p => p.paymentYear.toFixed(2));
    const equityWithExtra = scheduleWithExtra.map(p => (principal - p.remainingBalance).toFixed(2));

    const traceWithoutExtra = {
        x: xValuesWithoutExtra,
        y: equityWithoutExtra,
        name: 'Without Extra Payments',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#e63946' } // Muted Red
    };

    const traceWithExtra = {
        x: xValuesWithExtra,
        y: equityWithExtra,
        name: 'With Extra Payments',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#2a9d8f' } // Subtle Green
    };

    const chartLayout = Object.assign({}, layout, {
        title: 'Cumulative Equity Over Time',
        xaxis: Object.assign({}, layout.xaxis, {
            title: 'Year',
            tickmode: 'linear',
            dtick: 1,
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Cumulative Equity ($)',
        }),
        width: window.innerWidth * 0.97,
        height: 400,
    });

    Plotly.newPlot('chart14', [traceWithoutExtra, traceWithExtra], chartLayout);
}

// Helper functions to manage chart visibility

function showComparisonCharts(show) {
    const comparisonChartIds = ['chart7', 'chart8', 'chart9', 'chart10', 'chart14'];
    comparisonChartIds.forEach(chartId => {
        const chartDiv = document.getElementById(chartId);
        if (chartDiv) {
            chartDiv.style.display = show ? 'block' : 'none';
        }
    });
}

function clearComparisonCharts() {
    const comparisonChartIds = ['chart7', 'chart8', 'chart9', 'chart10', 'chart14'];
    comparisonChartIds.forEach(chartId => {
        Plotly.purge(chartId);
    });
}

// New functions for extended extra payment range

function plotExtraPaymentEffectOnLoanTerm(principal, monthlyRate, numPayments, layout) {
    const extraPayments = [];
    const loanTerms = [];

    // Calculate loan term for extra payments ranging from $0 to $2,000 in $50 increments
    for (let extra = 0; extra <= 2000; extra += 50) {
        const mortgagePayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
        const schedule = computeAmortizationSchedule(principal, monthlyRate, mortgagePayment, extra, numPayments);
        const loanTermYears = (schedule.length / 12).toFixed(2);

        extraPayments.push(extra);
        loanTerms.push(loanTermYears);
    }

    const trace = {
        x: extraPayments,
        y: loanTerms,
        type: 'scatter',
        mode: 'lines+markers',
        marker: { color: '#2a9d8f' }, // Subtle Green
        name: 'Loan Term Reduction'
    };

    const chartLayout = Object.assign({}, layout, {
        title: 'Effect of Extra Payments on Loan Term',
        xaxis: Object.assign({}, layout.xaxis, {
            title: 'Extra Payment Amount ($)',
            tickmode: 'linear',
            dtick: 200
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Loan Term (Years)',
        }),
        width: window.innerWidth * 0.97,
        height: 400,
    });

    Plotly.newPlot('chart12', [trace], chartLayout);
}

function plotExtraPaymentEffectOnTotalInterest(principal, monthlyRate, numPayments, layout) {
    const extraPayments = [];
    const totalInterests = [];

    // Calculate total interest for extra payments ranging from $0 to $2,000 in $50 increments
    for (let extra = 0; extra <= 2000; extra += 50) {
        const mortgagePayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
        const schedule = computeAmortizationSchedule(principal, monthlyRate, mortgagePayment, extra, numPayments);
        const totalInterest = schedule.reduce((sum, p) => sum + p.interestPayment, 0).toFixed(2);

        extraPayments.push(extra);
        totalInterests.push(totalInterest);
    }

    const trace = {
        x: extraPayments,
        y: totalInterests,
        type: 'scatter',
        mode: 'lines+markers',
        marker: { color: '#e63946' }, // Muted Red
        name: 'Total Interest Reduction'
    };

    const chartLayout = Object.assign({}, layout, {
        title: 'Effect of Extra Payments on Total Interest Paid',
        xaxis: Object.assign({}, layout.xaxis, {
            title: 'Extra Payment Amount ($)',
            tickmode: 'linear',
            dtick: 200
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Total Interest Paid ($)',
        }),
        width: window.innerWidth * 0.97,
        height: 400,
    });

    Plotly.newPlot('chart13', [trace], chartLayout);
}

function createAmortizationTable(schedule, mortgagePayment, extraPayment, firstPaymentDate) {
    const tableBody = document.querySelector("#amortization-table tbody");
    tableBody.innerHTML = ''; // Clear existing table rows

    let totalInterest = 0;
    let totalPrincipal = 0;
    let totalExtraPayments = 0;

    let currentDate = null;
    if (firstPaymentDate) {
        // Parse the date components explicitly
        const dateParts = firstPaymentDate.split('-');
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // Months are zero-based
        const day = parseInt(dateParts[2]);
        currentDate = new Date(year, month, day);
    }

    schedule.forEach((p) => {
        totalInterest += p.interestPayment;
        totalPrincipal += p.principalPayment;
        totalExtraPayments += p.extraPayment;

        const row = document.createElement('tr');

        // Create the payment number or date cell
        const paymentCell = document.createElement('td');
        if (currentDate) {
            paymentCell.textContent = formatDate(currentDate);
            currentDate.setMonth(currentDate.getMonth() + 1);
        } else {
            paymentCell.textContent = `Payment ${p.paymentNumber}`;
        }
        row.appendChild(paymentCell);

        // Add the rest of the cells
        row.innerHTML += `
            <td>$${(p.principalPayment + p.interestPayment + p.extraPayment).toFixed(2)}</td>
            <td>$${p.extraPayment.toFixed(2)}</td>
            <td>$${p.principalPayment.toFixed(2)}</td>
            <td>$${p.interestPayment.toFixed(2)}</td>
            <td>$${p.remainingBalance.toFixed(2)}</td>
        `;

        tableBody.appendChild(row);
    });

    // Add a summary row
    const summaryRow = document.createElement('tr');
    summaryRow.innerHTML = `
        <td colspan="2"><strong>Totals</strong></td>
        <td><strong>$${totalExtraPayments.toFixed(2)}</strong></td>
        <td><strong>$${totalPrincipal.toFixed(2)}</strong></td>
        <td><strong>$${totalInterest.toFixed(2)}</strong></td>
        <td><strong>N/A</strong></td>
    `;
    tableBody.appendChild(summaryRow);
}

function clearDate() {
    const firstPaymentDateInput = document.getElementById("firstPaymentDate");
    firstPaymentDateInput.value = "";

    // Recalculate the mortgage to update the amortization table
    calculateMortgage(new Event('submit'));
}

function formatDate(date) {
    const options = { year: 'numeric', month: 'short' };
    return date.toLocaleDateString('en-US', options);
}

const form = document.getElementById("mortgageForm");
form.addEventListener("submit", calculateMortgage);

const clearDateBtn = document.getElementById("clearDateBtn");
clearDateBtn.addEventListener("click", clearDate);

const modeSwitch = document.getElementById('mode-switch');
const body = document.body;

modeSwitch.addEventListener('change', () => {
    if (modeSwitch.checked) {
        body.classList.add('dark-mode');
    } else {
        body.classList.remove('dark-mode');
    }
    // Recalculate the mortgage to update charts with the new layout
    calculateMortgage(new Event('submit'));
});

window.addEventListener('resize', function() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    const currentLayout = isDarkMode ? darkLayout : lightLayout;

    const charts = [
        'chart', 'chart2', 'chart4', 'chart6', 'chart11', 'chart12', 'chart13',
        // Include comparison charts if they are visible
        'chart3', 'chart7', 'chart8', 'chart9', 'chart10', 'chart14'
    ];
    charts.forEach(chartId => {
        const chartDiv = document.getElementById(chartId);
        if (chartDiv && chartDiv.style.display !== 'none') {
            Plotly.relayout(chartId, {
                width: window.innerWidth * 0.97,
                'paper_bgcolor': currentLayout.paper_bgcolor,
                'plot_bgcolor': currentLayout.plot_bgcolor,
                'font.color': currentLayout.font.color,
                'xaxis.tickfont.color': currentLayout.xaxis.tickfont.color,
                'yaxis.tickfont.color': currentLayout.yaxis.tickfont.color,
                'xaxis.titlefont.color': currentLayout.xaxis.titlefont.color,
                'yaxis.titlefont.color': currentLayout.yaxis.titlefont.color,
                'xaxis.gridcolor': currentLayout.xaxis.gridcolor,
                'yaxis.gridcolor': currentLayout.yaxis.gridcolor,
                'legend.font.color': currentLayout.legend.font.color
            });
        }
    });
});

// Add event listeners for the new buttons
const popoutGraphsBtn = document.getElementById('popoutGraphsBtn');
popoutGraphsBtn.addEventListener('click', popoutGraphs);

const popoutScheduleBtn = document.getElementById('popoutScheduleBtn');
popoutScheduleBtn.addEventListener('click', popoutSchedule);

// Function to pop out graphs
function popoutGraphs() {
    const newWindow = window.open('', '_blank');
    newWindow.document.write(`
        <html>
        <head>
            <title>Mortgage Graphs</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <!-- Include CSS Stylesheet -->
            <link rel="stylesheet" href="style.css">
            <!-- Include Plotly Library -->
            <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
        </head>
        <body>
            <div class="container">
                <!-- Dark Mode Toggle -->
                <div class="mode-toggle">
                    <label for="mode-switch">Dark Mode</label>
                    <label class="switch">
                        <input type="checkbox" id="mode-switch">
                        <span class="slider"></span>
                    </label>
                </div>
                <h2>Mortgage Graphs</h2>
                <!-- Charts -->
                <div id="chart"></div>
                <div id="chart2"></div>
                <div id="chart4"></div>
                <div id="chart6"></div>
                <div id="chart11"></div>
                <div id="chart12"></div>
                <div id="chart13"></div>
                <!-- Comparison Charts -->
                <div id="chart3"></div>
                <div id="chart7"></div>
                <div id="chart8"></div>
                <div id="chart9"></div>
                <div id="chart10"></div>
                <div id="chart14"></div>
                <!-- Print Button -->
                <button onclick="window.print()">Print Out</button>
            </div>
            <!-- Include JavaScript File -->
            <script src="popoutgraphs.js"></script>
        </body>
        </html>
    `);
}

// Function to pop out amortization schedule
function popoutSchedule() {
    const newWindow = window.open('', '_blank');
    newWindow.document.write(`
        <html>
        <head>
            <title>Amortization Schedule</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <!-- Include CSS Stylesheet -->
            <link rel="stylesheet" href="style.css">
        </head>
        <body>
            <div class="container">
                <!-- Dark Mode Toggle -->
                <div class="mode-toggle">
                    <label for="mode-switch">Dark Mode</label>
                    <label class="switch">
                        <input type="checkbox" id="mode-switch">
                        <span class="slider"></span>
                    </label>
                </div>
                <h2>Amortization Schedule</h2>
                <div id="amortization-table-container">
                    <table id="amortization-table">
                        <thead>
                            <tr>
                                <th>Payment # / Date</th>
                                <th>Payment Amount</th>
                                <th>Extra Payment</th>
                                <th>Principal Paid</th>
                                <th>Interest Paid</th>
                                <th>Remaining Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Table rows will be inserted here by JavaScript -->
                        </tbody>
                    </table>
                </div>
                <!-- Print Button -->
                <button onclick="window.print()">Print Out</button>
            </div>
            <!-- Include JavaScript File -->
            <script src="popoutschedule.js"></script>
        </body>
        </html>
    `);
}
