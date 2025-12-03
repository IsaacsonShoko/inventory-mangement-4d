# Xlink Inventory System - Pilot Implementation Plan

## Overview

**Objective:** Launch functional inventory system pilot in 3 weeks
**Scope:** Main warehouse operations with core user group
**Success Criteria:** Demonstrate 98.8% cost savings with full feature parity to PowerApps

---

## The 4-Step Pilot Process

### STEP 1: Device Registry Migration (3 days)
**From:** Microsoft Dynamics NAV
**To:** Supabase PostgreSQL

#### Activities:
- [ ] Access NAV system and identify device master table(s)
- [ ] Extract device data (SKU, description, category, cost, supplier info)
- [ ] Export to CSV/Excel format
- [ ] Data cleansing (remove duplicates, fix formatting issues)
- [ ] Map NAV fields to Supabase schema
- [ ] Bulk import via Supabase dashboard or API
- [ ] Validate record count and data integrity
- [ ] Test queries and relationships

#### Required from Client:
- NAV system access credentials (read-only sufficient)
- List of device tables/views to export
- Business rules for categorization
- Contact person for NAV questions

#### Deliverables:
- ✓ Complete device registry in Supabase
- ✓ Data mapping documentation
- ✓ Validation report showing record counts

#### Timeline: **Days 1-3**

---

### STEP 2: Product Catalog Import (2 days)
**From:** SharePoint Lists
**To:** Supabase Stock_Catalog Table

#### Activities:
- [ ] Identify SharePoint list(s) containing product catalog
- [ ] Export product data (SKU, name, description, category, unit price)
- [ ] Extract supplier information
- [ ] Map product categories to system taxonomy
- [ ] Import into Stock_Catalog table
- [ ] Link products to device registry where applicable
- [ ] Set up stock level fields (min, max, reorder point)
- [ ] Validate product hierarchy and relationships

#### Required from Client:
- SharePoint site URL and access permissions
- List names containing product data
- Current categorization structure
- Pricing information location

#### Deliverables:
- ✓ Searchable product catalog in system
- ✓ Product-to-device linkage complete
- ✓ Stock level thresholds configured

#### Timeline: **Days 4-5**

---

### STEP 3: Technician Roster Integration (1 day)
**From:** HR System / Excel / SharePoint
**To:** Point of Presence (POP) Module

#### Activities:
- [ ] Collect technician roster (name, ID, contact, region)
- [ ] Extract service area assignments
- [ ] Gather GPS coordinates for common work locations
- [ ] Import into Point_of_Presence table
- [ ] Configure technician availability schedules
- [ ] Set up region codes and service boundaries
- [ ] Link technicians to equipment assignments
- [ ] Test technician lookup and assignment

#### Required from Client:
- Current technician list (name, employee ID, phone, email)
- Region/territory assignments
- Contractor IDs where applicable
- Training status (if tracked)

#### Deliverables:
- ✓ Complete technician registry in POP module
- ✓ Region-based assignment rules configured
- ✓ Technician profiles accessible in dispatch workflow

#### Timeline: **Day 6**

---

### STEP 4: Stock Count Blitz (1 week)
**Objective:** Establish baseline inventory accuracy

#### Phase A: Preparation (Day 7-8)
- [ ] Train warehouse staff on mobile stock count interface
- [ ] Print count sheets by location/section
- [ ] Assign counting zones to staff members
- [ ] Set up count session in system
- [ ] Brief team on process and expectations

#### Phase B: Execution (Day 9-11)
- [ ] Conduct physical count using mobile devices/tablets
- [ ] Staff enters counts directly into system
- [ ] Real-time progress tracking via dashboard
- [ ] Supervisor spot-checks and validates
- [ ] Flag discrepancies for recount

#### Phase C: Reconciliation (Day 12-13)
- [ ] Compare physical counts vs. expected (from NAV)
- [ ] Generate variance report
- [ ] Investigate significant discrepancies
- [ ] Adjust stock levels to actuals
- [ ] Classify items as In Stock / Out of Stock
- [ ] Set up back-order queue for Out of Stock items

#### Phase D: Analysis (Day 14-15)
- [ ] Inventory accuracy assessment
- [ ] Identify fast-moving vs slow-moving items
- [ ] Stock valuation report
- [ ] Reorder point recommendations
- [ ] Executive summary presentation

#### Required from Client:
- Warehouse access for 4D team (optional, can train only)
- 2-3 warehouse staff for training (2 hours)
- Supervisor availability for validation
- Forklift access if needed for high shelves

