# Hypr Settings TUI

A terminal-based display editor for managing monitor configurations in Hyprland.

## Features

- Visual display of monitor layout
- Edit monitor properties:
  - Resolution
  - Position
  - Refresh rate
  - Enable/disable monitors
- Set primary monitor
- Add/remove monitors
- Generate Hyprland configuration

## Usage

### Running the application

```bash
deno run main.ts
```

Or use the predefined task:

```bash
deno task dev
```

### Controls

- **↑/↓** - Select monitor
- **Tab** - Cycle through properties
- **Enter** - Edit selected property
- **P** - Set selected monitor as primary
- **N** - Add new monitor
- **Delete** - Remove selected monitor
- **Esc/Q** - Exit the application

When editing a property:
- **↑/↓/←/→** - Adjust values
- **Enter/Esc** - Finish editing

## Development

### Running tests

```bash
deno test
```

### Project Structure

- `main.ts` - Main application code
- `main_test.ts` - Tests for the application
- `deno.json` - Deno configuration

## Future Improvements

- Load real monitor data from system
- Save configuration to Hyprland config files
- Support for additional monitor properties
- Add keyboard shortcuts for common operations
