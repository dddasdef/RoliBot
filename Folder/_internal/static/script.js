let selectedSlot = null;
let currentInventoryType = 'my_inventory';
let myInventoryData = [];
let allItemsData = [];
let myInventoryCurrentPage = 1;
let allItemsCurrentPage = 1;
const ITEMS_PER_PAGE = 50;

document.getElementById('filter-min-value').addEventListener('input', triggerRender);
document.getElementById('filter-max-value').addEventListener('input', triggerRender);
document.getElementById('filter-premium-copies').addEventListener('change', triggerRender);
document.getElementById('filter-demand').addEventListener('change', triggerRender);

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Debugging: Page loaded. Starting data fetch for both inventories.");

    await Promise.all([
        fetchData('my_inventory'),
        fetchData('all_items')
    ]);

    console.log("Debugging: Both fetches complete. Data ready.");
    triggerRender();
    
    updateTotals();

    document.getElementById('show-my-inventory-btn').addEventListener('click', () => {
        switchInventoryView('my_inventory');
    });

    document.getElementById('show-all-items-btn').addEventListener('click', () => {
        switchInventoryView('all_items');
    });

    document.getElementById('search-input').addEventListener('input', applySearchFilter);
    document.getElementById('prev-page-btn').addEventListener('click', changePage);
    document.getElementById('next-page-btn').addEventListener('click', changePage);
    document.getElementById('add-slot-btn').addEventListener('click', addTradeSlotRow);
});


document.addEventListener('input', (event) => {
    if (event.target.matches('.robux-offer-input, .robux-request-input, .amount-to-send-input')) {
        updateTotals();
    }
});

function clearSlot(slot) {
    slot.innerHTML = '';
    slot.classList.remove('filled');
    delete slot.dataset.itemId;
    delete slot.dataset.itemValue;
    delete slot.dataset.itemRap;
    delete slot.dataset.userAssetId;
    updateTotals();
}

document.getElementById('submit-trade').addEventListener('click', async () => {
    const allTradesData = collectAllTrades();
    if (allTradesData.length === 0) {
        alert("No items have been added to any trade.");
        return;
    }
    try {
        const response = await fetch('/TradeUI/api/save_trades', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(allTradesData),
        });
        const result = await response.json();
        if (response.ok) {
            alert('Trades saved successfully!');
            console.log(result.message);
        } else {
            throw new Error(result.message || 'Failed to save trades.');
        }
    } catch (error) {
        console.error('Error saving trades:', error);
        alert('An error occurred while saving trades.');
    }
});

function collectAllTrades() {
    const trades = [];
    document.querySelectorAll('.trade-row').forEach(row => {
        const offerItems = [];
        const requestItems = [];
        
        
        row.querySelectorAll('.offer-section .slot.filled').forEach(slot => {
            offerItems.push(slot.dataset.itemId);
        });
        row.querySelectorAll('.request-section .slot.filled').forEach(slot => {
            requestItems.push(slot.dataset.itemId);
        });

  
        const robuxOffer = parseInt(row.querySelector('.robux-offer-input').value) || 0;
        const robuxRequest = parseInt(row.querySelector('.robux-request-input').value) || 0;
        const amountToSend = parseInt(row.querySelector('.amount-to-send-input').value) || 100;

   
        if (offerItems.length > 0 || requestItems.length > 0 || robuxOffer > 0 || robuxRequest > 0) {
            trades.push({
                offer: offerItems,
                request: requestItems,
                robux_offer: robuxOffer,
                robux_request: robuxRequest,
                amount: amountToSend
            });
        }
    });
    return trades;
}

document.addEventListener('click', event => {
    const clickedSlot = event.target.closest('.slot');
    if (clickedSlot) {
        if (clickedSlot.classList.contains('filled')) {
            clearSlot(clickedSlot);
            if (selectedSlot === clickedSlot) {
                selectedSlot.classList.remove('selected-item');
                selectedSlot = null;
            }
            return;
        }
        document.querySelectorAll('.slot').forEach(s => s.classList.remove('selected-item'));
        clickedSlot.classList.add('selected-item');
        selectedSlot = clickedSlot;
        const slotType = clickedSlot.dataset.slotType;
        const newInventoryType = (slotType === 'offer') ? 'my_inventory' : 'all_items';
        switchInventoryView(newInventoryType);
        return;
    }
    const clickedItemCard = event.target.closest('.item-card');
    if (clickedItemCard) {
        if (!selectedSlot) {
            console.log("No destination slot selected.");
            return;
        }
        const itemData = {
            assetId: clickedItemCard.dataset.assetId,
            Name: clickedItemCard.dataset.itemName,
            Value: clickedItemCard.dataset.itemValue,
            RAP: clickedItemCard.dataset.itemRap,
            userAssetId: clickedItemCard.dataset.userAssetId
        };
        fillSlot(selectedSlot, itemData);
        selectedSlot.classList.remove('selected-item');
        selectedSlot = null;
    }
});

