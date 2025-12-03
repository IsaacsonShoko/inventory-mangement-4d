# Xlink Inventory Management System
## Pilot Implementation Plan

**Client:** [Client Name]
**Prepared By:** 4D Analytics (Pty) Ltd
**Document Version:** 1.0
**Date:** December 2025

---

## Pilot Overview

**Objective:** Deploy and validate the Xlink Inventory Management System in a production environment over a 3-week period

**Scope:** Main warehouse operations with core user group (10-15 users)

**Success Criteria:**
- Successful data migration from legacy systems with 99% accuracy
- All core workflows operational and validated
- User acceptance and positive feedback
- Performance targets met (page load times, system uptime)
- Clear operational benefits demonstrated

---

## The Four-Step Implementation Process

### Step 1: Device Registry Migration

**Timeline:** Days 1-3 (3 business days)

**Source System:** Microsoft Dynamics NAV

**Objective:** Extract complete device master data and migrate to Supabase PostgreSQL database

**Activities:**

**Day 1: Access and Extraction**
- Obtain NAV system read-only access
- Identify device master tables and related data structures
- Export device data to CSV format
- Document field mappings (NAV columns → Supabase schema)
- Archive source data for validation

**Day 2: Transformation and Cleansing**
- Remove duplicate records
- Standardize formatting (SKU numbers, descriptions, categories)
- Validate data integrity (required fields, foreign keys)
- Apply business rules for categorization
- Handle exceptions and edge cases

**Day 3: Loading and Validation**
- Bulk import into Supabase Stock_Catalog table
- Verify record counts match source
- Test database queries and relationships
- Validate data integrity constraints
- Performance testing for query speed

**Client Requirements:**
- NAV system access (read-only credentials)
- IT contact available for system questions
- Business rules documentation for device categorization
- Approval for data extraction timing (off-peak hours if needed)

**Deliverables:**
- Complete device registry in Supabase (all records migrated)
- Data mapping documentation
- Validation report with record counts and integrity checks
- List of exceptions or data quality issues identified

---

### Step 2: Product Catalog Import

**Timeline:** Days 4-5 (2 business days)

**Source System:** SharePoint Lists

**Objective:** Import product catalog with pricing, categories, and supplier information

**Activities:**

**Day 4: SharePoint Data Extraction**
- Access SharePoint site and identify product lists
- Export product data (SKU, name, description, category, pricing)
- Extract supplier information
- Document product hierarchies and relationships
- Export to structured format (CSV/JSON)

**Day 5: Import and Configuration**
- Transform data to match Supabase schema
- Import into Stock_Catalog and related tables
- Link products to device registry
- Configure stock level thresholds (min, max, reorder points)
- Set up product categories and filters
- Validate pricing and supplier data

**Client Requirements:**
- SharePoint site URL and access permissions
- List of SharePoint lists containing product data
- Current categorization structure and taxonomy
- Pricing structure and approval rules
- Supplier contact information

**Deliverables:**
- Searchable product catalog in system
- Product-to-device linkage completed
- Stock level thresholds configured per product
- Category hierarchy established
- Validation report

---

### Step 3: Technician Roster Integration

**Timeline:** Day 6 (1 business day)

**Source System:** HR System, Excel, or SharePoint

**Objective:** Load complete technician registry into Point of Presence (PoP) module

**Activities:**

**Day 6: Roster Data Import**
- Collect technician roster data (name, ID, contact info, region)
- Extract service area assignments
- Gather GPS coordinates for common work locations (if available)
- Import into Point_of_Presence table
- Configure technician profiles:
  - Contact information (phone, email)
  - Region/territory assignments
  - Contractor IDs
  - Training status
  - Equipment assignments
- Set up availability schedules
- Define service boundaries and regions
- Test technician lookup and assignment logic

**Client Requirements:**
- Current technician list with complete contact information
- Employee IDs or contractor numbers
- Region/territory assignments
- Service area definitions
- Training completion records (if tracked)

**Deliverables:**
- Complete technician registry in PoP module
- Region-based assignment rules configured
- Technician profiles accessible in dispatch workflow
- GPS tracking enabled (if applicable)
- Validation report

---

### Step 4: Stock Count Blitz

**Timeline:** Days 7-15 (5-7 business days + analysis)

**Objective:** Establish accurate baseline inventory levels for all stock items

**Phase A: Preparation (Days 7-8)**

