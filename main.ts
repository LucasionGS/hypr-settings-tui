import { CONFIG_DIR, CONFIG_FILE } from "./config.ts";
import Hyprland, { Monitor } from "./Hyprland.ts";

// Mock data for monitors
// const monitors: Monitor[] = Hyprland.getMockData();
const hypr = new Hyprland();
const monitors: Monitor[] = await hypr.getMonitors();

// UI state
let selectedMonitorIndex = 0;
let selectedProperty: "resolution" | "position" | "refreshRate" | "enabled" | null = null;
let isEditing = false;

// Convert string to Uint8Array for raw output
function encodeString(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Terminal UI utilities that don't add newlines
const clearScreen = () => Deno.stdout.writeSync(encodeString("\x1b[2J\x1b[H"));
const setCursor = (x: number, y: number) => Deno.stdout.writeSync(encodeString(`\x1b[${y};${x}H`));
const setColor = (fg: number, bg: number = 49) => Deno.stdout.writeSync(encodeString(`\x1b[${fg};${bg}m`));
const resetColor = () => Deno.stdout.writeSync(encodeString("\x1b[0m"));
const hideCursor = () => Deno.stdout.writeSync(encodeString("\x1b[?25l"));
const showCursor = () => Deno.stdout.writeSync(encodeString("\x1b[?25h"));

// Write text without newline (used throughout the code)
const write = (text: string) => Deno.stdout.writeSync(encodeString(text));

// Draw box with title
function drawBox(x: number, y: number, width: number, height: number, title?: string) {
  // Top border with title
  setCursor(x, y);
  const titleStr = title ? ` ${title} ` : "";
  const remainingWidth = width - titleStr.length - 2;
  write("┌" + titleStr + "─".repeat(remainingWidth) + "┐");

  // Side borders
  for (let i = 1; i < height - 1; i++) {
    setCursor(x, y + i);
    write("│" + " ".repeat(width - 2) + "│");
  }

  // Bottom border
  setCursor(x, y + height - 1);
  write("└" + "─".repeat(width - 2) + "┘");
}

// Draw monitor visual representation
function drawMonitorVisual(monitor: Monitor, x: number, y: number, isSelected: boolean) {
  // Use a small scale to fit in terminal but preserve aspect ratio
  const scale = 0.005 * (monitor.id === 2 ? 0.5 : 1); // Small scale factor
  
  // Calculate dimensions while preserving aspect ratio
  const rawWidth = Math.round(monitor.width * scale);
  const rawHeight = Math.round(monitor.height * scale);
  
  // Ensure monitors have at least minimum dimensions
  const width = Math.max(13, rawWidth - 2);
  const height = Math.max(4, rawHeight);
  
  // Draw border with different color if selected
  if (isSelected) {
    setColor(33, 44); // Bright yellow on blue
  } else if (monitor.disabled) {
    setColor(90); // Dim gray for disabled monitors
  } else {
    setColor(37); // White for normal monitors
  }
  
  // Draw top border
  setCursor(x, y);
  write("┌" + "─".repeat(width - 2) + "┐");
  
  // Draw sides and content - monitor name
  setCursor(x, y + 1);
  write("│" + monitor.name.padEnd(width - 2, ' ') + "│");
  
  // Draw resolution on second line
  setCursor(x, y + 2);
  const resText = `${monitor.width}x${monitor.height}`;
  write("│" + resText.padEnd(width - 2, ' ') + "│");
  
  // Add refresh rate info on third line
  setCursor(x, y + 3);
  const refreshText = `${monitor.refreshRate}Hz`;
  write("│" + refreshText.padEnd(width - 2, ' ') + "│");
  
  // Draw empty space in the middle
  for (let i = 4; i < height - 1; i++) {
    setCursor(x, y + i);
    write("│" + " ".repeat(width - 2) + "│");
  }
  
  // Draw bottom
  setCursor(x, y + height - 1);
  write("└" + "─".repeat(width - 2) + "┘");
  
  // Reset color
  resetColor();
}

// Render the monitor list
function renderMonitorList() {
  const startX = 3;
  const startY = 3;
  
  drawBox(1, 1, 32, monitors.length + 4, "Monitors");
  
  monitors.forEach((monitor, index) => {
    setCursor(startX, startY + index);
    
    // Different display for selected monitor
    if (index === selectedMonitorIndex) {
      setColor(30, 47); // Black on white for selected
    } else if (monitor.disabled) {
      setColor(90); // Dim gray for disabled
    }
    
    // Format with consistent spacing and more info
    const statusText = !monitor.disabled ? "On " : "Off";
    const nameText = monitor.name.padEnd(10, ' ');
    
    write(`  ${nameText} [${statusText}] ${monitor.width}x${monitor.height}`);
    resetColor();
  });
}

// Render monitor details
function renderMonitorDetails() {
  const monitor = monitors[selectedMonitorIndex];
  const startX = 35;
  const startY = 3;
  
  // Create a wider box for monitor details
  drawBox(33, 1, 50, 16, `Monitor: ${monitor.name}`);
  
  // Parse available modes
  const { resolutions, refreshRates } = parseAvailableModes(monitor.availableModes);
  
  // Properties
  const properties = [
    { 
      name: "Resolution", 
      value: `${monitor.width}x${monitor.height}`, 
      key: "resolution",
      options: resolutions.length > 0 ? `(${currentResolutionIndex + 1}/${resolutions.length})` : ""
    },
    { name: "Position", value: `X:${monitor.x} Y:${monitor.y}`, key: "position" },
    { 
      name: "Refresh Rate", 
      value: `${monitor.refreshRate} Hz`, 
      key: "refreshRate",
      options: refreshRates.length > 0 ? `(${currentRefreshRateIndex + 1}/${refreshRates.length})` : ""
    },
    { name: "Enabled", value: !monitor.disabled ? "Yes" : "No", key: "enabled" },
  ];
  
  properties.forEach((prop, index) => {
    setCursor(startX, startY + index * 2);
    
    // Highlight if this property is selected
    if (selectedProperty === prop.key) {
      setColor(30, 47); // Black on white
    }
    
    // Format property values with consistent width
    const propName = prop.name.padEnd(14, ' ');
    let displayValue = prop.value;
    
    // Add edit indicators and options info
    if (isEditing && selectedProperty === prop.key) {
      // Different display for editing mode
      setColor(33, 44); // Yellow on blue for active editing
      displayValue = `< ${displayValue} >`;
    }
    
    // Add options info for resolution and refresh rate
    if (prop.options) {
      displayValue += ` ${prop.options}`;
    }
    
    write(`${propName}: ${displayValue}`);
    resetColor();
  });
  
  // Instructions
  setCursor(startX, startY + 11);
  write("Press TAB to select property");
  setCursor(startX, startY + 12);
  write("Press ENTER to edit selected property");
  setCursor(startX, startY + 13);
  write("Press p to set as primary monitor");
  setCursor(startX, startY + 14);
  write("Press ESC to exit");
}

// Render monitor layout visual
function renderMonitorLayout() {
  const startX = 33;
  const startY = 20; // Moved down to separate from monitor details
  const boxWidth = 50;
  const boxHeight = 15; // Increased height for better visualization
  
  drawBox(startX - 2, startY - 2, boxWidth + 4, boxHeight + 4, "Layout");
  
  // Find the bounds of all monitors
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  monitors.forEach(monitor => {
    if (monitor.disabled) return;
    
    minX = Math.min(minX, monitor.x);
    minY = Math.min(minY, monitor.y);
    maxX = Math.max(maxX, monitor.x + monitor.width);
    maxY = Math.max(maxY, monitor.y + monitor.height);
  });
  
  // If no monitors are enabled, set defaults
  if (minX === Infinity) {
    minX = 0;
    minY = 0;
    maxX = 1000;
    maxY = 1000;
  }
  
  // Calculate scale to fit in the box
  const scaleX = boxWidth / (maxX - minX || 1); // Avoid division by zero
  const scaleY = boxHeight / (maxY - minY || 1); // Avoid division by zero
  
  // Use the smaller scale to maintain aspect ratio but limit it to a reasonable size
  const scale = Math.min(scaleX, scaleY) * 1; // Slightly reduced scale for better spacing
  
  // Draw position indicators (X/Y axis)
  setCursor(startX, startY + boxHeight + 1);
  write("Position: (0,0) is top-left");
  
  // Center the display in the box
  const offsetX = startX + Math.round((boxWidth - (maxX - minX) * scale) / 2);
  const offsetY = startY + Math.round((boxHeight - (maxY - minY) * scale) / 2);
  
  // Get enabled monitors
  const enabledMonitors = monitors.filter(m => !m.disabled);
  
  // Draw each monitor - sort by position so the layout is clearer
  enabledMonitors
    .sort((a, b) => {
      // Sort by Y position first, then X
      if (a.y !== b.y) {
        return a.y - b.y;
      }
      return a.x - b.x;
    })
    .forEach((monitor) => {
      const x = offsetX + Math.round((monitor.x - minX) * scale);
      const y = offsetY + Math.round(Math.round((monitor.y - minY) * scale) / 2);
      
      drawMonitorVisual(monitor, x, y, monitor.id === monitors[selectedMonitorIndex].id);
    });
}

// Parse available modes into resolution and refresh rate options
function parseAvailableModes(modes: string[]): { resolutions: string[], refreshRates: number[] } {
  const resolutions = new Set<string>();
  const refreshRates = new Set<number>();
  
  // Handle empty modes array
  if (!modes || modes.length === 0) {
    return {
      resolutions: ["1920x1080"],  // Default fallback resolution
      refreshRates: [60]          // Default fallback refresh rate
    };
  }
  
  modes.forEach(mode => {
    // Mode format is typically "widthxheight@refreshRateHz"
    const match = mode.match(/(\d+)x(\d+)@(\d+)Hz/);
    if (match) {
      const width = parseInt(match[1]);
      const height = parseInt(match[2]);
      const rate = parseInt(match[3]);
      
      resolutions.add(`${width}x${height}`);
      refreshRates.add(rate);
    }
  });
  
  // If no valid modes were parsed, add default fallbacks
  if (resolutions.size === 0) resolutions.add("1920x1080");
  if (refreshRates.size === 0) refreshRates.add(60);
  
  return {
    // Sort resolutions by total pixels (descending)
    resolutions: Array.from(resolutions).sort((a, b) => {
      const [aWidth, aHeight] = a.split("x").map(Number);
      const [bWidth, bHeight] = b.split("x").map(Number);
      return (bWidth * bHeight) - (aWidth * aHeight);
    }),
    // Sort refresh rates in ascending order
    refreshRates: Array.from(refreshRates).sort((a, b) => a - b)
  };
}

// Current selection index for resolution and refresh rate
let currentResolutionIndex = 0;
let currentRefreshRateIndex = 0;

// Handle user input for editing monitor properties
function handleEditInput(key: string) {
  const monitor = monitors[selectedMonitorIndex];
  
  if (!selectedProperty) return;
  
  if (key === "Escape") {
    isEditing = false;
    return;
  }
  
  if (key === "Enter") {
    isEditing = false;
    return;
  }
  
  switch (selectedProperty) {
    case "resolution": {
      // Parse available modes
      const { resolutions } = parseAvailableModes(monitor.availableModes);
      
      if (resolutions.length === 0) break;
      
      if (key === "ArrowUp" || key === "ArrowRight") {
        // Move to next resolution
        currentResolutionIndex = (currentResolutionIndex + 1) % resolutions.length;
      } else if (key === "ArrowDown" || key === "ArrowLeft") {
        // Move to previous resolution
        currentResolutionIndex = (currentResolutionIndex - 1 + resolutions.length) % resolutions.length;
      }
      
      // Update monitor resolution
      const newRes = resolutions[currentResolutionIndex];
      const [width, height] = newRes.split("x").map(Number);
      monitor.width = width;
      monitor.height = height;
      break;
    }
      
    case "position":
      if (key === "ArrowUp") {
        monitor.y -= 10;
      } else if (key === "ArrowDown") {
        monitor.y += 10;
      } else if (key === "ArrowRight") {
        monitor.x += 10;
      } else if (key === "ArrowLeft") {
        monitor.x -= 10;
      }
      break;
      
    case "refreshRate": {
      // Parse available modes
      const { refreshRates } = parseAvailableModes(monitor.availableModes);
      
      if (refreshRates.length === 0) break;
      
      if (key === "ArrowUp" || key === "ArrowRight") {
        // Move to next refresh rate
        currentRefreshRateIndex = (currentRefreshRateIndex + 1) % refreshRates.length;
      } else if (key === "ArrowDown" || key === "ArrowLeft") {
        // Move to previous refresh rate
        currentRefreshRateIndex = (currentRefreshRateIndex - 1 + refreshRates.length) % refreshRates.length;
      }
      
      // Update monitor refresh rate
      monitor.refreshRate = refreshRates[currentRefreshRateIndex];
      break;
    }
      
    case "enabled":
      if (key === " " || key === "ArrowRight" || key === "ArrowLeft") {
        monitor.disabled = !monitor.disabled;
        
        // If enabling a previously disabled monitor, ensure it has a valid position
        if (!monitor.disabled && (monitor.x === 0 && monitor.y === 0)) {
          // Find the rightmost monitor
          let maxX = 0;
          monitors.forEach(m => {
            if (!m.disabled && m.id !== monitor.id) {
              maxX = Math.max(maxX, m.x + m.width);
            }
          });
          
          // Position the newly enabled monitor to the right of the existing monitors
          if (maxX > 0) {
            monitor.x = maxX;
          }
        }
      }
      break;
  }
}

// Handle general navigation input
function handleNavInput(key: string) {
  if (isEditing) {
    handleEditInput(key);
    return;
  }
  
  switch (key) {
    case "ArrowUp":
      selectedMonitorIndex = Math.max(0, selectedMonitorIndex - 1);
      selectedProperty = null;
      // Reset selection indices when changing monitors
      updateSelectionIndices();
      break;
      
    case "ArrowDown":
      selectedMonitorIndex = Math.min(monitors.length - 1, selectedMonitorIndex + 1);
      selectedProperty = null;
      // Reset selection indices when changing monitors
      updateSelectionIndices();
      break;
      
    case "Tab": {
      // Cycle through properties
      const properties = ["resolution", "position", "refreshRate", "enabled"];
      const currentIndex = properties.indexOf(selectedProperty as string);
      const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % properties.length;
      selectedProperty = properties[nextIndex] as "resolution" | "position" | "refreshRate" | "enabled";
      break;
    }
      
    case "Enter":
      if (selectedProperty) {
        isEditing = true;
        // Update selection indices when entering edit mode
        updateSelectionIndices();
      }
      break;
  }
}

// Update selection indices based on current monitor
function updateSelectionIndices() {
  const monitor = monitors[selectedMonitorIndex];
  
  if (monitor) {
    // Update resolution index
    const { resolutions, refreshRates } = parseAvailableModes(monitor.availableModes);
    
    // Find current resolution in the list
    const currentRes = `${monitor.width}x${monitor.height}`;
    currentResolutionIndex = resolutions.indexOf(currentRes);
    if (currentResolutionIndex === -1) currentResolutionIndex = 0;
    
    // Find current refresh rate in the list
    currentRefreshRateIndex = refreshRates.indexOf(monitor.refreshRate);
    if (currentRefreshRateIndex === -1) currentRefreshRateIndex = 0;
  }
}

// Main render function
function render() {
  clearScreen();
  hideCursor();
  
  renderMonitorList();
  renderMonitorDetails();
  renderMonitorLayout();
  
  // Show help text at bottom - ensure it's below all other UI elements
  const helpY = 40; // Positioned well below the layout box
  setCursor(1, helpY);
  write("Controls: ↑/↓ - Select monitor | Tab - Select property | Enter - Edit");
  setCursor(1, helpY + 1);
  write("When editing: ↑/↓/←/→ - Adjust values | Enter/Esc - Done");
  setCursor(1, helpY + 2);
  write("q/Esc - Exit");
}

// Main application loop
async function main() {
  // Initialize raw mode
  Deno.stdin.setRaw(true);
  
  write("Starting Hypr Settings TUI...\n\n");
  
  try {
    // Initialize selection indices
    updateSelectionIndices();
    
    // Initial render
    render();
    
    // Input loop
    const buffer = new Uint8Array(3);
    while (true) {
      const nread = await Deno.stdin.read(buffer);
      if (!nread) break;
      
      let key = "";
      
      // Parse key from buffer
      if (nread === 3) {
        // Special keys (Arrow keys, etc.)
        if (buffer[0] === 27 && buffer[1] === 91) {
          // ESC [
          switch (buffer[2]) {
            case 65: key = "ArrowUp"; break;    // Up
            case 66: key = "ArrowDown"; break; // Down
            case 67: key = "ArrowRight"; break; // Right
            case 68: key = "ArrowLeft"; break;  // Left
            case 51: key = "Delete"; break;    // Delete (mapped from 3~)
            // Add other special keys if needed
          }
        }
      } else if (nread === 1) {
        // Regular keys
        switch (buffer[0]) {
          case 9: key = "Tab"; break;         // Tab key
          case 13: key = "Enter"; break;      // Enter key
          case 27: key = "Escape"; break;     // Escape key
          case 32: key = " "; break;          // Space key
          case 127: key = "Backspace"; break; // Backspace key
          default:
            // Convert other keys to characters
            if (buffer[0] >= 32 && buffer[0] <= 126) { // Printable ASCII
              key = String.fromCharCode(buffer[0]);
            }
            break;
        }
      }
      
      // Handle special cases for quit
      if (key === "q" || (key === "Escape" && !isEditing)) {
        break;
      }
      
      // Handle input
      if (key) {
        handleNavInput(key);
        render();
      }
    }
  } catch (error) {
    console.error("Error in main loop:", error);
  } finally {
    // Cleanup: reset terminal settings
    Deno.stdin.setRaw(false);
    setColor(37, 40); // Reset to normal colors
    resetColor();
    showCursor();
    setCursor(1, 1);
    
    // Clear the screen before exiting
    clearScreen();
    // Generate Hyprland config output
    write("Hypr Settings TUI exited.\n\n");
    write("Monitor Configuration:\n");
    let data = "";
    data += "######################################################\n";
    data += "## Monitor configuration file for Hyprland          ##\n";
    data += "######################################################\n";
    monitors.forEach(monitor => {
      if (!monitor.disabled) {
        data += `monitor = ${monitor.name}, ${monitor.width}x${monitor.height}@${monitor.refreshRate}, ${monitor.x}x${monitor.y}, ${monitor.scale.toPrecision(2)}\n`;
      } else {
        data += `monitor = ${monitor.name}, disabled\n`;
      }
    });
    write(data);

    // Write to config file
    try {
      Deno.mkdirSync(CONFIG_DIR, { recursive: true });
      const configFile = Deno.openSync(CONFIG_FILE, { write: true, create: true });
      configFile.writeSync(encodeString(data));
      configFile.close();
      write("\nConfiguration saved to monitors.conf\n");
    } catch (error) {
      console.error("Error saving configuration:", error);
    }
  }
}

// Start the application
main();