function switchInventoryView(newType) {
    if (currentInventoryType === newType) return;
    currentInventoryType = newType;
    const myInventoryGrid = document.getElementById('my-inventory-grid');
    const allItemsGrid = document.getElementById('all-items-grid');
    const showMyInventoryBtn = document.getElementById('show-my-inventory-btn');
    const showAllItemsBtn = document.getElementById('show-all-items-btn');
    const requestFilters = document.getElementById('request-filters');
    if (newType === 'my_inventory') {
        myInventoryGrid.style.display = 'grid';
        allItemsGrid.style.display = 'none';
        showMyInventoryBtn.classList.add('active');
        showAllItemsBtn.classList.remove('active');
        requestFilters.style.display = 'none';
    } else {
        myInventoryGrid.style.display = 'none';
        allItemsGrid.style.display = 'grid';
        showMyInventoryBtn.classList.remove('active');
        showAllItemsBtn.classList.add('active');
        requestFilters.style.display = 'flex';
    }
    triggerRender();
}

async function fetchData(type) {
    const endpoint = type === 'my_inventory' ? '/TradeUI/api/my_inventory' : '/TradeUI/api/all_items';
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
    if (currentInventoryType === 'my_inventory') {
        myInventoryCurrentPage = 1;
    } else {
        allItemsCurrentPage = 1;
    }
    triggerRender();
}

function triggerRender() {
    const query = document.getElementById('search-input').value.toLowerCase();
    let sourceData = (currentInventoryType === 'my_inventory') ? myInventoryData : allItemsData;
    const currentPage = (currentInventoryType === 'my_inventory') ? myInventoryCurrentPage : allItemsCurrentPage;
    const activeGrid = document.getElementById(currentInventoryType === 'my_inventory' ? 'my-inventory-grid' : 'all-items-grid');
    if (currentInventoryType === 'all_items') {
        const hideLowPremium = document.getElementById('filter-premium-copies').checked;
        const minDemand = parseInt(document.getElementById('filter-demand').value, 10);
        const minValue = parseFloat(document.getElementById('filter-min-value').value);
        const maxValue = parseFloat(document.getElementById('filter-max-value').value);
        sourceData = sourceData.filter(item => {
            if (hideLowPremium && item['Premium Copies'] !== undefined && item['Premium Copies'] < 350) {
                return false;
            }
            if (item.Demand !== undefined && item.Demand < minDemand) {
                return false;
            }
            if (!isNaN(minValue) && item.Value < minValue) {
                return false;
            }
            if (!isNaN(maxValue) && item.Value > maxValue) {
                return false;
            }
            return true;
        });
    }
    const filteredData = sourceData.filter(item =>
        item.Name && item.Name.toLowerCase().includes(query)
    );
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const itemsToRender = filteredData.slice(startIndex, endIndex);
    renderInventory(activeGrid, itemsToRender);
    updatePaginationControls(filteredData.length, currentPage);
}

function renderInventory(gridContainer, itemsToRender) {
    gridContainer.innerHTML = '';
    itemsToRender.forEach(item => {
        const itemCard = document.createElement('div');
        itemCard.classList.add('item-card');
        itemCard.dataset.assetId = item.assetId;
        itemCard.dataset.itemName = item.Name;
        itemCard.dataset.itemValue = item.Value;
        itemCard.dataset.itemRap = item.RAP;
        if (item.userAssetId) {
            itemCard.dataset.userAssetId = item.userAssetId;
        }
        itemCard.innerHTML = `
            <img src="/ItemImages/${item.assetId}.webp" alt="${item.Name}">
            <div class="name">${item.Name}</div>
            <div class="rap">RAP: ${item.RAP}</div>
            <div class="value">Value: ${item.Value}</div>
        `;
        gridContainer.appendChild(itemCard);
    });
}

function changePage(event) {
    const direction = event.target.id === 'next-page-btn' ? 1 : -1;
    if (currentInventoryType === 'my_inventory') {
        myInventoryCurrentPage += direction;
    } else {
        allItemsCurrentPage += direction;
    }
    triggerRender();
}

