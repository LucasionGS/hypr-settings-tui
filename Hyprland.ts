export default class Hyprland {
  private instanceId?: string;
  constructor(instanceId?: string | number) {
    this.instanceId = instanceId?.toString();
  }

  public static getMockData(): Monitor[] {
    return [
      {
        id: 1,
        name: "HDMI-A-1",
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
          "1366x768@60Hz",
          "1280x720@60Hz"
        ]
      },
      {
        id: 2,
        name: "DP-1",
        width: 2560,
        height: 1440,
        x: 1920,
        y: 0,
        refreshRate: 144,
        disabled: false,
        scale: 1.0,
        availableModes: [
          "2560x1440@144Hz",
          "2560x1440@120Hz",
          "2560x1440@60Hz",
          "1920x1080@144Hz",
          "1920x1080@120Hz",
          "1920x1080@60Hz"
        ]
      },
      {
        id: 3,
        name: "DP-2",
        width: 1920,
        height: 1080,
        x: 1920,
        y: 1080,
        refreshRate: 144,
        disabled: false,
        scale: 1.0,
        availableModes: [
          "1920x1080@144Hz",
          "1920x1080@120Hz",
          "1920x1080@60Hz",
          "1600x900@144Hz",
          "1600x900@60Hz"
        ]
      },
    ];
  }

  public getMonitors(): Promise<Monitor[]> {
    return new Deno.Command("hyprctl", {
      args: [
        ...(this.instanceId ? ["-i", this.instanceId] : []),
        "monitors",
        "all",
        "-j"
      ],
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

  public async hasInstance() {
    return (this.instanceId !== undefined && this.instanceId !== null) || await new Deno.Command("hyprctl", {
      args: ["monitors", "-j"]
    })
      .output()
      .then((output) => {
        return output.code === 0;
      }).catch(() => {
        return false;
      });
  }
}

// Monitor model
export interface Monitor {
  id: number;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  refreshRate: number;
  disabled: boolean;
  scale: number;
  availableModes: string[]
}