#### Deliverables:
- ✓ Accurate baseline inventory in system
- ✓ In Stock items available for ordering
- ✓ Out of Stock items flagged for back-ordering
- ✓ Variance report with root cause analysis
- ✓ Reorder recommendations by item

#### Timeline: **Days 7-15 (Week 2 overlap with Week 3)**

---

## Pilot Timeline (3 Weeks)

```
Week 1: Data Migration Foundation
├── Day 1-3: NAV Device Registry ████████
├── Day 4-5: SharePoint Catalog ████████
└── Day 6-7: Technician Roster  ████████

Week 2: Stock Count Preparation
├── Day 8-9:  Training & Prep   ████████
├── Day 10-11: Physical Count   ████████
└── Day 12:   Reconciliation    ████████

Week 3: Validation & Launch
├── Day 13-14: Analysis         ████████
├── Day 15:   User Training     ████████
└── Day 16-18: Pilot Operations ████████

Week 4: Evaluation & Decision
└── Day 19-21: Review & Go/No-Go
```

---

## Pilot Success Metrics

### Operational Metrics
| Metric | Target | How We'll Measure |
|--------|--------|-------------------|
| Data Migration Accuracy | 99%+ | Record count validation, spot checks |
| Stock Count Accuracy | 95%+ | Physical vs system variance |
| System Uptime | 99.5%+ | Netlify monitoring logs |
| Page Load Time | <2 sec | Lighthouse performance tests |
| User Adoption | 80%+ | Daily active users tracking |

### Business Metrics
| Metric | Target | How We'll Measure |
|--------|--------|-------------------|
| Order Processing Time | -30% | Average time from order to dispatch |
| Picking Accuracy | 98%+ | Correct items picked vs ordered |
| Stock-Out Incidents | Baseline + alerts | Track frequency, alert effectiveness |
| User Satisfaction | 4/5+ | Post-pilot survey |

### Cost Validation
| Metric | Current | Pilot | Difference |
|--------|---------|-------|------------|
| Microsoft Licenses | R179,600/month | R0 | -R179,600 |
| Infrastructure | R0 | R2,156/month | +R2,156 |
| **Net Savings** | **-** | **R177,444/month** | **98.8% reduction** |

---

## Pilot Scope - What's Included

### ✅ Functional Modules
- [x] Stock Order Creation
- [x] Picking Queue & Cart (90% complete)
- [x] Dispatch Queue & Cart (90% complete)
- [x] Point of Presence (60% complete)
- [x] Order Management (70% complete)
- [x] Asset Tracking (basic)
- [x] Real-time Status Updates
- [x] PDF Manifest Generation
- [x] Email Notifications (via n8n)
- [x] Mobile-Responsive Interface
- [x] AI Training Assistant (Xlink-Sage)

### ⚠️ Limited During Pilot
- Stock Counting Interface (will use mobile browser, not dedicated app)
- Advanced Reporting (basic reports only)
- PowerBI Dashboard (data feeds active, full viz in Phase 2)
- Bulk Operations (available but may need refinement)

### ❌ Not Included in Pilot
- Business Central Integration (evaluate if needed post-pilot)
- Native Mobile Apps (PWA sufficient for pilot)
- Advanced Analytics (beyond basic KPIs)
- Custom Hardware Integration (unless requested)

---

## Risk Assessment & Mitigation

### Risk 1: Data Quality Issues from Legacy Systems
**Probability:** Medium | **Impact:** High

**Mitigation:**
- Conduct data quality audit in Week 1
- Build data cleansing step into migration process
- Have 4D team available for real-time fixes
- Keep source systems intact during pilot (parallel run)

---

### Risk 2: User Resistance to New System
**Probability:** Medium | **Impact:** Medium

**Mitigation:**
- Early user involvement in pilot design
- Hands-on training with actual warehouse tasks
- AI assistant provides in-app guidance
- Quick wins: show time savings immediately
- Collect feedback daily and iterate

---

### Risk 3: Stock Count Disrupts Operations
**Probability:** Low | **Impact:** Medium

**Mitigation:**
- Schedule count during slow period
- Zone-based counting (continue ops in other zones)
- Allow 1 week for count (not rushed)
- Use existing staff familiar with inventory

---

### Risk 4: Integration Challenges with NAV
**Probability:** Medium | **Impact:** Medium

**Mitigation:**
- Start with read-only exports (low risk)
- Manual CSV export as fallback
- No live integration required for pilot
- Evaluate integration needs after pilot success

---

### Risk 5: Infrastructure Downtime
**Probability:** Low | **Impact:** High