**Activities:**
- Schedule stock count during operational window
- Divide warehouse into count zones
- Assign zones to staff members
- Create count sheets and labels
- Configure count session in system
- Train warehouse staff on mobile counting interface (2-hour session)
- Brief supervisors on validation procedures

**Training Agenda (2 hours):**
- System login and navigation
- Mobile counting interface walkthrough
- Serial number scanning and entry
- Quantity adjustments
- Handling discrepancies
- Troubleshooting common issues
- Q&A and hands-on practice

**Phase B: Physical Count Execution (Days 9-11)**

**Activities:**
- Staff conduct physical count using tablets/smartphones
- Enter counts directly into system via mobile interface
- Real-time progress tracking via admin dashboard
- Supervisor performs spot-checks and validation
- Flag variances exceeding threshold for recount
- Document any inventory issues discovered
- Photograph damaged or questionable items

**Count Best Practices:**
- Count zone-by-zone to minimize disruption
- Two-person verification for high-value items
- Separate count teams for serialized vs bulk items
- Daily progress meetings to address issues
- Real-time adjustment of staffing based on progress

**Phase C: Reconciliation (Days 12-13)**

**Activities:**
- Compare physical counts against expected (from NAV)
- Generate comprehensive variance report
- Investigate significant discrepancies (>10% variance)
- Conduct recounts where needed
- Document root causes (theft, data entry errors, shrinkage, etc.)
- Adjust stock levels to match physical reality
- Classify inventory status:
  - In Stock (available for immediate dispatch)
  - Out of Stock (flagged for reorder/backorder)
  - Under Review (pending investigation)

**Phase D: Analysis and Reporting (Days 14-15)**

**Activities:**
- Calculate overall inventory accuracy percentage
- Identify fast-moving vs slow-moving items
- Generate stock valuation report
- Analyze variance trends by category/location
- Develop reorder point recommendations
- Create executive summary presentation
- Document lessons learned and improvements

**Client Requirements:**
- Warehouse access for training session (2 hours, one day)
- 2-3 warehouse staff for full week of counting
- Supervisor availability for validation (2-3 hours daily)
- Forklift or ladder access for high shelves
- Tablets or smartphones for counting (provided by client or 4D)
- Temporary hold on new orders during count (optional, recommended)

**Deliverables:**
- Accurate baseline inventory in system (all items counted)
- In Stock items ready for immediate ordering
- Out of Stock items flagged for backorder workflow
- Comprehensive variance report with root cause analysis
- Inventory accuracy percentage by category
- Reorder point recommendations by item
- Stock valuation report
- Executive summary presentation

---

## Pilot Timeline (Detailed Schedule)

### Week 1: Data Foundation

| Day | Activity | Deliverable | Client Involvement |
|-----|----------|-------------|-------------------|
| 1 | NAV data extraction | Device data exported | IT access provided |
| 2 | Data transformation | Clean device data | Business rules clarification |
| 3 | Supabase data load | Device registry complete | Validation review |
| 4 | SharePoint extraction | Product data exported | SharePoint access granted |
| 5 | Product catalog import | Catalog complete | Category structure review |

### Week 2: Preparation and Count

| Day | Activity | Deliverable | Client Involvement |
|-----|----------|-------------|-------------------|
| 6 | Technician roster import | PoP complete | Roster data provided |
| 7 | Training session | Staff trained | 3-4 staff attend (2 hrs) |
| 8 | Count preparation | Count zones assigned | Supervisor briefing |
| 9 | Physical count day 1 | Progress report | Counting team active |
| 10 | Physical count day 2 | Mid-count status | Counting team active |
| 11 | Physical count day 3 | Count completion | Supervisor spot-checks |
| 12 | Reconciliation | Variance report | Issue investigation |

### Week 3: Validation and Go-Live

| Day | Activity | Deliverable | Client Involvement |
|-----|----------|-------------|-------------------|
| 13 | Analysis and reporting | Executive summary | Management review |
| 14 | System training (all users) | Training complete | All pilot users (2 hrs) |
| 15 | Live operations begin | First live orders | 10-15 users active |
| 16-18 | Pilot testing | Daily feedback | User testing |
| 19-21 | Evaluation | Decision recommendation | Management decision |

---

## Pilot Success Metrics

### Data Migration Quality

**Target:** 99%+ accuracy

**Measurement:**
- Record count validation (source vs target)
- Random sampling of 100 records for field-level accuracy
- Query performance testing
- Relationship integrity verification

