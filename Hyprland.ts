export default class Hyprland {
  private monitorId: string;
  constructor(monitorId: string) {
    this.monitorId = monitorId;
  }

  public static getMockData(): Monitor[] {
    return [
      {
        id: 1,
        name: "HDMI-A-1",
        resolution: { width: 1920, height: 1080 },
        position: { x: 0, y: 0 },
        refreshRate: 60,
        isPrimary: true,
        isEnabled: true,
      },
      {
        id: 2,
        name: "DP-1",
        resolution: { width: 1920, height: 1080 },
        position: { x: 1920, y: 0 },
        refreshRate: 144,
        isPrimary: false,
        isEnabled: true,
      },
      {
        id: 3,
        name: "DP-2",
        resolution: { width: 1920, height: 1080 },
        position: { x: 1920, y: 1080 },
        refreshRate: 144,
        isPrimary: false,
        isEnabled: true,
      },
    ];
  }

  public getMonitors(): Promise<Monitor[]> {
    return new Deno.Command("hyprctl", {
      args: ["monitors", "-j"],
      stdout: "piped",
    })
      .output()
      .then((output) => {
        if (output.code === 0) {
          const monitors: Monitor[] = JSON.parse(new TextDecoder().decode(output.stdout));
          return monitors;
        } else {
          throw new Error(`Failed to get monitors: ${new TextDecoder().decode(output.stderr)}`);
        }
      })
      .catch((error) => {
        console.error("Error fetching monitors:", error);
        return [];
      });
  }
}

// Monitor model
export interface Monitor {
  id: number;
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