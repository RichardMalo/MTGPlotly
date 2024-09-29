// mortgagecalculator.js

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

function calculateMortgage(event) {
    if (event) event.preventDefault();

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

    const scheduleWithExtraTotal = computeAmortizationSchedule(principal, monthlyRate, mortgagePayment, extraPayment, numPayments);

    const isDarkMode = document.body.classList.contains('dark-mode');
    const currentLayout = isDarkMode ? darkLayout : lightLayout;

    plotPaymentBreakdown(scheduleWithExtraTotal, currentLayout);
    plotCumulativeChart(scheduleWithExtraTotal, currentLayout);
    plotEquityBuildUp(scheduleWithExtraTotal, principal, currentLayout);

    let scheduleWithoutExtraTotal = null;
    if (extraPayment > 0) {
        scheduleWithoutExtraTotal = computeAmortizationSchedule(principal, monthlyRate, mortgagePayment, 0, numPayments);

        const totalInterestPaidWithoutExtraTotal = scheduleWithoutExtraTotal.reduce((sum, p) => sum + p.interestPayment, 0);
        const totalInterestPaidWithExtraTotal = scheduleWithExtraTotal.reduce((sum, p) => sum + p.interestPayment, 0);

        const extraSavedTotal = totalInterestPaidWithoutExtraTotal - totalInterestPaidWithExtraTotal;

        document.getElementById("extraSavedTotal").value = extraSavedTotal.toFixed(2);

        const loanPaidOffInYears = (scheduleWithExtraTotal.length / 12).toFixed(2);
        const totalLoanYears = (numPayments / 12).toFixed(2);
        document.getElementById("paidOffIn").value = loanPaidOffInYears;
        document.getElementById("outOf").value = totalLoanYears;

        plotRemainingBalanceComparison(scheduleWithoutExtraTotal, scheduleWithExtraTotal, currentLayout);
        plotTotalInterestComparison(totalInterestPaidWithoutExtraTotal, totalInterestPaidWithExtraTotal, currentLayout);
        plotLoanTermComparison(scheduleWithoutExtraTotal.length, scheduleWithExtraTotal.length, currentLayout);
        plotInterestSavingsOverTime(scheduleWithoutExtraTotal, scheduleWithExtraTotal, currentLayout);
        plotTotalPaymentsComparison(scheduleWithoutExtraTotal, scheduleWithExtraTotal, principal, currentLayout);
        plotEquityComparisonOverTime(scheduleWithoutExtraTotal, scheduleWithExtraTotal, principal, currentLayout);

        showComparisonCharts(true);
    } else {
        clearComparisonCharts();
        showComparisonCharts(false);

        document.getElementById("extraSavedTotal").value = "0.00";
        document.getElementById("paidOffIn").value = (numPayments / 12).toFixed(2);
        document.getElementById("outOf").value = (numPayments / 12).toFixed(2);
    }

    plotInterestPrincipalComponents(scheduleWithExtraTotal, currentLayout);
    plotAnnualPaymentSummary(scheduleWithExtraTotal, currentLayout);
    plotExtraPaymentEffectOnLoanTerm(principal, monthlyRate, numPayments, currentLayout);
    plotExtraPaymentEffectOnTotalInterest(principal, monthlyRate, numPayments, currentLayout);

    createAmortizationTable(scheduleWithExtraTotal, mortgagePayment, extraPayment, firstPaymentDate);
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
        marker: { color: '#2a9d8f' }
    };

    const tracePrincipal = {
        x: xValues,
        y: data.map((d) => d.y[0]),
        name: 'Principal',
        type: 'bar',
        text: data.map((d) => `$${d.y[0].toFixed(2)}`),
        textposition: 'auto',
        marker: { color: '#457b9d' }
    };

    const traceInterest = {
        x: xValues,
        y: data.map((d) => d.y[1]),
        name: 'Interest',
        type: 'bar',
        text: data.map((d) => `$${d.y[1].toFixed(2)}`),
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
        width: window.innerWidth * 0.97,
        height: 400,
    });

    const config = { responsive: true };

    Plotly.newPlot('chart', [traceInterest, tracePrincipal, traceExtra], chartLayout, config);
}

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

    const xStart = 0;
    const xEnd = xValues[xValues.length - 1];
    const xPadding = (xEnd - xStart) * 0.05;
    const yStart = 0;
    const yEnd = Math.max(...yValues);
    const yPadding = yEnd * 0.05;

    const chartLayout = Object.assign({}, layout, {
        title: 'Cumulative Payments Over Time',
        xaxis: Object.assign({}, layout.xaxis, {
            title: 'Year',
            tickmode: 'linear',
            dtick: 1,
            range: [xStart - xPadding, xEnd + xPadding],
            zeroline: false
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Total Payments',
            range: [yStart - yPadding, yEnd + yPadding]
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
            range: [xStart - xPadding, xEnd + xPadding],
            zeroline: false
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Equity',
            range: [yStart - yPadding, yEnd + yPadding]
        }),
        width: window.innerWidth * 0.97,
        height: 400,
    });

    const config = { responsive: true };

    Plotly.newPlot('chart4', [trace], chartLayout, config);
}

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
            range: [xStart - xPadding, xEnd + xPadding],
            zeroline: false
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Payment Amount',
            range: [yStart - yPadding, yEnd + yPadding]
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
        marker: { color: '#457b9d' }
    };

    const traceInterest = {
        x: years,
        y: interestPayments.map(v => v.toFixed(2)),
        name: 'Interest',
        type: 'bar',
        marker: { color: '#e63946' }
    };

    const traceExtra = {
        x: years,
        y: extraPayments.map(v => v.toFixed(2)),
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
        width: window.innerWidth * 0.97,
        height: 400,
    });

    Plotly.newPlot('chart11', [traceInterest, tracePrincipal, traceExtra], chartLayout);
}