**Success Criteria:**
- All records migrated successfully
- Zero critical data quality issues
- Query response times <500ms
- Foreign key relationships intact

### Stock Count Accuracy

**Target:** 95%+ accuracy

**Measurement:**
- Physical count vs expected (NAV baseline)
- Variance percentage by category
- Number of recounts required
- Root cause analysis of variances

**Success Criteria:**
- Overall accuracy 95%+
- High-value items 99%+ accuracy
- Variances explainable with documented causes
- Baseline established for future counts

### System Performance

**Target:** Sub-2-second page loads, 99.5%+ uptime

**Measurement:**
- Lighthouse performance audits
- Real user monitoring during pilot
- API response time tracking
- Uptime monitoring logs

**Success Criteria:**
- Initial page load <2 seconds (95th percentile)
- Subsequent navigation <500ms
- API response <500ms (95th percentile)
- Zero downtime during pilot period

### User Adoption

**Target:** 80%+ daily active usage

**Measurement:**
- Daily active users tracking
- Feature usage analytics
- Login frequency
- Task completion rates

**Success Criteria:**
- 80%+ of pilot users log in daily
- Core workflows (order, pick, dispatch) used consistently
- Minimal support tickets for basic operations
- Users prefer new system over legacy

### User Satisfaction

**Target:** 4/5 average rating

**Measurement:**
- Post-pilot survey (1-5 scale)
- Qualitative feedback interviews
- Feature request tracking
- Pain point documentation

**Success Criteria:**
- Average satisfaction 4/5 or higher
- Majority prefer new system to PowerApps
- Positive feedback on mobile experience
- Actionable improvement suggestions documented

---

## Pilot Scope Definition

### Included Functionality

The following modules are fully operational during the pilot:

**Stock Order Management**
- Order creation with multi-step wizard
- Draft order saving
- Business line conditional logic
- Stock availability checking
- Order submission and confirmation

**Picking Queue and Cart**
- Pending order display
- Order assignment to pickers
- Serial number capture with validation
- Duplicate detection
- Progress tracking
- Picking completion workflow

**Dispatch Management**
- Dispatch queue with picked orders
- Method selection (Collection, Delivery, Courier)
- Waybill entry
- PDF manifest generation
- Dispatch completion and notifications

**Point of Presence**
- Technician lookup
- Contact information access
- Location and region data
- Assignment integration with dispatch

**Inventory Visibility**
- Stock level viewing
- Item search and filtering
- In Stock / Out of Stock status
- Basic reporting

**Asset Tracking**
- Device lookup by serial number
- Asset status viewing
- Basic asset information

**Xlink-Sage AI Assistant**
- Question answering
- Navigation guidance
- System help and training

### Limited During Pilot

The following features are available but may have reduced functionality:

**Stock Counting**
- Mobile counting via web browser (not dedicated native app)
- Basic count entry and variance tracking
- Full cycle count scheduling available post-pilot

**Advanced Reporting**
- Basic reports available
- PowerBI dashboard active but with limited historical data
- Full analytics expand after pilot period

**Bulk Operations**
- Bulk actions available but may need refinement based on pilot feedback

### Excluded from Pilot

The following are not part of the pilot evaluation:

**Business Central Integration**
- Not included in pilot
- Can be evaluated separately if needed post-pilot

**Native Mobile Apps**
- PWA (web app) used instead
- Native apps can be developed if needed

**Advanced Analytics**
- Beyond basic KPIs
- Full analytics suite available post-pilot

**Custom Hardware**
- Bluetooth scanners not required (camera-based scanning)
- Can be integrated if needed

---

## Risk Assessment and Mitigation

### Risk 1: Data Quality Issues from Legacy Systems

**Probability:** Medium
**Impact:** High

**Description:**
- NAV or SharePoint data contains duplicates, formatting inconsistencies, or missing values
- Poor data quality delays migration or causes operational issues

**Mitigation Strategy:**
- Conduct data quality audit in Week 1 Day 1
- Build comprehensive data cleansing into migration process
- Have 4D team available for real-time issue resolution
- Keep source systems intact during pilot (parallel run capability)
- Document all data quality issues for client remediation

**Contingency:**
- If critical data quality issues identified, extend Week 1 by 2-3 days
- Client IT team assists with source data cleanup
- Implement data validation rules to prevent future issues

---

### Risk 2: User Resistance to New System

**Probability:** Medium
**Impact:** Medium

**Description:**
- Users comfortable with PowerApps resist change
- Adoption slower than expected
- Training inadequate for user needs

