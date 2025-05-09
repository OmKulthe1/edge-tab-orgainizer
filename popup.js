document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  const organizeBtn = document.getElementById('organizeBtn');
  const organizationMethodBtn = document.getElementById('organizationMethod');
  const dropdownItems = document.querySelectorAll('.dropdown-content a');
  const statusDiv = document.getElementById('status');
  const tabGroupsDiv = document.getElementById('tabGroups');
  const autoGroupToggle = document.getElementById('autoGroupToggle');
  
  // Initialize with stored settings
  chrome.storage.sync.get(['organizationMethod', 'autoGroupTabs'], (data) => {
    if (data.organizationMethod) {
      updateOrganizationMethod(data.organizationMethod);
    }
    
    if (data.autoGroupTabs !== undefined) {
      autoGroupToggle.checked = data.autoGroupTabs;
    }
  });
  
  // Add event listener for organize button
  organizeBtn.addEventListener('click', () => {
    // Get current organization method
    chrome.storage.sync.get('organizationMethod', (data) => {
      const method = data.organizationMethod || 'topic';
      
      // Show loading status
      statusDiv.textContent = 'Organizing tabs...';
      tabGroupsDiv.innerHTML = '<div class="loading">Analyzing your tabs...</div>';
      
      // Send message to background script
      chrome.runtime.sendMessage(
        { action: 'organizeTabs', method },
        (response) => {
          if (response && response.success) {
            displayTabGroups(response.groups);
            
            if (response.tabsGrouped) {
              statusDiv.textContent = `Tabs organized and grouped by ${method}`;
            } else if (response.error) {
              statusDiv.textContent = `Tabs organized by ${method}, but grouping failed: ${response.error}`;
            } else {
              statusDiv.textContent = `Tabs organized by ${method}`;
            }
          } else {
            statusDiv.textContent = 'Failed to organize tabs';
            tabGroupsDiv.innerHTML = `<div class="error">Error: ${response ? response.error : 'Unknown error'}</div>`;
          }
        }
      );
    });
  });
  
  // Add event listeners for dropdown items
  dropdownItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const method = item.getAttribute('data-method');
      
      // Save selected method to storage
      chrome.storage.sync.set({ organizationMethod: method });
      
      // Update button text
      updateOrganizationMethod(method);
    });
  });
  
  // Add event listener for auto-group toggle
  autoGroupToggle.addEventListener('change', () => {
    const isEnabled = autoGroupToggle.checked;
    
    // Save setting to storage
    chrome.runtime.sendMessage(
      { action: 'toggleAutoGrouping', enabled: isEnabled },
      () => {
        statusDiv.textContent = isEnabled ? 
          'Tabs will be automatically grouped in the browser' : 
          'Tab groups will only be displayed in the extension';
      }
    );
  });
  
  // Function to update organization method button text
  function updateOrganizationMethod(method) {
    switch (method) {
      case 'topic':
        organizationMethodBtn.textContent = 'By Topic';
        break;
      case 'domain':
        organizationMethodBtn.textContent = 'By Domain';
        break;
      case 'priority':
        organizationMethodBtn.textContent = 'By Priority';
        break;
      default:
        organizationMethodBtn.textContent = 'Organization Method';
    }
  }
  
  // Function to display tab groups
  function displayTabGroups(groups) {
    // Clear previous groups
    tabGroupsDiv.innerHTML = '';
    
    if (!groups || groups.length === 0) {
      tabGroupsDiv.innerHTML = '<div class="no-groups">No tab groups found</div>';
      return;
    }
    
    // Create DOM elements for each group
    groups.forEach(group => {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'group';
      
      // Create group header
      const headerDiv = document.createElement('div');
      headerDiv.className = 'group-header';
      headerDiv.textContent = group.name;
      
      // Add tab count
      const countSpan = document.createElement('span');
      countSpan.className = 'tab-count';
      countSpan.textContent = `${group.tabs.length} ${group.tabs.length === 1 ? 'tab' : 'tabs'}`;
      headerDiv.appendChild(countSpan);
      
      // Create tabs container
      const tabsDiv = document.createElement('div');
      tabsDiv.className = 'group-tabs';
      
      // Add tabs to the group
      group.tabs.forEach(tab => {
        const tabDiv = document.createElement('div');
        tabDiv.className = 'tab-item';
        tabDiv.setAttribute('data-tab-id', tab.id);
        
        // Add favicon if available
        if (tab.favIconUrl) {
          const favicon = document.createElement('img');
          favicon.className = 'tab-favicon';
          favicon.src = tab.favIconUrl;
          favicon.onerror = () => {
            favicon.style.display = 'none';
          };
          tabDiv.appendChild(favicon);
        }
        
        // Add tab title
        const titleSpan = document.createElement('span');
        titleSpan.className = 'tab-title';
        titleSpan.textContent = tab.title;
        tabDiv.appendChild(titleSpan);
        
        // Add click event to navigate to tab
        tabDiv.addEventListener('click', () => {
          chrome.tabs.update(tab.id, { active: true });
        });
        
        tabsDiv.appendChild(tabDiv);
      });
      
      // Add expand/collapse functionality
      headerDiv.addEventListener('click', () => {
        if (tabsDiv.style.display === 'none') {
          tabsDiv.style.display = 'block';
        } else {
          tabsDiv.style.display = 'none';
        }
      });
      
      // Add elements to the group
      groupDiv.appendChild(headerDiv);
      groupDiv.appendChild(tabsDiv);
      
      // Add group to the container
      tabGroupsDiv.appendChild(groupDiv);
    });
  }
}); 