function plotRemainingBalanceComparison(scheduleWithoutExtra, scheduleWithExtra, layout) {
    const xValuesWithoutExtra = scheduleWithoutExtra.map((d) => parseFloat(d.paymentYear.toFixed(2)));
    const yValuesWithoutExtra = scheduleWithoutExtra.map((d) => d.remainingBalance.toFixed(2));

    const xValuesWithExtra = scheduleWithExtra.map((d) => parseFloat(d.paymentYear.toFixed(2)));
    const yValuesWithExtra = scheduleWithExtra.map((d) => d.remainingBalance.toFixed(2));

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
            range: [xStart - xPadding, xEnd + xPadding],
            zeroline: false
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Remaining Balance',
            range: [yStart - yPadding, yEnd + yPadding]
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
            marker: { color: ['#e63946', '#2a9d8f'] },
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

    const xStart = 0;
    const xEnd = xValues[xValues.length - 1];
    const xPadding = (xEnd - xStart) * 0.05;
    const yStart = 0;
    const yEnd = Math.max(...interestSavings);
    const yPadding = yEnd * 0.05;

    const trace = {
        x: xValues.map(x => x.toFixed(2)),
        y: interestSavings.map(s => s.toFixed(2)),
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
            range: [xStart - xPadding, xEnd + xPadding],
            zeroline: false
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Interest Savings',
            range: [yStart - yPadding, yEnd + yPadding]
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
            marker: { color: ['#e63946', '#2a9d8f'] },
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
    const xValuesWithoutExtra = scheduleWithoutExtra.map(p => parseFloat(p.paymentYear.toFixed(2)));
    const equityWithoutExtra = scheduleWithoutExtra.map(p => (principal - p.remainingBalance).toFixed(2));

    const xValuesWithExtra = scheduleWithExtra.map(p => parseFloat(p.paymentYear.toFixed(2)));
    const equityWithExtra = scheduleWithExtra.map(p => (principal - p.remainingBalance).toFixed(2));

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
            range: [xStart - xPadding, xEnd + xPadding],
            zeroline: false
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Cumulative Equity ($)',
            range: [yStart - yPadding, yEnd + yPadding]
        }),
        width: window.innerWidth * 0.97,
        height: 400,
    });

    Plotly.newPlot('chart14', [traceWithoutExtra, traceWithExtra], chartLayout);
}

