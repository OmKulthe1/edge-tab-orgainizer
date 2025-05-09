// Listen for installation event
chrome.runtime.onInstalled.addListener(() => {
  console.log('Edge Tab Organizer extension installed');
  
  // Initialize storage with default settings
  chrome.storage.sync.set({
    organizationMethod: 'topic',
    autoGroupTabs: true
  });
});

// Listen for keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === 'organize-tabs') {
    console.log('Keyboard shortcut triggered: organizing tabs');
    
    // Get the current organization method from storage
    chrome.storage.sync.get(['organizationMethod', 'autoGroupTabs'], (data) => {
      const method = data.organizationMethod || 'topic';
      
      // Perform tab organization
      organizeTabs(method)
        .then(result => {
          if (data.autoGroupTabs) {
            createTabGroups(result)
              .then(() => {
                // Show a simple notification or badge to indicate success
                chrome.action.setBadgeText({ text: '✓' });
                // Clear the badge after a short delay
                setTimeout(() => {
                  chrome.action.setBadgeText({ text: '' });
                }, 3000);
              })
              .catch(error => {
                console.error('Error creating tab groups:', error);
                // Show error indicator
                chrome.action.setBadgeText({ text: '!' });
                chrome.action.setBadgeBackgroundColor({ color: '#e74c3c' });
                // Clear the badge after a delay
                setTimeout(() => {
                  chrome.action.setBadgeText({ text: '' });
                }, 3000);
              });
          } else {
            // Show success indicator
            chrome.action.setBadgeText({ text: '✓' });
            // Clear the badge after a short delay
            setTimeout(() => {
              chrome.action.setBadgeText({ text: '' });
            }, 3000);
          }
        })
        .catch(error => {
          console.error('Error organizing tabs:', error);
          // Show error indicator
          chrome.action.setBadgeText({ text: '!' });
          chrome.action.setBadgeBackgroundColor({ color: '#e74c3c' });
          // Clear the badge after a delay
          setTimeout(() => {
            chrome.action.setBadgeText({ text: '' });
          }, 3000);
        });
    });
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'organizeTabs') {
    organizeTabs(request.method)
      .then(result => {
        // Check if auto-grouping is enabled
        chrome.storage.sync.get('autoGroupTabs', (data) => {
          if (data.autoGroupTabs) {
            createTabGroups(result)
              .then(() => {
                sendResponse({ success: true, groups: result, tabsGrouped: true });
              })
              .catch(error => {
                console.error('Error creating tab groups:', error);
                sendResponse({ success: true, groups: result, tabsGrouped: false, error: error.message });
              });
          } else {
            sendResponse({ success: true, groups: result });
          }
        });
      })
      .catch(error => {
        console.error('Error organizing tabs:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    // Return true to indicate we'll send a response asynchronously
    return true;
  } else if (request.action === 'toggleAutoGrouping') {
    chrome.storage.sync.set({ autoGroupTabs: request.enabled });
    sendResponse({ success: true });
    return false;
  }
});

// Function to create actual tab groups in the browser
async function createTabGroups(groups) {
  // First, get all current tab groups and remove them
  try {
    const currentGroups = await chrome.tabGroups.query({});
    for (const group of currentGroups) {
      await chrome.tabGroups.remove(group.id);
    }
  } catch (error) {
    console.warn('Could not remove existing groups:', error);
    // If removing groups fails, continue anyway
  }
  
  // Create a new tab group for each category
  for (const group of groups) {
    if (group.tabs.length === 0) continue;
    
    try {
      // Get tab IDs for this group
      const tabIds = group.tabs.map(tab => tab.id);
      
      // Create a group with the tabs
      const groupId = await chrome.tabs.group({ tabIds });
      
      // Update the group with a title and color
      await chrome.tabGroups.update(groupId, { 
        title: group.name,
        color: getColorForGroup(group.name)
      });
    } catch (error) {
      console.error(`Error creating group "${group.name}":`, error);
    }
  }
}

// Function to determine a color for a group based on its name
function getColorForGroup(groupName) {
  // Define colors available in chrome.tabGroups.ColorEnum
  const colors = ['blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange', 'grey'];
  
  // Simple hash function to consistently assign the same color to the same group name
  let hash = 0;
  for (let i = 0; i < groupName.length; i++) {
    hash = groupName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Get a color from the available colors
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
}

// Function to organize tabs using AI
async function organizeTabs(method = 'topic') {
  // Get all tabs from the current window
  const tabs = await chrome.tabs.query({ currentWindow: true });
  
  // Extract relevant information from tabs
  const tabData = tabs.map(tab => ({
    id: tab.id,
    title: tab.title,
    url: tab.url,
    favIconUrl: tab.favIconUrl
  }));
  
  // Use OpenAI API or another free AI API to organize tabs
  const groups = await organizeTabsWithAI(tabData, method);
  
  return groups;
}

// Function to call AI API to organize tabs
async function organizeTabsWithAI(tabData, method) {
  try {
    // We'll use the Hugging Face free inference API for tab organization
    const API_URL = 'https://api-inference.huggingface.co/models/facebook/bart-large-mnli';
    const API_KEY = ''; // You'll need to add your free API key here
    
    let prompt = '';
    
    if (method === 'topic') {
      // Prepare data for the AI to categorize tabs by topic
      const tabTitles = tabData.map(tab => tab.title).join('\n');
      prompt = `Categorize these browser tabs into 3-7 natural groups based on topics:\n${tabTitles}`;
    } else if (method === 'domain') {
      // For domain-based organization, we can do this without AI
      return organizeByDomain(tabData);
    } else if (method === 'priority') {
      // Prepare data for the AI to categorize tabs by priority
      const tabTitles = tabData.map(tab => tab.title).join('\n');
      prompt = `Categorize these browser tabs into 3 groups: High priority, Medium priority, and Low priority:\n${tabTitles}`;
    }
    
    // If no API key is set, use a simple fallback method
    if (!API_KEY) {
      console.warn('No AI API key set, using fallback organization method');
      if (method === 'topic') {
        return fallbackOrganizeByKeywords(tabData);
      } else if (method === 'priority') {
        return [
          { name: 'High Priority', tabs: tabData.slice(0, Math.floor(tabData.length / 3)) },
          { name: 'Medium Priority', tabs: tabData.slice(Math.floor(tabData.length / 3), Math.floor(tabData.length * 2 / 3)) },
          { name: 'Low Priority', tabs: tabData.slice(Math.floor(tabData.length * 2 / 3)) }
        ];
      }
    }
    
    // Call the Hugging Face API
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ inputs: prompt })
    });
    
    if (!response.ok) {
      throw new Error('Failed to get AI response');
    }
    
    const data = await response.json();
    
    // Process AI response and group tabs
    // This is a simplified version - in reality, you'd need to parse the AI's response
    // and map it to your tab groups
    const aiResponse = data[0].generated_text;
    
    // Parse AI response and map it to tab groups
    // This is a placeholder - you'd need to implement actual parsing based on the response format
    const groups = parseAIResponse(aiResponse, tabData);
    
    return groups;
  } catch (error) {
    console.error('Error using AI API:', error);
    
    // Fallback to simpler organization methods if AI fails
    if (method === 'topic') {
      return fallbackOrganizeByKeywords(tabData);
    } else if (method === 'domain') {
      return organizeByDomain(tabData);
    } else if (method === 'priority') {
      return [
        { name: 'High Priority', tabs: tabData.slice(0, Math.floor(tabData.length / 3)) },
        { name: 'Medium Priority', tabs: tabData.slice(Math.floor(tabData.length / 3), Math.floor(tabData.length * 2 / 3)) },
        { name: 'Low Priority', tabs: tabData.slice(Math.floor(tabData.length * 2 / 3)) }
      ];
    }
  }
}