**Mitigation Strategy:**
- Involve users early in pilot design and feedback
- Hands-on training with actual warehouse tasks (not just slides)
- Xlink-Sage AI assistant provides in-app guidance
- Quick wins demonstrated immediately (time savings, mobile access)
- Collect daily feedback and iterate rapidly
- Identify power users to champion adoption

**Contingency:**
- Additional training sessions scheduled as needed
- One-on-one coaching for struggling users
- Gather specific feedback to address pain points
- Consider extended pilot period if adoption is slow

---

### Risk 3: Stock Count Disrupts Operations

**Probability:** Low
**Impact:** Medium

**Description:**
- Stock count interferes with normal warehouse operations
- Count takes longer than expected
- Staff unavailable during peak times

**Mitigation Strategy:**
- Schedule count during slow operational period (coordinate with client)
- Use zone-based counting (operations continue in other zones)
- Allow full week for count completion (not rushed)
- Leverage existing staff familiar with inventory
- Supervisor monitors progress and adjusts staffing

**Contingency:**
- Extend count period by 2-3 days if needed
- Prioritize fast-moving items for initial count
- Complete slow-moving items in second pass
- Option to run partial operations during count

---

### Risk 4: Integration Challenges with NAV

**Probability:** Medium
**Impact:** Medium

**Description:**
- NAV data extraction more complex than anticipated
- Data structures undocumented
- IT access delayed or restricted

**Mitigation Strategy:**
- Start with read-only exports (low risk, no system impact)
- Manual CSV export as fallback option
- No live integration required for pilot (one-time export)
- IT engagement early (Day 1) to resolve access issues
- Document all NAV structures for future reference

**Contingency:**
- Use manual exports if API access unavailable
- Client IT assists with data extraction
- Defer live integration discussion to post-pilot

---

### Risk 5: Infrastructure Downtime or Performance Issues

**Probability:** Low
**Impact:** High

**Description:**
- Supabase or Netlify service outage during pilot
- Performance does not meet targets
- Network connectivity issues at warehouse

**Mitigation Strategy:**
- Supabase and Netlify have 99.9% uptime SLAs
- Multi-region redundancy built into infrastructure
- PWA offline mode for critical operations (counts, picks)
- 4D team monitors system performance during pilot hours
- Pre-pilot load testing to validate capacity

**Contingency:**
- If critical outage occurs, pilot day is extended by 1 day
- Offline capabilities minimize operational impact
- 4D team on call for immediate response
- Rollback to PowerApps as backup (runs in parallel)

---

## Post-Pilot Decision Framework

### Go Decision (Proceed to Full Production)

**Criteria:**
- Data migration successful with 99%+ accuracy
- All core workflows operational and validated
- User satisfaction rating 4/5 or higher
- Performance metrics met (load time <2s, uptime 99.5%+)
- Clear operational benefits demonstrated
- Management approval obtained

**Next Steps:**
- Finalize project agreement and payment schedule
- Plan full rollout to remaining warehouses/users
- Schedule additional training for new users
- Establish ongoing support and maintenance plan
- Define enhancement roadmap

---

### Go with Modifications (Conditional Proceed)

**Criteria:**
- Core system works but minor issues identified
- User requests for enhancements or workflow adjustments
- Data quality needs refinement
- Performance acceptable but could improve
- Training approach needs adjustment

**Next Steps:**
- Document all requested modifications
- Provide fixed-price quotes for enhancements
- Create prioritized backlog
- Agree on timeline for modifications
- Plan second validation phase after changes

---

### No-Go Decision (Do Not Proceed)

**Criteria:**
- Critical functionality failures that cannot be resolved
- Data integrity cannot be assured
- User adoption below 50%
- Performance unacceptable and not fixable within reasonable timeline
- Management determines legacy system is superior

**Next Steps:**
- Conduct root cause analysis of failure
- Document lessons learned
- Provide detailed report on issues
- Propose remediation plan if client wants to revisit
- Ensure clean separation (no obligations)

---

## Client Responsibilities

### IT Department

**Week 1:**
- Provide NAV system access (read-only credentials)
- Grant SharePoint site permissions
- Confirm data export procedures and timing
- Available for technical questions (estimated 2 hours total)
- Review and validate migrated data

**Week 2:**
- Provide technician roster data
- Assist with any data quality issues
- Support count preparation

**Week 3:**
- Monitor system performance
- Assist with user questions
- Participate in evaluation

---

### Warehouse Team