function updatePaginationControls(totalItems, currentPage) {
    const pageInfo = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    pageInfo.textContent = `Page ${currentPage} of ${totalPages > 0 ? totalPages : 1}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage >= totalPages;
}

function addTradeSlotRow() {
    const container = document.getElementById('trade-container');
    const lastRow = container.querySelector('.trade-row:last-of-type');
    if (!lastRow) {
        console.error("Could not find a .trade-row element to clone.");
        return;
    }
    const newRow = lastRow.cloneNode(true);
    
    // 1. Reset Offer Section
    const newOfferSection = newRow.querySelector('.offer-section');
    if (newOfferSection) {
        newOfferSection.querySelectorAll('.slot').forEach(slot => {
            slot.innerHTML = '';
            slot.classList.remove('filled', 'selected-item');
            delete slot.dataset.itemId;
            delete slot.dataset.itemValue;
            delete slot.dataset.itemRap;
            delete slot.dataset.userAssetId;
        });
        const offerValueDisplay = newOfferSection.querySelector('.offer-value-total');
        if (offerValueDisplay) offerValueDisplay.textContent = '0';
        const offerRapDisplay = newOfferSection.querySelector('.offer-rap-total');
        if (offerRapDisplay) offerRapDisplay.textContent = '0';
        
        // Reset Inputs
        const rOfferInput = newOfferSection.querySelector('.robux-offer-input');
        if (rOfferInput) rOfferInput.value = 0;
        
        const sendAmtInput = newOfferSection.querySelector('.amount-to-send-input');
        if (sendAmtInput) sendAmtInput.value = 100;
    }

    // 2. Reset Request Section
    const newRequestSection = newRow.querySelector('.request-section');
    if (newRequestSection) {
        newRequestSection.querySelectorAll('.slot').forEach(slot => {
            slot.innerHTML = '';
            slot.classList.remove('filled', 'selected-item');
            delete slot.dataset.itemId;
            delete slot.dataset.itemValue;
            delete slot.dataset.itemRap;
            delete slot.dataset.userAssetId;
        });
        const requestValueDisplay = newRequestSection.querySelector('.request-value-total');
        if (requestValueDisplay) requestValueDisplay.textContent = '0';
        const requestRapDisplay = newRequestSection.querySelector('.request-rap-total');
        if (requestRapDisplay) requestRapDisplay.textContent = '0';

        // Reset Request Input
        const rRequestInput = newRequestSection.querySelector('.robux-request-input');
        if (rRequestInput) rRequestInput.value = 0;
    }

    // 3. Reset Profit Displays
    newRow.querySelector('.profit-value').textContent = "0";
    newRow.querySelector('.profit-percent-value').textContent = "0%";
    newRow.querySelector('.profit-value').style.color = 'white';
    newRow.querySelector('.profit-percent-value').style.color = 'white';
    newRow.querySelector('.trade-warning').style.display = 'none';

    container.appendChild(newRow);
}

function fillSlot(slot, item) {
    if (item.userAssetId) {
        const tradeRow = slot.closest('.trade-row');
        const existingSlot = tradeRow.querySelector(`.slot[data-user-asset-id="${item.userAssetId}"]`);
        if (existingSlot) {
            console.log("Item is already in this specific trade.");
            return;
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
    document.querySelectorAll('.trade-row').forEach(row => {
        let itemOfferValue = 0;
        let itemOfferRap = 0;
        let itemRequestValue = 0;
        let itemRequestRap = 0;

        // Sum Offer Items
        row.querySelectorAll('.offer-section .slot[data-slot-type="offer"].filled').forEach(slot => {
            itemOfferValue += parseFloat(slot.dataset.itemValue) || 0;
            itemOfferRap += parseFloat(slot.dataset.itemRap) || 0;
        });

        // Sum Request Items
        const requestSlots = row.querySelectorAll('.request-section .slot[data-slot-type="request"].filled');
        requestSlots.forEach(slot => {
            itemRequestValue += parseFloat(slot.dataset.itemValue) || 0;
            itemRequestRap += parseFloat(slot.dataset.itemRap) || 0;
        });

        // Get Robux Inputs
        const robuxOffer = parseFloat(row.querySelector('.robux-offer-input').value) || 0;
        const robuxRequest = parseFloat(row.querySelector('.robux-request-input').value) || 0;


        
        const totalOfferValue = itemOfferValue + robuxOffer;
        const totalOfferRap = itemOfferRap; 

        const totalRequestValueRaw = itemRequestValue + robuxRequest; 
        const totalRequestRap = itemRequestRap;

        row.querySelector('.offer-value-total').textContent = totalOfferValue.toLocaleString();
        row.querySelector('.offer-rap-total').textContent = totalOfferRap.toLocaleString();
        row.querySelector('.request-value-total').textContent = totalRequestValueRaw.toLocaleString();
        row.querySelector('.request-rap-total').textContent = totalRequestRap.toLocaleString();

        // --- Profit Calculation with 30% Tax on Robux Request ---
        const effectiveRobuxRequest = robuxRequest * 0.7; // 30% reduction
        const totalRequestValueCalculated = itemRequestValue + effectiveRobuxRequest;

        const profit = totalRequestValueCalculated - totalOfferValue;
        const profitPercent = (totalOfferValue > 0) ? ((profit / totalOfferValue) * 100).toFixed(2) : 0;

        const profitValueEl = row.querySelector('.profit-value');
        const profitPercentEl = row.querySelector('.profit-percent-value');
        
        profitValueEl.textContent = Math.round(profit).toLocaleString();
        profitPercentEl.textContent = `${profitPercent}%`;

        if (profit > 0) {
            profitValueEl.style.color = 'lime';
            profitPercentEl.style.color = 'lime';
        } else if (profit < 0) {
            profitValueEl.style.color = 'red';
            profitPercentEl.style.color = 'red';
        } else {
            profitValueEl.style.color = 'white';
            profitPercentEl.style.color = 'white';
        }

        const warningEl = row.querySelector('.trade-warning');
        if (requestSlots.length >= 3) {
            warningEl.style.display = 'block';
        } else {
            warningEl.style.display = 'none';
        }
    });
}