function plotExtraPaymentEffectOnLoanTerm(principal, monthlyRate, numPayments, layout) {
    const extraPayments = [];
    const loanTerms = [];

    for (let extra = 0; extra <= 2000; extra += 50) {
        const mortgagePayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
        const schedule = computeAmortizationSchedule(principal, monthlyRate, mortgagePayment, extra, numPayments);
        const loanTermYears = (schedule.length / 12).toFixed(2);

        extraPayments.push(extra);
        loanTerms.push(loanTermYears);
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
            range: [xStart - xPadding, xEnd + xPadding],
            zeroline: false
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Loan Term (Years)',
            range: [yStart - yPadding, yEnd + yPadding]
        }),
        width: window.innerWidth * 0.97,
        height: 400,
    });

    Plotly.newPlot('chart12', [trace], chartLayout);
}

function plotExtraPaymentEffectOnTotalInterest(principal, monthlyRate, numPayments, layout) {
    const extraPayments = [];
    const totalInterests = [];

    for (let extra = 0; extra <= 2000; extra += 50) {
        const mortgagePayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
        const schedule = computeAmortizationSchedule(principal, monthlyRate, mortgagePayment, extra, numPayments);
        const totalInterest = schedule.reduce((sum, p) => sum + p.interestPayment, 0).toFixed(2);

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
            range: [xStart - xPadding, xEnd + xPadding],
            zeroline: false
        }),
        yaxis: Object.assign({}, layout.yaxis, {
            title: 'Total Interest Paid ($)',
            range: [yStart - yPadding, yEnd + yPadding]
        }),
        width: window.innerWidth * 0.97,
        height: 400,
    });

    Plotly.newPlot('chart13', [trace], chartLayout);
}

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
        const month = parseInt(dateParts[1]) - 1;
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
            <td>$${(p.principalPayment + p.interestPayment + p.extraPayment).toFixed(2)}</td>
            <td>$${p.extraPayment.toFixed(2)}</td>
            <td>$${p.principalPayment.toFixed(2)}</td>
            <td>$${p.interestPayment.toFixed(2)}</td>
            <td>$${p.remainingBalance.toFixed(2)}</td>
        `;

        tableBody.appendChild(row);
    });

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

    calculateMortgage(new Event('submit'));
}

function formatDate(date) {
    const options = { year: 'numeric', month: 'short' };
    return date.toLocaleDateString('en-US', options);
}

// Event listeners
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
    calculateMortgage();
});

window.addEventListener('resize', function() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    const currentLayout = isDarkMode ? darkLayout : lightLayout;

    const charts = [
        'chart', 'chart2', 'chart4', 'chart6', 'chart11', 'chart12', 'chart13',
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

const printChartsBtn = document.getElementById('printChartsBtn');
printChartsBtn.addEventListener('click', printCharts);

const printScheduleBtn = document.getElementById('printScheduleBtn');
printScheduleBtn.addEventListener('click', printAmortizationSchedule);

function printCharts() {
    calculateMortgage();

    document.body.classList.add('print-charts');

    window.print();
}

function printAmortizationSchedule() {
    calculateMortgage();

    document.body.classList.add('print-schedule');

    window.print();
}

window.addEventListener('afterprint', () => {
    document.body.classList.remove('print-charts');
    document.body.classList.remove('print-schedule');
});

function showComparisonCharts(show) {
    const comparisonChartIds = ['chart3', 'chart7', 'chart8', 'chart9', 'chart10', 'chart14'];
    comparisonChartIds.forEach(chartId => {
        const chartDiv = document.getElementById(chartId);
        if (chartDiv) {
            chartDiv.style.display = show ? 'block' : 'none';
        }
    });
}

function clearComparisonCharts() {
    const comparisonChartIds = ['chart3', 'chart7', 'chart8', 'chart9', 'chart10', 'chart14'];
    comparisonChartIds.forEach(chartId => {
        Plotly.purge(chartId);
    });
}
