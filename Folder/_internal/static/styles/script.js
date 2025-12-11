// script.js

let selectedSlot = null;
let currentInventoryType = 'my_inventory'; // Default view
let myInventoryData = [];
let allItemsData = [];

// --- 1. Initial Data Fetching and Rendering ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Debugging: Page loaded. Starting data fetch for both inventories.");

    await Promise.all([
        fetchData('my_inventory'),
        fetchData('all_items')
    ]);

    console.log("Debugging: Both fetches complete. Data ready.");
    console.log("My Inventory Items:", myInventoryData.length);
    console.log("All Available Items:", allItemsData.length);

    // Render both inventories into their respective hidden/visible grids a single time
    renderInventory(document.getElementById('my-inventory-grid'), myInventoryData);
    renderInventory(document.getElementById('all-items-grid'), allItemsData);

    // Setup button listeners
    document.getElementById('show-my-inventory-btn').addEventListener('click', () => {
        switchInventoryView('my_inventory');
    });

    document.getElementById('show-all-items-btn').addEventListener('click', () => {
        switchInventoryView('all_items');
    });

    // Setup search listener
    document.getElementById('search-input').addEventListener('input', applySearchFilter);
});

// --- 2. Event Delegation for Slot Clicks ---
document.addEventListener('click', event => {
    const clickedSlot = event.target.closest('.slot');
    if (!clickedSlot) return;

    // --- Selection Styling ---
    document.querySelectorAll('.slot').forEach(s => s.classList.remove('selected-item'));
    clickedSlot.classList.add('selected-item');
    selectedSlot = clickedSlot;

    // --- Inventory Switching Logic ---
    const slotType = clickedSlot.dataset.slotType;
    const newInventoryType = (slotType === 'offer') ? 'my_inventory' : 'all_items';
    switchInventoryView(newInventoryType);
});

// --- 3. View Switching Function ---
function switchInventoryView(newType) {
    if (currentInventoryType === newType) return; // No change needed

    currentInventoryType = newType;
    console.log(`Switched inventory view to: ${currentInventoryType}`);

    const myInventoryGrid = document.getElementById('my-inventory-grid');
    const allItemsGrid = document.getElementById('all-items-grid');
    const showMyInventoryBtn = document.getElementById('show-my-inventory-btn');
    const showAllItemsBtn = document.getElementById('show-all-items-btn');

    if (newType === 'my_inventory') {
        myInventoryGrid.style.display = 'grid'; // Or 'flex', 'block' depending on CSS
        allItemsGrid.style.display = 'none';
        showMyInventoryBtn.classList.add('active');
        showAllItemsBtn.classList.remove('active');
    } else {
        myInventoryGrid.style.display = 'none';
        allItemsGrid.style.display = 'grid'; // Or 'flex', 'block' depending on CSS
        showMyInventoryBtn.classList.remove('active');
        showAllItemsBtn.classList.add('active');
    }
    
    // Apply search filter to the newly visible grid in case search term exists
    applySearchFilter();
}

// --- 4. Data Fetch Function ---
async function fetchData(type) {
    const endpoint = type === 'my_inventory' ? '/api/my_inventory' : '/api/all_items';
    try {
        const response = await fetch(endpoint);
        const data = await response.json();
        if (type === 'my_inventory') {
            myInventoryData = data;
        } else {
            allItemsData = data;
        }
    } catch (error) {
        console.error(`Error fetching data for ${type}:`, error);
    }
}


function applySearchFilter() {
    const query = document.getElementById('search-input').value.toLowerCase();
    
    // Determine which grid is currently active and get all its item cards
    const activeGridId = (currentInventoryType === 'my_inventory') ? 'my-inventory-grid' : 'all-items-grid';
    const activeGrid = document.getElementById(activeGridId);
    const itemCards = activeGrid.getElementsByClassName('item-card');

    // Loop through item cards in the active grid and hide/show based on search query
    for (const card of itemCards) {
        const itemName = card.querySelector('.name').textContent.toLowerCase();
        if (itemName.includes(query)) {
            card.style.display = ''; // Show matching items
        } else {
            card.style.display = 'none'; // Hide non-matching items
        }
    }
}

// --- 6. Initial Rendering Function ---

/**
 * Populates a grid container with item cards based on the provided data array.
 * @param {HTMLElement} gridContainer - The DOM element to append item cards to.
 * @param {Array<Object>} itemsData - An array of item objects to render.
 */
function renderInventory(gridContainer, itemsData) {
    // Clear any existing content from the grid before rendering new items
    gridContainer.innerHTML = '';

    itemsData.forEach(item => {
        // 1. Create the main wrapper for the item card
        const itemCard = document.createElement('div');
        itemCard.classList.add('item-card');

        // 2. Store item data on the element using data attributes.
        // This makes it easy to retrieve item details when the card is clicked.
        itemCard.dataset.assetId = item.assetId;
        itemCard.dataset.itemName = item.Name;
        itemCard.dataset.itemValue = item.Value;
        itemCard.dataset.itemRap = item.RAP;
        if (item.userAssetId) {
            // Include userAssetId only if it exists (distinguishes unique items in user inventory)
            itemCard.dataset.userAssetId = item.userAssetId;
        }

        // 3. Populate the card's inner HTML using the requested structure
        itemCard.innerHTML = `
            <img src="/ItemImages/${item.assetId}.webp" alt="${item.Name}">
            <div class="name">${item.Name}</div>
            <div class="rap">RAP: ${item.RAP}</div>
            <div class="value">Value: ${item.Value}</div>
        `;

        // 4. Append the newly created card to the grid container
        gridContainer.appendChild(itemCard);
    });
}


// --- 7. Slot Population and Total Calculation Functions ---
function fillSlot(slot, item) {
    // Prevent adding same unique item multiple times (for user inventory)
    if (item.userAssetId) {
        const existingSlot = document.querySelector(`.slot[data-user-asset-id="${item.userAssetId}"]`);
        if (existingSlot) {
            console.log("Item already added to a slot.");
            return; // Exit function if item already in a slot
        }
        slot.dataset.userAssetId = item.userAssetId;
    }

    slot.innerHTML = '';
    slot.dataset.itemId = item.assetId;
    slot.dataset.itemValue = item.Value;
    slot.dataset.itemRap = item.RAP;
    slot.classList.add('filled');

    const img = document.createElement('img');
    img.src = `/ItemImages/${item.assetId}.webp`;
    img.alt = item.Name;
    slot.appendChild(img);
    
    updateTotals();
}

function updateTotals() {
    let offerValue = 0;
    let offerRap = 0;
    let requestValue = 0;
    let requestRap = 0;

    document.querySelectorAll('.slot[data-slot-type="offer"]').forEach(slot => {
        if (slot.dataset.itemValue) {
            offerValue += parseFloat(slot.dataset.itemValue);
            offerRap += parseFloat(slot.dataset.itemRap);
        }
    });

    document.querySelectorAll('.slot[data-slot-type="request"]').forEach(slot => {
        if (slot.dataset.itemValue) {
            requestValue += parseFloat(slot.dataset.itemValue);
            requestRap += parseFloat(slot.dataset.itemRap);
        }
    });

    document.getElementById('offer-value-total').textContent = offerValue.toLocaleString();
    document.getElementById('offer-rap-total').textContent = offerRap.toLocaleString();
    document.getElementById('request-value-total').textContent = requestValue.toLocaleString();
    document.getElementById('request-rap-total').textContent = requestRap.toLocaleString();
}