**Mitigation:**
- Supabase and Netlify have 99.9% SLA
- Multi-region redundancy built-in
- Offline mode for critical operations (PWA cache)
- 4D team monitoring during pilot hours

---

## Post-Pilot Decision Framework

### ✅ Go Decision Criteria
- Data migration successful (99%+ accuracy)
- Core workflows operational and tested
- User feedback positive (4/5 or higher)
- Performance metrics met (load time, uptime)
- Clear cost savings demonstrated

**Action:** Proceed with Phase 2 (remaining 60% development)

---

### ⚠️ Go with Changes
- Minor bugs identified but not critical
- User requests for enhancements
- Data quality needs refinement
- Training needs adjustment

**Action:** Address issues in Phase 2, adjust timeline if needed

---

### ❌ No-Go Criteria
- Critical functionality failures
- Data integrity cannot be assured
- User adoption <50%
- Performance unacceptable (<2 sec loads)
- Microsoft stack demonstrably superior

**Action:** Investigate root causes, propose remediation plan or pivot

---

## Client Responsibilities During Pilot

### IT Team
- Provide NAV system access (read-only)
- Grant SharePoint permissions
- Confirm data export procedures
- Available for technical questions (2 hours/week)

### Warehouse Team
- Participate in training sessions (2 hours)
- Conduct stock count with guidance (1 week)
- Provide daily feedback on system usage
- Report bugs or issues immediately

### Management
- Review pilot progress weekly (30 min calls)
- Make Go/No-Go decision at end of Week 3
- Communicate pilot purpose to staff
- Authorize data access and staff time

---

## 4D Analytics Deliverables During Pilot

### Week 1
- Data migration scripts and procedures
- Data validation reports
- Access credentials and training docs

### Week 2
- Stock count training session (2 hours)
- Real-time support during count (phone/email)
- Daily progress reports

### Week 3
- Comprehensive pilot evaluation report
- User feedback summary
- Cost savings analysis
- Go-forward recommendation
- Updated project plan for Phase 2

---

## Cost Summary - Pilot Phase

### Included in Base Project Cost
- All data migration work (15 hours)
- Stock count training (4 hours)
- Pilot support (20 hours)
- Infrastructure costs (covered by 4D during pilot)

**Client Investment for Pilot:** R0 additional
*(Pilot work is part of the R506,940 remaining investment)*

### Alternative: Standalone Pilot Option
If client wants to "try before committing" to full project:

**Standalone Pilot Cost:** R81,900
- Data migration (15 hours × R2,100 = R31,500)
- Stock count support (4 hours × R2,100 = R8,400)
- Pilot monitoring (20 hours × R2,100 = R42,000)
- Infrastructure (1 month free trial)

**Credit:** Full R81,900 credited toward project if proceeding to Phase 2

---

## Contact & Support During Pilot

**Primary Contact:** [Your Name]
**Phone:** [Your Phone] (Available 8 AM - 6 PM SAST)
**Email:** [Your Email] (Response within 4 hours)
**Emergency:** [Emergency Contact] (Critical issues only)

**Support Hours:**
- Business Hours: Monday-Friday, 8 AM - 5 PM
- Pilot Period: Extended to 7 PM during stock count week
- Weekends: By appointment for critical issues

---

## Next Steps to Launch Pilot

### Step 1: Approval & Scheduling
- [ ] Client reviews and approves pilot plan
- [ ] Select pilot start date (Week 1, Day 1)
- [ ] Identify client team members (IT, warehouse, management)

### Step 2: Pre-Pilot Preparation (Week before start)
- [ ] Schedule kickoff meeting with all stakeholders
- [ ] Arrange system access (NAV, SharePoint)
- [ ] Set up communication channels (Slack/Teams/WhatsApp)
- [ ] Share training materials in advance

### Step 3: Kickoff Meeting Agenda (1 hour)
- [ ] Introduce pilot objectives and timeline
- [ ] Review roles and responsibilities
- [ ] Walk through data requirements
- [ ] Demonstrate current system state
- [ ] Address questions and concerns
- [ ] Confirm Week 1 activities

### Step 4: Weekly Check-ins
- [ ] Week 1: Data migration progress (30 min)
- [ ] Week 2: Stock count progress (30 min)
- [ ] Week 3: Pilot evaluation (60 min)

---

**Ready to proceed? Let's schedule the kickoff meeting and get your pilot launched.**

**Contact:** [Your Name] | 4D Analytics (Pty) Ltd
**Email:** [Your Email] | **Phone:** [Your Phone]
