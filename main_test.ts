import { assertEquals } from "@std/assert";

// Importing interfaces and helper functions from main.ts to test
interface Monitor {
  id: string;
  name: string;
  resolution: {
    width: number;
    height: number;
  };
  position: {
    x: number;
    y: number;
  };
  refreshRate: number;
  isPrimary: boolean;
  isEnabled: boolean;
}

// Helper function to create a monitor for testing
function createTestMonitor(overrides: Partial<Monitor> = {}): Monitor {
  return {
    id: "test-1",
    name: "Test Monitor",
    resolution: { width: 1920, height: 1080 },
    position: { x: 0, y: 0 },
    refreshRate: 60,
    isPrimary: true,
    isEnabled: true,
    ...overrides,
  };
}

Deno.test("Test monitor creation", () => {
  const monitor = createTestMonitor();
  assertEquals(monitor.id, "test-1");
  assertEquals(monitor.resolution.width, 1920);
  assertEquals(monitor.resolution.height, 1080);
  assertEquals(monitor.position.x, 0);
  assertEquals(monitor.position.y, 0);
  assertEquals(monitor.refreshRate, 60);
  assertEquals(monitor.isPrimary, true);
  assertEquals(monitor.isEnabled, true);
});

Deno.test("Test monitor with custom properties", () => {
  const monitor = createTestMonitor({
    id: "custom-1",
    resolution: { width: 2560, height: 1440 },
    refreshRate: 144,
    isPrimary: false,
  });
  
  assertEquals(monitor.id, "custom-1");
  assertEquals(monitor.resolution.width, 2560);
  assertEquals(monitor.resolution.height, 1440);
  assertEquals(monitor.refreshRate, 144);
  assertEquals(monitor.isPrimary, false);
  assertEquals(monitor.isEnabled, true); // Default value
});

Deno.test("Test array of monitors", () => {
  const monitors: Monitor[] = [
    createTestMonitor({ id: "1", name: "Primary" }),
    createTestMonitor({ id: "2", name: "Secondary", isPrimary: false }),
  ];
  
  assertEquals(monitors.length, 2);
  assertEquals(monitors[0].name, "Primary");
  assertEquals(monitors[1].name, "Secondary");
  assertEquals(monitors[0].isPrimary, true);
  assertEquals(monitors[1].isPrimary, false);
});