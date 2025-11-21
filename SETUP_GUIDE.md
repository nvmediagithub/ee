# Energy Digital Twin - Complete Setup & Usage Guide

## 1. Project Overview

The Energy Digital Twin is a web-based simulation platform that combines procedural village generation with power grid modeling and real-time energy system simulation. Inspired by the Watabou Village Generator, it creates realistic village layouts and overlays them with power distribution networks.

### Key Features

- **Procedural Village Generation**: Creates realistic villages with roads, houses, fields, rivers, and bridges
- **Power Grid Modeling**: Automatically generates electrical distribution networks with power plants, transformers, poles, and consumer connections
- **Real-time Simulation**: Simulates power flow, load management, and grid dynamics
- **Interactive Controls**: Edit consumer properties, manage line status, trigger faults
- **Visual Feedback**: Color-coded grid overlay showing node status, line conditions, and power flows
- **WebSocket Integration**: Real-time updates and control (currently experimental)

### Application Purpose

This digital twin serves as an educational and development platform for:
- Understanding power distribution systems
- Testing grid management strategies
- Learning about energy systems modeling
- Developing smart grid algorithms
- Simulating fault conditions and recovery scenarios

## 2. Prerequisites

### System Requirements

- **Operating System**: macOS, Linux, or Windows
- **Python Version**: 3.8 or higher (tested with Python 3.9+)
- **Memory**: Minimum 2GB RAM
- **Storage**: 100MB free space
- **Network**: Local network access (for backend-frontend communication)

### Required Software

1. **Python 3.8+** with pip package manager
2. **Modern Web Browser**: Chrome, Firefox, Safari, or Edge
3. **Terminal/Command Prompt**: For running the backend server

### Python Dependencies

The application uses the following key packages:
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `pydantic` - Data validation and serialization
- Standard library modules for procedural generation

## 3. Installation Instructions

### Step 1: Download/Clone the Application

```bash
# Navigate to the project directory
cd /Users/user/Documents/Repositories/ee

# Verify all files are present
ls -la
```

You should see:
- `main.py` - Backend server
- `app/` - Frontend directory
- `server/` - Backend architecture
- `SETUP_GUIDE.md` - This guide

### Step 2: Set Up Python Environment

```bash
# Create virtual environment (recommended)
python3 -m venv energy_twin_env

# Activate virtual environment
# On macOS/Linux:
source energy_twin_env/bin/activate
# On Windows:
# energy_twin_env\Scripts\activate

# Install dependencies
pip install fastapi uvicorn pydantic
```

### Step 3: Verify Installation

```bash
# Test Python imports
python3 -c "
import fastapi
import uvicorn
print('Dependencies installed successfully')
"
```

## 4. Running the Application

### Starting the Backend Server

1. **Open a terminal** in the project directory
2. **Activate the virtual environment** (if using one)
3. **Run the FastAPI server**:

```bash
python main.py
```

