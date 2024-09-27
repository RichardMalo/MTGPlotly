// Read data from localStorage
const mortgageData = JSON.parse(localStorage.getItem('mortgageData'));

if (!mortgageData) {
    alert('No mortgage data available. Please calculate the mortgage first.');
} else {
    // Extract necessary data
    const { scheduleWithExtraTotal, mortgagePayment, extraPayment, firstPaymentDate } = mortgageData;

    // Implement dark/light mode toggle
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
    });

    // Create amortization table
    createAmortizationTable(scheduleWithExtraTotal, mortgagePayment, extraPayment, firstPaymentDate);

    // Function to create the amortization table
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

    // Function to format the date
    function formatDate(date) {
        const options = { year: 'numeric', month: 'short' };
        return date.toLocaleDateString('en-US', options);
    }
}