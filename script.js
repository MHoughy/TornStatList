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
  if (!apiKey) {
    alert("Please enter an API key");
    return;
  }

  const selectedList = document.getElementById("list-select").value;
  if (!selectedList) return;

  const fetchButton = document.getElementById("fetch-button");
  fetchButton.disabled = true;
  startCountdown();

  showLoadingIndicator();
  hideDataTable();

  try {
    // Load your local JSON list
    const response = await fetch("data.json");
    const data = await response.json();
    const tableData = data[selectedList];

    if (!tableData || tableData.length === 0) {
      displayNoDataMessage();
      hideLoadingIndicator();
      return;
    }

    // Fetch ALL faction members in ONE call
    const factionUrl = `https://api.torn.com/v2/faction/33097/members?striptags=true&key=${apiKey}`;
    const factionResponse = await fetch(factionUrl);
    const factionData = await factionResponse.json();

    const members = factionData.members || [];
    console.log("Faction API members:", members);
    console.log("Raw API member statuses:", members.map(m => ({
      id: m.id,
      status: m.status
    })));
      
    // Merge your table rows with faction member data
    const merged = tableData.map(row => {
      const member = members.find(m => m.id === Number(row.id));
      console.log("Merged row:", {
        id: row.id,
        incomingStatus: member?.status,
        storedStatus: member ? member.status : { state: "Unknown" }
      });
      
      return {
        ...row,
        status: member ? member.status : { state: "Unknown" },
        level: member ? member.level : row.level,
        name: member ? member.name : row.name
      };
    });
    

    // Sorting logic (unchanged)
    const sortedUsers = merged.sort((a, b) => {
      const aBSP = parseFloat(a.BSP_total) || 0;
      const bBSP = parseFloat(b.BSP_total) || 0;

      const aFF = parseFloat(a.ff_bse) || 0;
      const bFF = parseFloat(b.ff_bse) || 0;

      if (aBSP !== bBSP) return bBSP - aBSP;
      return bFF - aFF;
    });

    // Render UI
    renderLayout(sortedUsers);

    hideNoDataMessage();
    displayDataTable();

    clearInterval(statusUpdateInterval);
    statusUpdateInterval = setInterval(updateStatus, 1000);

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
  return parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
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
  } else if (formattedStatus === "Abroad" || formattedStatus === "Traveling") {
    formattedStatus = status.description || formattedStatus;
  }

  return formattedStatus;
}

function updateStatus() {
  const rows = document.querySelectorAll("#table-body tr");

  rows.forEach((row) => {
    const statusCell = row.querySelector("td:nth-child(4)"); 
    if (!statusCell) return;

    const currentStatus = statusCell.textContent.trim();
    const remaining = parseHospitalTime(currentStatus);
    if (remaining === Infinity) return;

    const updatedRemaining = remaining - 1;

    if (updatedRemaining <= 0) {
      statusCell.textContent = "Okay";

      const userId = row.querySelector("a[href*='XID']").textContent.match(/\[(\d+)\]/)[1];
      const attackLinkCell = row.querySelector("td:nth-child(5)"); 
      attackLinkCell.innerHTML = createAttackLink(userId, "Okay");
    } else {
      const minutes = Math.floor(updatedRemaining / 60);
      const seconds = updatedRemaining % 60;
      statusCell.textContent = `Hospitalized (${minutes}m ${seconds}s)`;
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


function AddComma(num) {
  return Number(num).toLocaleString();
}

function FormatBattleStats(number) {
  if (!number) return 0;
  number = parseFloat(number);

  if (number >= 1e12) return (number / 1e12).toFixed(1) + "T";
  if (number >= 1e9) return (number / 1e9).toFixed(1) + "B";
  if (number >= 1e6) return (number / 1e6).toFixed(1) + "M";
  if (number >= 1e3) return (number / 1e3).toFixed(1) + "K";

  return number;
}

function createAttackLink(id, status) {
  const isDisabled = status !== "Okay";
  const disabledClass = isDisabled ? "cursor-not-allowed opacity-30 hover:bg-white" : "hover:bg-gray-50";
  const onClick = isDisabled ? "event.preventDefault();" : "";

  return `<a target="_blank"
    href="https://www.torn.com/loader2.php?sid=getInAttack&user2ID=${id}"
    class="inline-flex items-center rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 ${disabledClass}"
    onclick="${onClick}">Attack</a>`;
}

function populateAPIKey() {
  const urlParams = new URLSearchParams(window.location.search);
  const apiKey = urlParams.get('apiKey');
  const statsFilter = urlParams.get('statsFilter'); //added
  if (apiKey) {
    document.getElementById("api-key").value = apiKey;
  }
  // Section Added
  if (statFilter) {
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
          <span class="bsp-total">FF Total: ${AddComma(row.ff_bse)} - (${FormatBattleStats(row.ff_bse)})</span>
          <span>Status: ${status}</span>
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
            ${row.name} <span class="ml-1 text-blue-600">[${row.id}]</span>
          </a>
        </div>
      </td>
      <td class="hidden px-3 py-3.5 text-sm text-gray-900 dark:text-gray-300 lg:table-cell min-w-0 ${borderClass}">${row.lvl}</td>
      <td class="hidden px-3 py-3.5 text-sm text-gray-900 dark:text-gray-300 lg:table-cell min-w-0 ${borderClass}">${AddComma(row.BSP_total)} - (${FormatBattleStats(row.BSP_total)})</td>
      <td class="hidden px-3 py-3.5 text-sm text-gray-900 dark:text-gray-300 lg:table-cell min-w-0 ${borderClass}">${row.BSP_prediction_date}</td>
      <td class="hidden px-3 py-3.5 text-sm text-gray-900 dark:text-gray-300 lg:table-cell min-w-0 ${borderClass}">${AddComma(row.ff_bse)} - (${FormatBattleStats(row.ff_bse)})</td>
      <td class="hidden px-3 py-3.5 text-sm text-gray-900 dark:text-gray-300 lg:table-cell min-w-0 ${borderClass}">${row.ff_updated}</td>
      <td class="hidden px-3 py-3.5 text-sm text-gray-900 dark:text-gray-300 lg:table-cell min-w-0 ${borderClass}">
      ${status}
    </td>    
      <td class="relative py-3.5 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 min-w-0 ${borderClass}">${attackLink}</td>
    </tr>
  `;
}

// Function to render the appropriate layout based on screen size
function renderLayout(rowsData) {
  const tableBody = document.getElementById('table-body');
  tableBody.innerHTML = '';

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
      const statusText = formatStatus(row.status);
      const attackLink = createAttackLink(row.id, statusText);

      cardsContainer.innerHTML += createCard(row, statusText, attackLink);
    });

  } else {
    rowsData.forEach((row, index) => {
      const statusText = formatStatus(row.status);
      const attackLink = createAttackLink(row.id, statusText);

      tableBody.innerHTML += createTableRow(row, statusText, attackLink, index);
    });
  }
}


document.addEventListener("DOMContentLoaded", () => {
  loadListNames();
});
