let tableData = [];
let timer;
let statusUpdateInterval;

async function loadListNames() {
  try {
    const response = await fetch("data.json");
    const data = await response.json();
    const listSelect = document.getElementById("list-select");
    for (const listName in data) {
      const option = document.createElement("option");
      option.value = listName;
      option.textContent = listName;
      listSelect.appendChild(option);
    }
  } catch (error) {
    console.error("Error loading list names:", error);
  }
}

async function fetchData() {
  const apiKey = document.getElementById("api-key").value;
  if (apiKey === "") {
    alert("Please enter an API key");
    return;
  }

  const listSelect = document.getElementById("list-select");
  const selectedList = listSelect.value;

  if (!selectedList) {
    return;
  }

  const fetchButton = document.getElementById("fetch-button");
  fetchButton.disabled = true;
  startCountdown();

  showLoadingIndicator();
  hideDataTable();

  try {
    const response = await fetch("data.json");
    const data = await response.json();
    const tableData = data[selectedList];

    if (tableData.length === 0) {
      displayNoDataMessage();
      hideLoadingIndicator();
      return;
    }

    const userPromises = tableData.map(async (row) => {
      const apiUrl = `https://api.torn.com/user/${row.id}?selections=basic&key=${apiKey}`;
      try {
        const userResponse = await fetch(apiUrl);
        const userData = await userResponse.json();
        const status = formatStatus(userData.status);
        return { ...row, status };
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    });

    const usersWithStatus = await Promise.all(userPromises);

    // Sorting users
    const sortedUsers = usersWithStatus.sort((a, b) => {
      const aBSP = parseFloat(a.BSP_total) || 0;
      const bBSP = parseFloat(b.BSP_total) || 0;
      const aTotal = parseFloat(a.total) || 0;
      const bTotal = parseFloat(b.total) || 0;
      
      if (aBSP !== bBSP) return bBSP - aBSP;
      return bTotal - aTotal;
    });

    renderLayout(sortedUsers); // Using renderLayout instead of direct row creation

    hideNoDataMessage();
    displayDataTable();

    clearInterval(statusUpdateInterval);
    statusUpdateInterval = setInterval(() => {
      updateStatus();
    }, 1000);

    hideLoadingIndicator();
  } catch (error) {
    console.error("Error fetching data:", error);
    hideLoadingIndicator();
  }
}

function startCountdown() {
  const fetchButton = document.getElementById("fetch-button");
  const startTime = Date.now();
  const countdownSeconds = 30;

  clearInterval(timer);
  timer = setInterval(() => {
    const secondsSinceStart = Math.floor((Date.now() - startTime) / 1000);
    const remainingTime = countdownSeconds - secondsSinceStart;

    if (remainingTime <= 0) {
      clearInterval(timer);
      fetchButton.textContent = "Fetch";
      fetchButton.disabled = false;
    } else {
      fetchButton.textContent = `Fetch (${remainingTime}s)`;
    }
  }, 1000);
}

function parseHospitalTime(status) {
  const timeMatch = status.match(/\((\d+)m (\d+)s\)/);
  if (!timeMatch) return Infinity;
  const [_, minutes, seconds] = timeMatch;
  return parseInt(minutes) * 60 + parseInt(seconds);
}

function displayNoDataMessage() {
  const noDataMessage = document.getElementById("no-data-message");
  noDataMessage.classList.remove("hidden");

  const dataTable = document.getElementById("data-table");
  dataTable.classList.add("hidden");

  const apiMessage = document.getElementById("api-message");
  apiMessage.classList.remove("hidden");
}

function hideNoDataMessage() {
  const noDataMessage = document.getElementById("no-data-message");
  noDataMessage.classList.add("hidden");
}

function displayDataTable() {
  const dataTable = document.getElementById("data-table");
  dataTable.classList.remove("hidden");

  const apiMessage = document.getElementById("api-message");
  apiMessage.classList.add("hidden");
}

function formatStatus(status) {
  let formattedStatus = status.state;
  if (formattedStatus === "Hospital") {
    const remaining = status.until - Date.now() / 1000;
    const minutes = Math.floor(remaining / 60);
    const seconds = Math.floor(remaining % 60);
    formattedStatus = `Hospitalized (${minutes}m ${seconds}s)`;
  } 
  else if (formattedStatus === "Abroad" || formattedStatus === "Traveling") {
    formattedStatus = status.description || formattedStatus; // Fallback to state if description is missing
  }																								   
  return formattedStatus;
}

function updateStatus() {
  const rows = document.querySelectorAll("#table-body tr");
  rows.forEach((row) => {
    const statusCell = row.querySelector("td:nth-child(8)");
    const currentStatus = statusCell.textContent.trim();
    const remaining = parseHospitalTime(currentStatus);
    if (remaining === Infinity) return;

    const updatedRemaining = remaining - 1;
    if (updatedRemaining <= 0) {
      statusCell.textContent = "Okay";
      const userId = row.querySelector("a[href*='XID']").textContent.match(/\[(\d+)\]/)[1];
      const attackLinkCell = row.querySelector("td:nth-child(9)");
      attackLinkCell.innerHTML = createAttackLink(userId, "Okay");
    } else {
      const updatedMinutes = Math.floor(updatedRemaining / 60);
      const updatedSeconds = updatedRemaining % 60;
      statusCell.textContent = `Hospitalized (${updatedMinutes}m ${updatedSeconds}s)`;
    }
  });
}

function showLoadingIndicator() {
  const loadingIndicator = document.getElementById("loading-indicator");
  loadingIndicator.classList.remove("hidden");
}

function hideLoadingIndicator() {
  const loadingIndicator = document.getElementById("loading-indicator");
  loadingIndicator.classList.add("hidden");
}

function hideDataTable() {
  const dataTable = document.getElementById("data-table");
  dataTable.classList.add("hidden");
}

function AddComma(num){ 
    while (/(\d+)(\d{3})/.test(num.toString())){
        num = num.toString().replace(/(\d+)(\d{3})/, '$1'+','+'$2');
    }
    return num;
}
function FormatBattleStats(number) {
    //number = 10000000000
    var localized = AddComma(number)
    var myArray = localized.split(",");
    if (myArray.length < 1) {
        return 'ERROR';
    }

    var toReturn = myArray[0];
    if (number < 1000) return number;
    if (parseInt(toReturn) < 10) {
        if (parseInt(myArray[1][0]) != 0) {
            toReturn += '.' + myArray[1][0];
        }
    }
    switch (myArray.length) {
        case 2:
            toReturn += "K";
            break;
        case 3:
            toReturn += "M";
            break;
        case 4:
            toReturn += "B";
            break;
        case 5:
            toReturn += "T";
            break;
        case 6:
            toReturn += "Q";
            break;
    }
    //Logger.log(toReturn)
    return toReturn;
}

function createAttackLink(id, status) {
  const isDisabled = status !== "Okay";
  const disabledClass = isDisabled ? "cursor-not-allowed opacity-30 hover:bg-white" : "hover:bg-gray-50";
  const onClick = isDisabled ? "event.preventDefault();" : "";

  return `<a target="_blank" href="https://www.torn.com/loader2.php?sid=getInAttack&user2ID=${id}" class="inline-flex items-center rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 ${disabledClass}" onclick="${onClick}">Attack</a>`;
}

function populateAPIKey() {
  const urlParams = new URLSearchParams(window.location.search);
  const apiKey = urlParams.get('apiKey');
  const statsFilter = urlParams.get('statsFilter'); //added
  if (apiKey) {
    document.getElementById("api-key").value = apiKey;
  }
  // Section Added
  if (statsFilter) {
    document.getElementById("filter-input").value = statsFilter;
  }
}

function createCard(row, status, attackLink) {
  return `
    <div class="card mb-4 border border-gray-200 p-4 rounded-lg shadow-sm">
      <div class="text-sm sm:hidden">
        <div class="font-medium text-gray-900 dark:text-gray-300">
          <a href="https://www.torn.com/profiles.php?XID=${row.id}" target="_blank">
            ${row.name}
            <span class="ml-1 text-blue-600">[${row.id}]</span>
          </a>
        </div>
        <div class="mt-1 flex flex-col text-gray-500 dark:text-gray-300">
          <span>Level: ${row.lvl}</span>
          <span class="bsp-total">BSP Total: ${AddComma(row.BSP_total)} - (${FormatBattleStats(row.BSP_total)})</span>
          <span class="total">Total: ${row.total}</span>
          <span>Status: ${row.status}</span>
        </div>
        <div class="mt-2 text-sm text-center">
          ${attackLink}
        </div>
      </div>
    </div>
  `;
}

function createTableRow(row, status, attackLink, index) {
  const isNotFirst = index > 0;
  const borderClass = isNotFirst ? 'border-t border-gray-200' : '';

  return `
    <tr>
      <td class="relative py-4 pl-4 pr-3 text-sm sm:pl-6 min-w-0 ${borderClass}">
        <div class="font-medium text-gray-900 dark:text-gray-300">
            <a href="https://www.torn.com/profiles.php?XID=${row.id}" target="_blank">
              ${row.name}
              <span class="ml-1 text-blue-600">[${row.id}]</span>
            </a>
        </div>
        <div class="mt-1 flex flex-col text-gray-500 dark:text-gray-300 sm:block lg:hidden">
            <span>Level: ${row.lvl}</span>
            <span>Total: ${AddComma(row.BSP_total)} - (${FormatBattleStats(row.BSP_total)})</span>
        </div>
      </td>
      <td class="hidden px-3 py-3.5 text-sm text-gray-500 dark:text-gray-300 lg:table-cell min-w-0 ${borderClass}">${row.lvl}</td>
      <td class="hidden px-3 py-3.5 text-sm text-gray-500 dark:text-gray-300 lg:table-cell min-w-0 ${borderClass}">${AddComma(row.BSP_total)} - (${FormatBattleStats(row.BSP_total)})</td>
      <td class="hidden px-3 py-3.5 text-sm text-gray-500 dark:text-gray-300 lg:table-cell min-w-0 ${borderClass}">${row.str}</td>
      <td class="hidden px-3 py-3.5 text-sm text-gray-500 dark:text-gray-300 lg:table-cell min-w-0 ${borderClass}">${row.def}</td>
      <td class="hidden px-3 py-3.5 text-sm text-gray-500 dark:text-gray-300 lg:table-cell min-w-0 ${borderClass}">${row.spd}</td>
      <td class="hidden px-3 py-3.5 text-sm text-gray-500 dark:text-gray-300 lg:table-cell min-w-0 ${borderClass}">${row.dex}</td>
      <td class="hidden px-3 py-3.5 text-sm text-gray-500 dark:text-gray-300 lg:table-cell min-w-0 ${borderClass}">${row.status}</td>
      <td class="relative py-3.5 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 min-w-0 ${borderClass}">
        ${attackLink}
      </td>
    </tr>
  `;
}

// Function to render the appropriate layout based on screen size
function renderLayout(rowsData) {
  const tableBody = document.getElementById('table-body');
  tableBody.innerHTML = '';

  // Remove any existing cards container if necessary
  const oldCardsContainer = document.getElementById('cards-container');
  if (oldCardsContainer) {
    oldCardsContainer.remove();
  }

  const isSmallScreen = window.matchMedia('(max-width: 640px)').matches;

  if (isSmallScreen) {
    const cardsContainer = document.createElement('div');
    cardsContainer.id = 'cards-container';
    document.getElementById('data-table').prepend(cardsContainer);

    rowsData.forEach((row, index) => {
      console.log('Card row data:', row); // ADD THIS LINE
      const status = formatStatus(row.status); // Using formatStatus function
      const attackLink = createAttackLink(row.id, row.status); // Using createAttackLink function
      cardsContainer.innerHTML += createCard(row, status, attackLink);
    });
  } else {
    rowsData.forEach((row, index) => {
      console.log('Table row data:', row); // ADD THIS LINE
      const status = formatStatus(row.status); // Using formatStatus function
      const attackLink = createAttackLink(row.id, row.status); // Using createAttackLink function
      tableBody.innerHTML += createTableRow(row, status, attackLink, index);
    });
  }
}



document.addEventListener("DOMContentLoaded", () => {
  populateAPIKey();
  loadListNames();
});
//BALDR
