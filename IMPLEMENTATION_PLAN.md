app/
Landing Page
Demo Interface
Role Switching
Repair Workflow
Case Management
Resident
 → Report

Reviewer
 → Verify

Operator
 → Assign Repair

Rechecker
 → Validate Repair
 lib/
 Case Management

Workflow State Logic

Priority Logic

Route Availability Logic

Database Access
SQLite (Local)

Supabase PostgreSQL (Production)
test/
Concurrent Writes

Role Permissions

Session Isolation

Demo Reset
Resident Report
        ↓
Reviewer Verification
        ↓
Operator Assignment
        ↓
Repair Evidence
        ↓
Recheck
        ↓
Route Restored
Clinic Route

320m
↓
Blocked

Alternative:
590m
Route Availability
Route Restoration
Accessibility Demonstration
GIS Storage
Interactive Maps
Geospatial Queries
Live Routing
app/
app/demo
app/page
dashboard views
report views
operator views
lib/
Route Impact Logic
Location Processing
Repair Impact Calculations
supabase/migrations/
lib/maps/
Coordinate Processing
Map Data Processing
GeoJSON Management
lib/routing/Accessible Routing
Alternative Routes
Distance Calculations
lib/analytics/spatial/Route Impact
Coverage Analysis
Affected Areas
app/maps/

components/map/Map Rendering
Route Display
Issue Display
Heatmaps
id
latitude
longitude
address
region
id
type
coordinates
status
id
start_node
end_node
accessibility_rating
id
status
impact_score
id
status
impact_score
Base street data
Geocoding
Reverse Geocoding
Accessibility Routing
Alternate Route Generation
Report
→ Lat/Lng
Issue Markers
Status Layers
Nodes
Edges
Connections
Blocked Route Detection
Restored Route Detection
Distance Calculations
GeoJSON Validation
Coordinate Validation
Report → Map

Repair → Route Update
Create Issue
Verify
Repair
Validate
Map Updates

Citizen Uploads Evidence
        ↓
Reviewer Verifies
app/Reviewer UI
Verification Workflow
lib/lib/ai/vision/
Image Analysis
Object Detection
Classification
lib/ai/severity/
Risk Assessment
Priority Inputs
lib/ai/duplicates/
Similarity Analysis
Grouping Reports
report_id
prediction
confidence
severity
model_version
report_id
objects_detected
analysis_time
report_id
similar_report_id
confidence
Image Classification
Blocked Ramp
Broken Ramp
Broken Sidewalk
Construction Barrier
Flooding
Vehicle Obstruction
Debris
Missing Tactile Paving

Issue Type
Confidence
Low
Medium
High
Critical
Potential Existing Case
Suggested Decision
Accuracy
Precision
Recall

AI Result
vs
Reviewer Result
Night
Rain
Low Quality
Blur
Different Angles
Verification
↓
Repair Queue
↓
Repair
Operator Dashboard
lib/
Priority Calculations
lib/impact/lib/prioritization/
lib/recommendations/lib/simulation/
report_id
routes_restored
users_affected
destinations_restored
report_id
priority_score
reasoning
updated_at
destination
weight
Hospital
Clinic
School
Transit Stop
Accessibility Impact

Severity

Destination Importance

Users Affected

Repair Cost

Verification Confidence
Routes Restored
Benefit vs Effort
Daily Repair Order
Hospital Route
>
Park Route
>Large Incident Sets
>Why it received that priority.
>Coordinates
Location Storage
Map Layer
>Markers
Status Layers
Filters
>Nodes
Edges
Routing
>Route Restoration Metrics
>Image Processing
Vision Integration
>Classification
Severity
Duplicates
>Impact Scoring
Repair Ranking
>Heatmaps
Queues
Analytics
>
>Resident
      ↓
GPS + Photo Report
      ↓
AI Obstruction Analysis
      ↓
Reviewer Verification
      ↓
Accessibility Network Engine
      ↓
Impact Calculation
      ↓
Priority Engine
      ↓
Repair Assignment
      ↓
Repair Validation
      ↓
Route Restoration
      ↓
Real-Time Accessibility Dashboard