**Week 1:**
- Provide input on data accuracy
- Review product catalog for completeness

**Week 2:**
- Attend training session (2 hours, 3-4 staff)
- Participate in stock count (full week, 3-4 staff)
- Provide daily progress updates during count
- Report any issues immediately

**Week 3:**
- Participate in live pilot testing (10-15 users)
- Provide daily feedback on system usage
- Complete post-pilot survey
- Assist with evaluation

---

### Management Team

**Throughout Pilot:**
- Review weekly progress reports (30-minute calls)
- Make Go/No-Go decision at end of Week 3
- Communicate pilot purpose and objectives to staff
- Authorize data access and staff time allocation
- Remove organizational barriers

**Week 3:**
- Attend final evaluation presentation
- Provide decision within 3 business days of pilot completion

---

## 4D Analytics Deliverables

### Week 1: Foundation

- Data migration scripts and transformation logic
- Data validation reports (record counts, integrity checks)
- System access credentials and configuration
- Initial training documentation

### Week 2: Execution

- Stock count training session (2 hours, in-person or virtual)
- Real-time support during count (phone/email/chat)
- Daily progress reports
- Issue resolution and troubleshooting

### Week 3: Evaluation

- Comprehensive pilot evaluation report
- User feedback summary with quantitative and qualitative analysis
- Performance metrics and benchmarks
- Lessons learned and recommendations
- Go-forward implementation plan (if proceeding)
- Updated project plan with any modifications

---

## Communication Plan

### Weekly Status Meetings

**Frequency:** Every Friday at [agreed time]
**Duration:** 30 minutes
**Attendees:** Client project manager, warehouse supervisor, IT liaison, 4D project manager

**Agenda:**
- Progress update (completed, in-progress, upcoming)
- Issues and blockers
- User feedback highlights
- Metrics review
- Next week priorities

---

### Daily Stand-ups (During Count Week Only)

**Frequency:** Every morning at [agreed time] during Days 9-13
**Duration:** 15 minutes
**Attendees:** Warehouse supervisor, 4D support lead

**Agenda:**
- Yesterday's progress
- Today's plan
- Blockers or issues

---

### Ad-Hoc Communication

**Support Channels:**
- Email: [4D Support Email] (response within 4 hours)
- Phone: [4D Support Phone] (available 8 AM - 6 PM SAST)
- WhatsApp/Teams: [Group or direct contact] for urgent issues
- Ticketing System: [URL if applicable] for tracking

---

### Escalation Procedures

**Standard Issues:**
- Report via email or ticket
- Response within 4 hours (business hours)
- Resolution target: 24 hours

**Critical Issues (system down, data loss, security breach):**
- Immediate phone call to [4D Emergency Contact]
- Acknowledgment within 1 hour
- Resolution team mobilized immediately
- Client management notified within 2 hours

---

## Pilot Costs and Commitments

### Included at No Additional Cost

The pilot evaluation is provided as part of the overall project with no separate pilot fee. All activities and deliverables listed in this plan are included.

**Client Investment:**
- Staff time for training and participation
- IT resources for data access
- Warehouse access during count period
- Management time for reviews and decision

**4D Analytics Investment:**
- Data migration development and execution
- Training session delivery
- Pilot support (3 weeks, business hours)
- Evaluation and reporting
- Infrastructure costs during pilot

---

### Post-Pilot Commitments

If the client decides to proceed after successful pilot:

**System Ownership:**
- One-time payment for completed system development
- Transfer of source code and full IP rights
- Ongoing infrastructure costs (Supabase, Netlify, etc.)

**Optional Services:**
- Custom refinements (quoted separately as fixed-price projects)
- Annual maintenance contract (15% of project value, includes enhancements)
- Additional training for new users
- Feature development roadmap

**If No-Go Decision:**
- Zero financial obligation
- Clean separation with no strings attached
- All pilot data exportable to client

---

## Next Steps to Launch Pilot

### Step 1: Pilot Approval

- Client reviews and approves this pilot plan
- Identify specific pilot start date (Week 1, Day 1)
- Confirm pilot team members:
  - Client project manager
  - IT liaison
  - Warehouse supervisor
  - 3-4 warehouse staff for count
  - 10-15 end users for Week 3 testing

---

### Step 2: Pre-Pilot Kickoff Meeting (1 week before start)

