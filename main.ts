import Hyprland, { Monitor } from "./Hyprland.ts";

// Mock data for monitors
const monitors: Monitor[] = Hyprland.getMockData();

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
  } else if (monitor.isPrimary) {
    setColor(32); // Green for primary monitor
  } else {
    setColor(37); // White for normal monitors
  }
  
  // Draw top border
  setCursor(x, y);
  write("┌" + "─".repeat(width - 2) + "┐");
  
  // Draw sides and content - monitor name
  setCursor(x, y + 1);
  const nameText = monitor.isPrimary ? `*${monitor.name}` : monitor.name;
  write("│" + nameText.padEnd(width - 2, ' ') + "│");
  
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
    } else if (monitor.isPrimary) {
      setColor(32); // Green for primary
    }
    
    // Format with consistent spacing and more info
    const primaryMarker = monitor.isPrimary ? "*" : " ";
    const statusText = !monitor.disabled ? "On " : "Off";
    const nameText = monitor.name.padEnd(10, ' ');
    
    write(`${primaryMarker} ${nameText} [${statusText}] ${monitor.width}x${monitor.height}`);
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
  
  // Properties
  const properties = [
    { name: "Resolution", value: `${monitor.width}x${monitor.height}`, key: "resolution" },
    { name: "Position", value: `X:${monitor.x} Y:${monitor.y}`, key: "position" },
    { name: "Refresh Rate", value: `${monitor.refreshRate} Hz`, key: "refreshRate" },
    { name: "Enabled", value: !monitor.disabled ? "Yes" : "No", key: "enabled" },
    { name: "Primary", value: monitor.isPrimary ? "Yes" : "No" },
  ];
  
  properties.forEach((prop, index) => {
    setCursor(startX, startY + index * 2);
    
    // Highlight if this property is selected
    if (selectedProperty === prop.key) {
      setColor(30, 47); // Black on white
    }
    
    // Format property values with consistent width
    const propName = prop.name.padEnd(14, ' ');
    write(`${propName}: ${isEditing && selectedProperty === prop.key ? ">" : ""} ${prop.value} ${isEditing && selectedProperty === prop.key ? "<" : ""}`);
    resetColor();
  });
  
  // Instructions
  setCursor(startX, startY + 12);
  write("Press TAB to select property");
  setCursor(startX, startY + 13);
  write("Press ENTER to edit selected property");
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
  
  // Get enabled monitors and find primary
  const enabledMonitors = monitors.filter(m => !m.disabled);
  // const primaryMonitor = enabledMonitors.find(m => m.isPrimary);
  
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
      
      // Draw connector lines to show relative positioning
      // if (primaryMonitor && monitor.id !== primaryMonitor.id) {
      //   const primaryX = offsetX + Math.round((primaryMonitor.x - minX) * scale);
      //   const primaryY = Math.round(offsetY + Math.round((primaryMonitor.y - minY) * scale) / 2);
        
      //   // Calculate midpoints and draw indicators
      //   setColor(90); // Dim gray
        
      //   // Draw lines based on relative positions
      //   if (monitor.x > primaryMonitor.x) {
      //     // Monitor is to the right of primary
      //     setCursor(primaryX + 10, primaryY + 1);
      //     // write("────→");
      //   } else if (monitor.x < primaryMonitor.x) {
      //     // Monitor is to the left of primary
      //     setCursor(x + 10, primaryY + 1);
      //     // write("←────");
      //   } else if (monitor.y > primaryMonitor.y) {
      //     // Monitor is below primary
      //     for (let i = 0; i < 2; i++) {
      //       setCursor(primaryX + 5, primaryY + 3 + i);
      //       write("│");
      //     }
      //     setCursor(primaryX + 5, primaryY + 5);
      //     write("↓");
      //   } else {
      //     // Monitor is above primary
      //     for (let i = 0; i < 2; i++) {
      //       setCursor(primaryX + 5, y + 3 + i);
      //       write("│");
      //     }
      //     setCursor(primaryX + 5, y + 3);
      //     write("↑");
      //   }
      //   resetColor();
      // }
      
      drawMonitorVisual(monitor, x, y, monitor.id === monitors[selectedMonitorIndex].id);
    });
}

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
    case "resolution":
      if (key === "ArrowUp") {
        monitor.height += 10;
      } else if (key === "ArrowDown" && monitor.height > 10) {
        monitor.height -= 10;
      } else if (key === "ArrowRight") {
        monitor.width += 10;
      } else if (key === "ArrowLeft" && monitor.width > 10) {
        monitor.width -= 10;
      }
      break;
      
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
      
    case "refreshRate":
      if (key === "ArrowUp") {
        monitor.refreshRate += 1;
      } else if (key === "ArrowDown" && monitor.refreshRate > 1) {
        monitor.refreshRate -= 1;
      }
      break;
      
    case "enabled":
      if (key === " " || key === "ArrowRight" || key === "ArrowLeft") {
        monitor.disabled = !monitor.disabled;
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
      break;
      
    case "ArrowDown":
      selectedMonitorIndex = Math.min(monitors.length - 1, selectedMonitorIndex + 1);
      selectedProperty = null;
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
      }
      break;
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
  
  showCursor();
}

// Main application loop
async function main() {
  // Initialize raw mode
  Deno.stdin.setRaw(true);
  
  write("Starting Hypr Settings TUI...\n\n");
  
  try {
    // Initial render
    render();
    
    // Input loop
    const buffer = new Uint8Array(3);
    while (true) {
      const nread = await Deno.stdin.read(buffer);
      if (!nread) break;
      
      let key = "";
      
      // Parse key from buffer
      if (buffer[0] === 27) {
        // ESC sequence
        if (buffer[1] === 91) {
          switch (buffer[2]) {
            case 65: key = "ArrowUp"; break;
            case 66: key = "ArrowDown"; break;
            case 67: key = "ArrowRight"; break;
            case 68: key = "ArrowLeft"; break;
            default: key = "Escape";
          }
        } else {
          key = "Escape";
        }
      } else if (buffer[0] === 13) {
        key = "Enter";
      } else if (buffer[0] === 9) {
        key = "Tab";
      } else if (buffer[0] === 127) {
        key = "Backspace";
      } else if (buffer[0] === 32) {
        key = " ";
      } else if (buffer[0] === 112) {
        key = "p";
      } else if (buffer[0] === 110) {
        key = "n";
      } else if (buffer[0] === 100) {
        key = "Delete";
      } else {
        key = String.fromCharCode(buffer[0]);
      }
      
      if (key === "q" || key === "Escape" && !isEditing) {
        break;
      }
      
      handleNavInput(key);
      render();
    }
  } finally {
    // Restore terminal state
    Deno.stdin.setRaw(false);
    showCursor();
    resetColor();
    clearScreen();
    setCursor(1, 1);
    write("Hypr Settings TUI exited.\n");
    
    // Generate config file (mock for now)
    write("\nMonitor Configuration:\n");
    let data = "";
    data += "######################################################\n";
    data += "## DO NOT EDIT THIS FILE!                           ##\n";
    data += "## This file is automatically generated by Archion. ##\n";
    data += "######################################################\n";
    monitors.forEach(monitor => {
      if (!monitor.disabled) {
        data += `monitor = ${monitor.name}, ${monitor.width}x${monitor.height}@${monitor.refreshRate}, ${monitor.x}x${monitor.y}, ${monitor.scale.toPrecision(2)}\n`;
      }
    });
    write(data);
  }
}

if (import.meta.main) {
  main();
}