Or alternatively:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Expected Output**:
```
INFO: Started server process [12345]
INFO: Waiting for application startup.
INFO: Application startup complete.
INFO: Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

### Accessing the Frontend

1. **Open your web browser**
2. **Navigate to the frontend file**:
   ```
   file:///Users/user/Documents/Repositories/ee/app/index.html
   ```
   
   Or if serving via HTTP:
   ```
   http://localhost:8000
   ```

3. **Verify the interface loads** - You should see:
   - Village canvas (900x900 pixels)
   - Control panel on the right
   - Seed input and generation buttons
   - Grid management controls

### Verifying Backend Connection

1. **Check API Health**: Open browser and visit:
   ```
   http://localhost:8000/docs
   ```
   You should see the FastAPI Swagger documentation

2. **Test Basic Endpoint**:
   ```bash
   curl http://localhost:8000/v1/power-grid/grids/123
   ```
   This should return a 404 error (expected for non-existent grid)

## 5. Usage Instructions

### Complete Workflow

#### Step 1: Generate a Village

1. **Adjust the seed** in the "Seed" input field (default: 834711)
2. **Click "Regenerate village"** to create a new layout with the current seed
3. **Click "Randomize seed"** to generate a completely new village
4. **Observe the village canvas** - you should see:
   - Procedural river with bridges
   - Major and minor roads
   - Houses positioned along roads
   - Agricultural fields
   - Tree clusters

#### Step 2: Create Power Grid

1. **Click "Create grid"** button
2. **Wait for grid generation** - status will show "creating grid..."
3. **Monitor grid creation** - status will change to "grid ready"
4. **Verify overlay** - power grid should appear as colored nodes and lines over the village

**Expected Grid Structure**:
- **Power Plant**: Yellow/white circle (source)
- **Transformer**: Blue circle (distribution point)
- **Poles**: Green circles (distribution points)
- **Consumer Houses**: Pink/red circles (loads)
- **Lines**: Colored connections between nodes

#### Step 3: Run Simulation

1. **Click "Sim tick"** button to advance simulation time
2. **Observe changes** in:
   - Simulation time counter
   - Line colors (indicating power flow)
   - Node status indicators

#### Step 4: Interactive Controls

##### Consumer Properties Editor

1. **Select a consumer** from the dropdown (houses only)
2. **Adjust properties**:
   - Base (kW): Change power consumption
   - cosφ: Adjust power factor (0.5-1.0)
3. **Click "Apply"** to update the grid
4. **Observe changes** in the grid visualization

##### Line Status Control

1. **Select a line** from the dropdown
2. **Choose status**:
   - Online: Normal operation
   - Open: Disconnected (dashed line)
   - Faulted: Failed (red line)
3. **Click "Set status"** to apply changes

#### Step 5: Fault Injection

1. **Click "Trigger fault"** to simulate a line fault
2. **Observe**:
   - Red line coloring for faulted lines
   - Impact on grid connectivity
3. **Click "Clear faults"** via API to restore (no GUI button currently)

### Advanced Usage

#### API Commands via Command Line

```bash
# Create a new grid
curl -X POST "http://localhost:8000/v1/power-grid/grids" \
     -H "Content-Type: application/json" \
     -d '{"seed": 123456}'

# Get grid snapshot
curl "http://localhost:8000/v1/power-grid/grids/{grid_id}"

# Simulate time advancement
curl -X POST "http://localhost:8000/v1/power-grid/grids/{grid_id}/simulate" \
     -H "Content-Type: application/json" \
     -d '{"time": 2.0}'

# Update consumer properties
curl -X POST "http://localhost:8000/v1/power-grid/grids/{grid_id}/command" \
     -H "Content-Type: application/json" \
     -d '{"action": "update_node_props", "payload": {"node_id": "node_id", "props": {"base_kw": 2.5, "cos_phi": 0.85}}}'

# Set line status
curl -X POST "http://localhost:8000/v1/power-grid/grids/{grid_id}/command" \
     -H "Content-Type: application/json" \
     -d '{"action": "set_line_status", "payload": {"line_id": "line_id", "status": "open"}}'

# Clear all faults
curl -X POST "http://localhost:8000/v1/power-grid/grids/{grid_id}/command" \
     -H "Content-Type: application/json" \
     -d '{"action": "clear_faults"}'
```

## 6. Known Issues

### Critical Issues (Must Fix Before Production)

1. **WebSocket Implementation Failure**
   - **Error**: HTTP 500 Internal Server Error
   - **Impact**: Real-time updates not functional
   - **Workaround**: Use manual refresh via API calls
   - **Status**: Active issue requiring backend fixes

2. **Missing power_flow_solver.py Module**
   - **Error**: Module import failures
   - **Impact**: Potential solver functionality issues
   - **Workaround**: Core functions work despite warnings
   - **Status**: Needs implementation completion

### Medium Priority Issues

3. **No Authentication/Authorization**
   - **Impact**: Security vulnerability
   - **Current Status**: No login or access control
   - **Recommendation**: Implement basic auth for production

4. **CORS Configuration Missing**
   - **Impact**: May limit cross-origin requests
   - **Workaround**: Serve frontend from same domain
   - **Status**: Needs configuration

5. **Console Warning Messages**
   - **Impact**: Backend reload loops on file changes
   - **Workaround**: Development environment only
   - **Status**: Development inconvenience

### Minor Issues

6. **Limited Error Handling**
   - **Impact**: Poor user experience on API failures
   - **Current Status**: Basic error responses only
   - **Recommendation**: Add user-friendly error messages

7. **No Loading Indicators**
   - **Impact**: Unclear when operations are processing
   - **Workaround**: Status text shows operation state
   - **Enhancement**: Could improve user experience

## 7. API Documentation

### Base Information

- **Base URL**: `http://localhost:8000`
- **API Version**: v1
- **Content-Type**: application/json
- **Authentication**: None (current)