**Agenda (1 hour):**
- Introduce all team members
- Review pilot objectives and timeline
- Confirm data access requirements
- Set up communication channels (email, WhatsApp, Teams)
- Share training materials in advance
- Schedule all meetings (weekly status, training sessions)
- Address questions and concerns
- Confirm Week 1 Day 1 activities

---

### Step 3: Week 1 Execution

**Day 1:**
- IT provides NAV access
- 4D team begins data extraction
- First status update sent

**Days 2-5:**
- Data migration continues
- Daily email updates on progress
- Client validates migrated data

---

### Step 4: Weekly Check-ins

- **Week 1:** Data migration progress (30 minutes, Friday)
- **Week 2:** Stock count progress (30 minutes, Friday)
- **Week 3:** Pilot evaluation and decision (60 minutes, Friday)

---

## Success Indicators

At the end of the 3-week pilot, the following indicators will demonstrate success:

1. **Data Integrity:** All legacy data successfully migrated and validated
2. **Operational Readiness:** Core workflows functional and tested
3. **User Confidence:** Staff trained and comfortable using the system
4. **Performance:** System meets or exceeds speed and reliability targets
5. **Business Value:** Clear operational improvements documented
6. **Stakeholder Buy-in:** Management approval to proceed

---

## Appendices

### Appendix A: Training Session Outline

**Session 1: Stock Counting (Day 7, 2 hours)**

- System overview and login (15 minutes)
- Mobile counting interface (30 minutes)
- Serial number scanning and entry (30 minutes)
- Handling variances and recounts (15 minutes)
- Troubleshooting and Q&A (30 minutes)

**Session 2: Full System Training (Day 14, 2 hours)**

- Stock order creation (30 minutes)
- Picking queue and cart (30 minutes)
- Dispatch management (30 minutes)
- Asset lookup and tracking (15 minutes)
- Xlink-Sage AI assistant (15 minutes)

---

### Appendix B: Data Migration Checklist

**NAV Data:**
- [ ] Device master table identified
- [ ] Access credentials obtained
- [ ] Data export completed
- [ ] CSV format validated
- [ ] Field mapping documented
- [ ] Data cleansing completed
- [ ] Supabase import successful
- [ ] Record count validated
- [ ] Query testing completed

**SharePoint Data:**
- [ ] Product catalog lists identified
- [ ] Access permissions granted
- [ ] Data export completed
- [ ] Product hierarchy documented
- [ ] Pricing data validated
- [ ] Category structure mapped
- [ ] Supabase import successful
- [ ] Product search tested

**Technician Roster:**
- [ ] Roster data collected
- [ ] Contact information validated
- [ ] Region assignments confirmed
- [ ] Import to PoP table completed
- [ ] Technician lookup tested

---

### Appendix C: Stock Count Zone Assignment Template

| Zone | Location | Item Count | Assigned Staff | Estimated Hours | Status |
|------|----------|-----------|----------------|-----------------|--------|
| A | Aisle 1-3 | 250 | [Name] | 4 | Pending |
| B | Aisle 4-6 | 300 | [Name] | 5 | Pending |
| C | Aisle 7-9 | 220 | [Name] | 4 | Pending |
| D | High-value secure | 100 | [Name] + Supervisor | 3 | Pending |
| E | Bulk storage | 180 | [Name] | 3 | Pending |

---

### Appendix D: Pilot Feedback Survey Template

**User Satisfaction Survey (1-5 scale, 1=Poor, 5=Excellent)**

1. Overall system usability: [ ]
2. Mobile interface experience: [ ]
3. System speed and performance: [ ]
4. Training adequacy: [ ]
5. Xlink-Sage AI assistant helpfulness: [ ]
6. Preference vs. PowerApps: [ ]

**Open-Ended Questions:**

1. What features did you find most useful?
2. What was most frustrating or difficult?
3. What improvements would you suggest?
4. Would you recommend adopting this system? Why or why not?

---

### Appendix E: Contact Information

**4D Analytics Team:**
- Project Manager: [Name] | [Phone] | [Email]
- Technical Lead: [Name] | [Phone] | [Email]
- Support Hotline: [Phone] (8 AM - 6 PM SAST)
- Emergency Contact: [Phone] (Critical issues only)

**Client Team:**
- Project Manager: [Name] | [Phone] | [Email]
- IT Liaison: [Name] | [Phone] | [Email]
- Warehouse Supervisor: [Name] | [Phone] | [Email]

---

**End of Pilot Implementation Plan**

**Prepared by:** 4D Analytics (Pty) Ltd | Enterprise Number: 2018/420599/07