// Function to organize tabs by domain (without AI)
function organizeByDomain(tabData) {
  const groups = {};
  
  tabData.forEach(tab => {
    try {
      const url = new URL(tab.url);
      const domain = url.hostname.replace('www.', '');
      
      if (!groups[domain]) {
        groups[domain] = { name: domain, tabs: [] };
      }
      
      groups[domain].tabs.push(tab);
    } catch (error) {
      // Handle invalid URLs
      if (!groups['Other']) {
        groups['Other'] = { name: 'Other', tabs: [] };
      }
      groups['Other'].tabs.push(tab);
    }
  });
  
  return Object.values(groups);
}

// Fallback function to organize tabs by keywords
function fallbackOrganizeByKeywords(tabData) {
  // Define some common categories and associated keywords
  const categories = {
    'Social Media': ['facebook', 'twitter', 'instagram', 'linkedin', 'social', 'tiktok', 'pinterest', 'reddit'],
    'Shopping': ['amazon', 'ebay', 'shop', 'buy', 'store', 'price', 'product', 'cart', 'checkout'],
    'News': ['news', 'article', 'blog', 'post', 'cnn', 'bbc', 'nyt', 'times', 'guardian'],
    'Development': ['github', 'stackoverflow', 'code', 'dev', 'api', 'programming', 'javascript', 'python', 'java'],
    'Video': ['youtube', 'vimeo', 'video', 'watch', 'netflix', 'hulu', 'stream', 'movie', 'show'],
    'Email': ['mail', 'gmail', 'outlook', 'hotmail', 'inbox', 'email'],
    'Productivity': ['docs', 'sheets', 'slides', 'office', 'calendar', 'meet', 'zoom', 'teams', 'chat', 'notion', 'trello']
  };
  
  const groups = {};
  
  // Initialize all categories with empty tab arrays
  Object.keys(categories).forEach(category => {
    groups[category] = { name: category, tabs: [] };
  });
  
  // Add "Other" category for uncategorized tabs
  groups['Other'] = { name: 'Other', tabs: [] };
  
  // Categorize each tab
  tabData.forEach(tab => {
    const title = tab.title.toLowerCase();
    const url = tab.url.toLowerCase();
    
    let assigned = false;
    
    for (const [category, keywords] of Object.entries(categories)) {
      for (const keyword of keywords) {
        if (title.includes(keyword) || url.includes(keyword)) {
          groups[category].tabs.push(tab);
          assigned = true;
          break;
        }
      }
      if (assigned) break;
    }
    
    if (!assigned) {
      groups['Other'].tabs.push(tab);
    }
  });
  
  // Filter out empty categories
  return Object.values(groups).filter(group => group.tabs.length > 0);
}

// Placeholder function to parse AI response
function parseAIResponse(aiResponse, tabData) {
  // This is a placeholder - you'd need to implement actual parsing based on the AI response format
  // For now, we'll return a simple categorization
  
  return [
    { name: 'Group 1', tabs: tabData.slice(0, Math.floor(tabData.length / 3)) },
    { name: 'Group 2', tabs: tabData.slice(Math.floor(tabData.length / 3), Math.floor(tabData.length * 2 / 3)) },
    { name: 'Group 3', tabs: tabData.slice(Math.floor(tabData.length * 2 / 3)) }
  ];
} 