### Endpoints

#### POST /v1/power-grid/grids

Create a new power grid from village geometry.

**Request Body**:
```json
{
  "seed": 123456,        // optional: integer seed
  "tags": ["tag1"]       // optional: list of tags
}
```

**Response**:
```json
{
  "id": "grid_id_string",
  "meta": {"sim_time": 0.0},
  "nodes": {
    "node_id": {
      "id": "node_id",
      "kind": "plant|tp|house|consumer|pole",
      "position": {"x": 0.0, "y": 0.0},
      "props": {"base_kw": 1.5, "cos_phi": 0.95},
      "status": "online|open|faulted"
    }
  },
  "lines": {
    "line_id": {
      "id": "line_id",
      "from_id": "source_node_id",
      "to_id": "target_node_id",
      "status": "online|open|faulted"
    }
  }
}
```

#### GET /v1/power-grid/grids/{grid_id}

Retrieve grid snapshot.

**Response**: Same as POST response

#### POST /v1/power-grid/grids/{grid_id}/simulate

Advance simulation time.

**Request Body**:
```json
{
  "time": 1.5  // simulation time to advance to
}
```

**Response**: Grid snapshot with updated simulation time

#### POST /v1/power-grid/grids/{grid_id}/command

Execute grid commands.

**Request Body**:
```json
{
  "action": "set_line_status|trigger_fault|clear_faults|update_node_props",
  "payload": {
    // action-specific parameters
  }
}
```

**Available Actions**:

1. **set_line_status**:
```json
{
  "line_id": "line_id",
  "status": "online|open|faulted"
}
```

2. **trigger_fault**:
```json
{
  "line_id": "line_id"  // optional, random if not specified
}
```

3. **clear_faults**:
```json
{}
```

4. **update_node_props**:
```json
{
  "node_id": "node_id",
  "props": {
    "base_kw": 2.5,      // base power in kW
    "cos_phi": 0.85      // power factor (0.5-1.0)
  }
}
```

### WebSocket Endpoint (Experimental)

**URL**: `ws://localhost:8000/v1/power-grid/grids/{grid_id}/ws`

**Status**: Currently non-functional due to HTTP 500 errors

**Purpose**: Real-time grid state updates and command processing

## 8. Troubleshooting

### Common Issues and Solutions

#### Backend Won't Start

**Problem**: `ModuleNotFoundError: No module named 'server'`

**Solutions**:
1. Ensure you're in the correct directory:
   ```bash
   cd /Users/user/Documents/Repositories/ee
   ```
2. Check Python path:
   ```bash
   python -c "import sys; print(sys.path)"
   ```
3. Set PYTHONPATH:
   ```bash
   export PYTHONPATH=/Users/user/Documents/Repositories/ee:$PYTHONPATH
   ```

#### Frontend Can't Connect to Backend

**Problem**: "create failed" status message

**Solutions**:
1. **Check backend is running**: Visit `http://localhost:8000/docs`
2. **Verify port**: Backend should be on port 8000
3. **Check CORS**: Ensure frontend is served from file:// or same domain
4. **Verify URL**: Backend URL field in frontend should be `http://localhost:8000`

#### Grid Creation Hangs

**Problem**: Status stuck on "creating grid..."

**Solutions**:
1. **Wait longer**: Grid generation can take 5-10 seconds
2. **Check backend logs**: Look for error messages in terminal
3. **Refresh frontend**: Reload the page and try again
4. **Clear browser cache**: Hard refresh (Ctrl+F5 or Cmd+Shift+R)

#### WebSocket Connection Fails

**Problem**: "WS unavailable" or connection errors

**Solutions**:
1. **This is expected**: WebSocket is currently broken
2. **Use manual refresh**: Click simulation buttons instead
3. **Check browser console**: Look for WebSocket errors
4. **Future fix**: Requires backend WebSocket implementation fixes

#### Village Generation Issues

**Problem**: Blank or malformed village

