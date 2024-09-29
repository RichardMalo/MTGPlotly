// popoutgraphs.js

// Read data from localStorage
const mortgageData = JSON.parse(localStorage.getItem('mortgageData'));

if (!mortgageData) {
    alert('No mortgage data available. Please calculate the mortgage first.');
} else {
    // Extract necessary data
    const {
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
        scheduleWithoutExtraTotal,
    } = mortgageData;

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

    // Determine current mode
    const modeSwitch = document.getElementById('mode-switch');
    const body = document.body;

    let isDarkMode = false;

    modeSwitch.addEventListener('change', () => {
        if (modeSwitch.checked) {
            body.classList.add('dark-mode');
            isDarkMode = true;
        } else {
            body.classList.remove('dark-mode');
            isDarkMode = false;
        }
        // Re-plot charts with the new layout
        plotAllCharts();
    });

    // Function to plot all charts
    function plotAllCharts() {
        const currentLayout = isDarkMode ? darkLayout : lightLayout;

        // Plot charts with the selected layout
        plotPaymentBreakdown(scheduleWithExtraTotal, currentLayout);
        plotCumulativeChart(scheduleWithExtraTotal, currentLayout);
        plotEquityBuildUp(scheduleWithExtraTotal, principal, currentLayout);
        plotInterestPrincipalComponents(scheduleWithExtraTotal, currentLayout);
        plotAnnualPaymentSummary(scheduleWithExtraTotal, currentLayout);
        plotExtraPaymentEffectOnLoanTerm(principal, monthlyRate, numPayments, currentLayout);
        plotExtraPaymentEffectOnTotalInterest(principal, monthlyRate, numPayments, currentLayout);

        // Conditionally plot comparison graphs if extraPayment > 0
        if (extraPayment > 0 && scheduleWithoutExtraTotal) {
            // Compute total interest paid
            const totalInterestPaidWithoutExtraTotal = scheduleWithoutExtraTotal.reduce((sum, p) => sum + p.interestPayment, 0);
            const totalInterestPaidWithExtraTotal = scheduleWithExtraTotal.reduce((sum, p) => sum + p.interestPayment, 0);

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
            // Hide comparison chart divs
            showComparisonCharts(false);
        }
    }

    // Plotting functions (same as in mortgagecalculator.js, adjusted as needed)

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

    // Conditional plotting functions

    function plotRemainingBalanceComparison(scheduleWithoutExtra, scheduleWithExtra, layout) {
        const trace1 = {
            x: scheduleWithoutExtra.map((d) => d.paymentYear.toFixed(2)),
            y: scheduleWithoutExtra.map((d) => d.remainingBalance.toFixed(2)),
            name: 'Without Extra Payments',
            type: 'scatter',
            mode: 'lines',
            line: { color: '#e63946' } // Muted Red
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
                marker: { color: ['#e63946', '#2a9d8f'] }, // Muted Red and Subtle Green
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
                marker: { color: ['#e63946', '#2a9d8f'] }, // Muted Red and Subtle Green
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
                marker: { color: ['#e63946', '#2a9d8f'] }, // Muted Red and Subtle Green
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

    // Helper functions
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

    // Helper functions to manage chart visibility

    function showComparisonCharts(show) {
        const comparisonChartIds = ['chart3', 'chart7', 'chart8', 'chart9', 'chart10', 'chart14'];
        comparisonChartIds.forEach(chartId => {
            const chartDiv = document.getElementById(chartId);
            if (chartDiv) {
                chartDiv.style.display = show ? 'block' : 'none';
            }
        });
    }

    // Call plotAllCharts() initially
    plotAllCharts();

    // Add event listener for window resize
    window.addEventListener('resize', function() {
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

    // Handle print events to adjust chart sizes
    let originalChartLayouts = {};

    window.onbeforeprint = function() {
        adjustChartsForPrint();
    };

    window.onafterprint = function() {
        restoreChartsAfterPrint();
    };

    function adjustChartsForPrint() {
        // Adjust chart sizes for legal paper size (8.5 x 14 inches)
        const dpi = 96; // Assuming 96 DPI
        const pageWidthInches = 8.5; // Width of legal paper
        const pageMarginsInches = 1; // Total margins (left + right)
        const printableWidthInches = pageWidthInches - pageMarginsInches;
        const printableWidthPixels = printableWidthInches * dpi;

        const charts = [
            'chart', 'chart2', 'chart4', 'chart6', 'chart11', 'chart12', 'chart13',
            // Include comparison charts if they are visible
            'chart3', 'chart7', 'chart8', 'chart9', 'chart10', 'chart14'
        ];

        charts.forEach(chartId => {
            const chartElement = document.getElementById(chartId);

            // Store original layout
            if (!originalChartLayouts[chartId]) {
                originalChartLayouts[chartId] = {
                    width: chartElement.layout.width,
                    height: chartElement.layout.height
                };
            }

            // Update layout for printing
            Plotly.relayout(chartId, {
                width: printableWidthPixels,
                height: printableWidthPixels * 0.6 // Adjust height as needed
            });
        });
    }

    function restoreChartsAfterPrint() {
        const charts = [
            'chart', 'chart2', 'chart4', 'chart6', 'chart11', 'chart12', 'chart13',
            // Include comparison charts if they are visible
            'chart3', 'chart7', 'chart8', 'chart9', 'chart10', 'chart14'
        ];

        charts.forEach(chartId => {
            // Restore original layout
            if (originalChartLayouts[chartId]) {
                Plotly.relayout(chartId, {
                    width: originalChartLayouts[chartId].width,
                    height: originalChartLayouts[chartId].height
                });
            }
        });
    }
}
