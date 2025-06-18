import { assertEquals } from "@std/assert";
import { Monitor } from "./Hyprland.ts";

// Helper function to create a test monitor
function createTestMonitor(overrides: Partial<Monitor> = {}): Monitor {
  return {
    id: 1,
    name: "Test Monitor",
    width: 1920,
    height: 1080,
    x: 0,
    y: 0,
    refreshRate: 60,
    disabled: false,
    scale: 1.0,
    availableModes: [
      "1920x1080@60Hz", 
      "1600x900@60Hz", 
      "1366x768@60Hz"
    ],
    ...overrides,
  };
}

Deno.test("Test monitor creation", () => {
  const monitor = createTestMonitor();
  assertEquals(monitor.id, 1);
  assertEquals(monitor.width, 1920);
  assertEquals(monitor.height, 1080);
  assertEquals(monitor.x, 0);
  assertEquals(monitor.y, 0);
  assertEquals(monitor.refreshRate, 60);
  assertEquals(monitor.disabled, false);
});

Deno.test("Test monitor with custom properties", () => {
  const monitor = createTestMonitor({
    id: 2,
    width: 2560,
    height: 1440,
    refreshRate: 144,
  });
  
  assertEquals(monitor.id, 2);
  assertEquals(monitor.width, 2560);
  assertEquals(monitor.height, 1440);
  assertEquals(monitor.refreshRate, 144);
  assertEquals(monitor.disabled, false); // Default value
});

Deno.test("Test array of monitors", () => {
  const monitors: Monitor[] = [
    createTestMonitor({ id: 1, name: "Primary" }),
    createTestMonitor({ id: 2, name: "Secondary" }),
  ];
  
  assertEquals(monitors.length, 2);
  assertEquals(monitors[0].name, "Primary");
  assertEquals(monitors[1].name, "Secondary");
});

// Test parsing of available modes
function parseAvailableModes(modes: string[]): { resolutions: string[], refreshRates: number[] } {
  // This is a copy of the function from main.ts for testing purposes
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

Deno.test("Test parseAvailableModes with valid modes", () => {
  const modes = [
    "1920x1080@60Hz",
    "1920x1080@144Hz",
    "2560x1440@60Hz",
    "2560x1440@144Hz"
  ];
  
  const result = parseAvailableModes(modes);
  
  assertEquals(result.resolutions.length, 2);
  assertEquals(result.refreshRates.length, 2);
  
  // Resolutions should be sorted by total pixels (descending)
  assertEquals(result.resolutions[0], "2560x1440");
  assertEquals(result.resolutions[1], "1920x1080");
  
  // Refresh rates should be sorted ascending
  assertEquals(result.refreshRates[0], 60);
  assertEquals(result.refreshRates[1], 144);
});

Deno.test("Test parseAvailableModes with empty array", () => {
  const result = parseAvailableModes([]);
  
  assertEquals(result.resolutions.length, 1);
  assertEquals(result.refreshRates.length, 1);
  assertEquals(result.resolutions[0], "1920x1080");
  assertEquals(result.refreshRates[0], 60);
});

Deno.test("Test parseAvailableModes with invalid modes", () => {
  const result = parseAvailableModes(["invalid", "format"]);
  
  assertEquals(result.resolutions.length, 1);
  assertEquals(result.refreshRates.length, 1);
  assertEquals(result.resolutions[0], "1920x1080");
  assertEquals(result.refreshRates[0], 60);
});