**Solutions**:
1. **Try different seed**: Use "Randomize seed" button
2. **Check JavaScript console**: Look for errors in browser dev tools
3. **Refresh page**: Hard reload the frontend
4. **Verify canvas support**: Ensure browser supports HTML5 Canvas

#### Grid Visualization Missing

**Problem**: No power grid overlay on village

**Solutions**:
1. **Create grid first**: Click "Create grid" button
2. **Wait for completion**: Status should show "grid ready"
3. **Check grid data**: Grid ID should show a value, not "—"
4. **Verify backend**: Check `/v1/power-grid/grids/{grid_id}` endpoint

### Debug Mode

Enable detailed logging:

```bash
# Start with debug logging
uvicorn main:app --host 0.0.0.0 --port 8000 --reload --log-level debug
```

### Browser Developer Tools

1. **Open Developer Tools**: F12 or Right-click → Inspect
2. **Check Console tab**: Look for JavaScript errors
3. **Monitor Network tab**: Verify API calls and responses
4. **Test endpoints**: Use fetch API or curl commands

### Backend Logs

Monitor server output for:
- Import errors
- API request/response logging
- WebSocket connection attempts
- Simulation execution messages

## 9. Technical Architecture

### System Overview

```
┌─────────────────┐    HTTP/WS    ┌─────────────────┐
│   Frontend      │◄──────────────│   Backend       │
│   (HTML/JS)     │               │   (FastAPI)     │
│                 │               │                 │
│ • Canvas Viz    │               │ • Domain Layer  │
│ • Controls      │               │ • Use Cases     │
│ • State Mgmt    │               │ • Repositories  │
└─────────────────┘               └─────────────────┘
                                          │
                                          ▼
                                   ┌─────────────────┐
                                   │   Domain        │
                                   │   (Power Grid)  │
                                   │                 │
                                   │ • Entities      │
                                   │ • Services      │
                                   │ • Calculations  │
                                   └─────────────────┘
```

### Architecture Layers

#### Frontend (Presentation Layer)
- **Technology**: Vanilla HTML5, CSS3, JavaScript ES6+
- **Canvas Rendering**: Custom village generator and grid overlay
- **State Management**: Local state with API synchronization
- **Controls**: Interactive UI for grid manipulation

#### Backend (API Layer)
- **Framework**: FastAPI with ASGI
- **Routing**: RESTful API endpoints
- **WebSocket**: Real-time communication (experimental)
- **Serialization**: JSON with Pydantic models

#### Domain Layer (Business Logic)
- **Context**: Power grid domain with DDD principles
- **Entities**: Source, Transformer, Pole, Consumer, Line
- **Services**: Load profiles, power flow solving
- **Use Cases**: Grid generation, simulation, command execution

#### Infrastructure Layer
- **Repository**: In-memory grid storage (replaceable)
- **ID Generation**: Unique identifier creation
- **External Interfaces**: Future database or messaging integration

### Key Design Patterns

1. **Clean Architecture**: Separation of concerns with clear boundaries
2. **Domain-Driven Design**: Rich domain models with business logic
3. **Repository Pattern**: Data access abstraction
4. **Command Pattern**: Grid operations as executable commands
5. **Observer Pattern**: Grid state change notifications

### Data Flow

1. **Village Generation**: Seed → Procedural algorithms → Canvas rendering
2. **Grid Creation**: Village data → Grid builder → Power network entities
3. **Simulation**: Time advancement → Power flow calculation → State updates
4. **Commands**: User interaction → API calls → Domain execution → Visual feedback

### Future Enhancements

1. **Complete WebSocket Implementation**: Real-time bidirectional updates
2. **Advanced Physics**: Reactive power, three-phase systems, fault analysis
3. **Database Integration**: Persistent storage and history
4. **Multi-user Support**: Collaborative grid management
5. **Plugin Architecture**: Extensible simulation capabilities
6. **Performance Optimization**: Larger grid handling and faster rendering

## Conclusion

The Energy Digital Twin provides a solid foundation for power grid simulation and education. While the application has some current limitations (primarily WebSocket functionality), the core features work reliably and provide valuable insights into power distribution systems.

For questions, issues, or contributions, refer to the project's documentation or submit feedback through appropriate channels.

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-21  
**Application Version**: Power Grid Twin v0.1.0  
**Compatibility**: Python 3.8+, Modern browsers, FastAPI 0.68+