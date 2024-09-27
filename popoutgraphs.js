// popoutgraphs.js

// Read data from localStorage
const mortgageData = JSON.parse(localStorage.getItem('mortgageData'));

if (!mortgageData) {
    alert('No mortgage data available. Please calculate the mortgage first.');
} else {
    // Extract necessary data
    const {
        scheduleWithExtraTerm,
        scheduleWithoutExtraTerm,
        scheduleWithExtraTotal,
        scheduleWithoutExtraTotal,
        totalInterestPaidWithoutExtraTerm,
        totalInterestPaidWithExtraTerm,
        totalInterestPaidWithoutExtraTotal,
        totalInterestPaidWithExtraTotal,
        extraSavedTerm,
        extraSavedTotal,
        loanPaidOffInYears,
        totalLoanYears,
        principal
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
        plot_bgcolor: '#1a1a1a',
        paper_bgcolor: '#1a1a1a',
        font: { color: '#f0f0f0' },
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
        plotPaymentBreakdown(scheduleWithExtraTerm, currentLayout);
        plotCumulativeChart(scheduleWithExtraTotal, currentLayout);
        plotRemainingBalanceComparison(scheduleWithoutExtraTotal, scheduleWithExtraTotal, currentLayout);
        plotEquityBuildUp(scheduleWithExtraTotal, principal, currentLayout);

        // New Charts
        plotInterestPrincipalComponents(scheduleWithExtraTotal, currentLayout);
        plotTotalInterestComparison(totalInterestPaidWithoutExtraTotal, totalInterestPaidWithExtraTotal, currentLayout);
        plotLoanTermComparison(scheduleWithoutExtraTotal.length, scheduleWithExtraTotal.length, currentLayout);

        // Additional Charts
        plotInterestSavingsOverTime(scheduleWithoutExtraTotal, scheduleWithExtraTotal, currentLayout);
        plotTotalPaymentsComparison(scheduleWithoutExtraTotal, scheduleWithExtraTotal, principal, currentLayout);
        plotAnnualPaymentSummary(scheduleWithExtraTotal, currentLayout);
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
            title: 'Mortgage Payment Breakdown (for Term)',
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
            // Update total payment
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

    // Call plotAllCharts() initially
    plotAllCharts();

    // Add event listener for window resize
    window.addEventListener('resize', function() {
        const currentLayout = isDarkMode ? darkLayout : lightLayout;

        const charts = ['chart', 'chart2', 'chart3', 'chart4', 'chart6', 'chart7', 'chart8', 'chart9', 'chart10', 'chart11'];
        charts.forEach(chartId => {
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

        const charts = ['chart', 'chart2', 'chart3', 'chart4', 'chart6', 'chart7', 'chart8', 'chart9', 'chart10', 'chart11'];

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
        const charts = ['chart', 'chart2', 'chart3', 'chart4', 'chart6', 'chart7', 'chart8', 'chart9', 'chart10', 'chart11'];

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