# DMIRS Mining Data Access Request

## Contact Information

**To:** Department of Energy, Mines, Industry Regulation and Safety (DMIRS)
**Email:** info@dmirs.wa.gov.au
**Subject:** API Access Request for Mining Tenement Data - Indigenous Territory Research Project

---

## Project Overview

**Project Title:** Indigenous Australia Geospatial Mapping Platform

**Project Purpose:** 
We are developing a comprehensive geospatial web application that visualizes Aboriginal Australian territories alongside government data sources to support cultural preservation, land rights analysis, and informed decision-making by Indigenous communities, researchers, and policymakers.

**Research Context:**
This platform integrates authentic government datasets including Native Title determinations, RATSIB boundaries, and Indigenous language territories to provide an authoritative mapping resource for understanding the intersection of Indigenous rights and land use activities.

---

## Data Requirements

**Primary Dataset Needed:**
- Mining Tenements (DMIRS-003) - Current mining lease and exploration permit boundaries
- Real-time access to tenement status updates
- Spatial boundary data for overlay analysis with Aboriginal territories

**Technical Requirements:**
- WFS (Web Feature Service) endpoint access for live data integration
- GeoJSON format compatibility for web mapping applications
- API credentials for automated data retrieval
- Permission for spatial intersection analysis

**Specific Access Requested:**
1. **WFS Service Access:** https://public-services.slip.wa.gov.au/public/services/SLIP_Public_Services/Industry_and_Mining_WFS/MapServer/WFSServer
2. **SLIP API Credentials:** For programmatic access to mining tenement boundaries
3. **Download Permissions:** For DMIRS-003 dataset in GeoJSON/Shapefile formats
4. **Real-time Updates:** Notification system for tenement status changes

---

## Use Case and Benefits

**Primary Application:**
- Overlay mining tenement boundaries with Aboriginal territorial boundaries
- Identify potential conflicts between mining activities and Native Title areas
- Support consultation processes between mining companies and Indigenous communities
- Provide transparent access to land use information for affected communities

**Public Benefit:**
- Enhanced transparency in mining and Indigenous land overlap
- Support for Free, Prior, and Informed Consent (FPIC) processes
- Academic research into land use conflicts and resolution
- Policy development for sustainable resource extraction

**Technical Implementation:**
- Web-based mapping platform accessible to Indigenous communities
- Automated conflict detection between mining areas and cultural sites
- Real-time updates on tenement status changes
- Export capabilities for community consultation documents

---

## Data Handling and Compliance

**Data Security:**
- Secure API key storage using environment variables
- HTTPS-only data transmission
- No redistribution of raw government datasets
- Compliance with WA Government Open Data policies

**Attribution:**
- Full citation of DMIRS as data source
- Creative Commons licensing compliance where applicable
- Regular acknowledgment of government data providers
- Link-back to official DMIRS data portal

**Usage Limitations:**
- Non-commercial research and educational purposes
- No resale or commercial redistribution of government data
- Community consultation and policy research only
- Regular data refresh from official sources

---

## Technical Specifications

**Development Platform:** Node.js/TypeScript web application
**Mapping Technology:** Leaflet.js with WFS layer integration
**Data Processing:** Real-time spatial intersection analysis
**Hosting:** Replit cloud platform with PostgreSQL database
**Target Users:** Indigenous communities, researchers, policymakers

**API Integration Requirements:**
- CORS support for web application access
- JSON/GeoJSON response formats
- Standard WFS 2.0.0 protocol compliance
- Rate limiting accommodation for research purposes

---

## Contact Information

**Project Lead:** [Your Name]
**Organization:** [Your Organization/Institution]
**Email:** [Your Email]
**Phone:** [Your Phone]
**Website:** [Project URL if available]

**Technical Contact:** [Technical Lead if different]
**Email:** [Technical Email]

---

## Supporting Documentation

**Available Upon Request:**
- Detailed technical architecture documentation
- Data integration workflow specifications
- Community consultation methodology
- Academic research proposals utilizing this platform

**References:**
- National Native Title Tribunal integration
- Australian Institute of Aboriginal and Torres Strait Islander Studies partnerships
- Existing government data collaborations

---

## Request Summary

We respectfully request API access credentials and permissions to integrate DMIRS mining tenement data into our Indigenous territory mapping platform. This access will enable transparent visualization of mining activities in relation to Aboriginal lands, supporting both community awareness and informed policy development.

**Specific Deliverables Requested:**
1. WFS endpoint API credentials
2. SLIP platform developer access
3. DMIRS-003 dataset download permissions
4. Documentation for spatial data integration

We are committed to responsible data use, proper attribution, and supporting the public interest through enhanced transparency in land use information.

Thank you for considering our request. We look forward to your response and are available to provide additional information or clarification as needed.

---

**Submitted:** [Date]
**Follow-up Expected:** 10-15 business days